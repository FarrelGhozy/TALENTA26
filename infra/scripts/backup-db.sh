#!/usr/bin/env bash
# ==============================================================================
# TALENTA — Skrip Cadangan Basis Data MySQL & Uji Pemulihan (Disaster Recovery)
# Mengacu pada: docs/15-env-mock-strategy.md & docs/17-runbook-operasi.md
# ==============================================================================

set -euo pipefail
umask 077

# Direktori skrip & root proyek
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OUTPUT_DIR="${PROJECT_ROOT}/backups"
TEST_RESTORE_DB=""
KEEP_TEST_DB="false"
ENV_FILE_ARG=""
KEEP_DAYS_ARG=""

usage() {
  local exit_code="${1:-0}"
  cat << EOF
Penggunaan: $(basename "$0") [PILIHAN]

Pilihan:
  -o, --output-dir DIR      Direktori penyimpanan file backup (default: ./backups)
  --env-file PATH           Path file .env eksplisit (default: infra/.env lalu .env)
  --test-restore DB_NAME    Uji pemulihan (restore) hasil backup ke basis data terisolasi
  --keep-test-db            Pertahankan basis data uji setelah --test-restore (default: dihapus)
  --keep-days HARI          Hapus arsip backup lebih tua dari N hari (default: BACKUP_RETENTION_DAYS atau 14; 0=nonaktif)
  -h, --help                Tampilkan bantuan ini

Contoh:
  $(basename "$0")
  $(basename "$0") --env-file infra/.env --keep-days 14
  $(basename "$0") --test-restore talenta_restore_check
EOF
  exit "${exit_code}"
}

# Parsing argumen terlebih dahulu agar --help tidak menyentuh env/DB
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output-dir)
      if [[ $# -lt 2 ]]; then
        echo "[ERROR] Opsi $1 membutuhkan nilai direktori." >&2
        usage 1
      fi
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --env-file)
      if [[ $# -lt 2 ]]; then
        echo "[ERROR] Opsi $1 membutuhkan path file .env." >&2
        usage 1
      fi
      ENV_FILE_ARG="$2"
      shift 2
      ;;
    --test-restore)
      if [[ $# -lt 2 ]]; then
        echo "[ERROR] Opsi $1 membutuhkan nama database uji." >&2
        usage 1
      fi
      TEST_RESTORE_DB="$2"
      shift 2
      ;;
    --keep-test-db)
      KEEP_TEST_DB="true"
      shift
      ;;
    --keep-days)
      if [[ $# -lt 2 ]]; then
        echo "[ERROR] Opsi $1 membutuhkan angka hari." >&2
        usage 1
      fi
      KEEP_DAYS_ARG="$2"
      shift 2
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      echo "[ERROR] Opsi tidak dikenal: $1" >&2
      usage 1
      ;;
  esac
done

# Parser .env aman tanpa `source` atau ekspansi shell arbitrer
load_env_file() {
  local env_path="$1"
  local line key val
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    # Abaikan baris kosong dan komentar
    [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
    # Pastikan format KEY=VALUE
    if [[ ! "${line}" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      continue
    fi
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    # Hanya muat whitelist variabel backup DB agar tidak mengotori lingkungan skrip
    case "${key}" in
      DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME|DATABASE_URL|BACKUP_RETENTION_DAYS)
        # Jangan timpa variabel yang sudah diset eksplisit oleh pemanggil
        if [[ -z "${!key+x}" ]]; then
          # Hilangkan kutip luar tunggal atau ganda yang berpasangan
          if [[ "${val}" =~ ^\"(.*)\"$ ]]; then
            val="${BASH_REMATCH[1]}"
          elif [[ "${val}" =~ ^\'(.*)\'$ ]]; then
            val="${BASH_REMATCH[1]}"
          fi
          printf -v "${key}" '%s' "${val}"
        fi
        ;;
    esac
  done < "${env_path}"
}

# Muat variabel dari --env-file, infra/.env (produksi), atau .env root
ENV_CANDIDATE=""
if [[ -n "${ENV_FILE_ARG}" ]]; then
  if [[ ! -f "${ENV_FILE_ARG}" ]]; then
    echo "[ERROR] File env tidak ditemukan: ${ENV_FILE_ARG}" >&2
    exit 1
  fi
  ENV_CANDIDATE="${ENV_FILE_ARG}"
elif [[ -f "${PROJECT_ROOT}/infra/.env" ]]; then
  ENV_CANDIDATE="${PROJECT_ROOT}/infra/.env"
elif [[ -f "${PROJECT_ROOT}/.env" ]]; then
  ENV_CANDIDATE="${PROJECT_ROOT}/.env"
fi

if [[ -n "${ENV_CANDIDATE}" ]]; then
  load_env_file "${ENV_CANDIDATE}"
fi

# Fallback konfigurasi dari DATABASE_URL jika DB_HOST belum diatur
if [[ -z "${DB_HOST:-}" && -n "${DATABASE_URL:-}" ]]; then
  # Format: mysql://user[:pass]@host[:port]/dbname[?query]
  URL_NO_PROTO="${DATABASE_URL#*://}"
  if [[ "${URL_NO_PROTO}" == *@* ]]; then
    USER_PASS="${URL_NO_PROTO%%@*}"
    HOST_PORT_DB="${URL_NO_PROTO#*@}"
    if [[ "${USER_PASS}" == *:* ]]; then
      DB_USER="${USER_PASS%%:*}"
      DB_PASSWORD="${USER_PASS#*:}"
    else
      DB_USER="${USER_PASS}"
      DB_PASSWORD=""
    fi
  else
    HOST_PORT_DB="${URL_NO_PROTO}"
  fi
  HOST_PORT="${HOST_PORT_DB%%/*}"
  DB_PATH="${HOST_PORT_DB#*/}"
  if [[ "${HOST_PORT}" == *:* ]]; then
    DB_HOST="${HOST_PORT%%:*}"
    DB_PORT="${HOST_PORT#*:}"
  else
    DB_HOST="${HOST_PORT}"
  fi
  DB_NAME="${DB_PATH%%\?*}"
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-talenta}"
KEEP_DAYS="${KEEP_DAYS_ARG:-${BACKUP_RETENTION_DAYS:-14}}"

if [[ ! "${KEEP_DAYS}" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] Nilai --keep-days harus bilangan bulat non-negatif: ${KEEP_DAYS}" >&2
  exit 1
fi

# Fallback otomatis saat berjalan langsung di host Linux dengan infra/.env berisi host.docker.internal
if [[ "${DB_HOST}" == "host.docker.internal" && ! -f "/.dockerenv" ]]; then
  if ! getent hosts host.docker.internal >/dev/null 2>&1; then
    echo "[INFO] host.docker.internal tidak teresolusi di host Linux; beralih ke 127.0.0.1."
    DB_HOST="127.0.0.1"
  fi
fi

# Beri pesan jelas bila DB_HOST memakai nama container Docker (mis. homelab-net) dan skrip dijalankan dari host
if [[ "${DB_HOST}" != "127.0.0.1" && "${DB_HOST}" != "localhost" && ! -f "/.dockerenv" ]]; then
  if ! getent hosts "${DB_HOST}" >/dev/null 2>&1; then
    echo "[ERROR] Host DB '${DB_HOST}' tidak teresolusi dari host Linux. Jika MySQL berada di container (homelab-net), jalankan dari host dengan override DB_HOST=127.0.0.1 (mis. DB_HOST=127.0.0.1 $(basename "$0") --env-file infra/.env)." >&2
    exit 1
  fi
fi

# Periksa perkakas yang dibutuhkan
DUMP_BIN=""
if command -v mariadb-dump >/dev/null 2>&1; then
  DUMP_BIN="mariadb-dump"
elif command -v mysqldump >/dev/null 2>&1; then
  DUMP_BIN="mysqldump"
else
  echo "[ERROR] mariadb-dump atau mysqldump tidak ditemukan di sistem." >&2
  exit 1
fi

for req_bin in gzip sha256sum mktemp find; do
  if ! command -v "${req_bin}" >/dev/null 2>&1; then
    echo "[ERROR] ${req_bin} tidak ditemukan di sistem." >&2
    exit 1
  fi
done

# Siapkan file opsi sementara (0600) agar kredensial tidak bocor lewat argv atau env MYSQL_PWD
TMP_MYSQL_CNF="$(mktemp)"
BACKUP_TMP=""
CHECKSUM_TMP=""

cleanup() {
  rm -f "${TMP_MYSQL_CNF}" "${BACKUP_TMP}" "${CHECKSUM_TMP}" 2>/dev/null || true
}
trap cleanup EXIT

escape_my_cnf() {
  local raw="$1"
  raw="${raw//\\/\\\\}"
  raw="${raw//\"/\\\"}"
  printf '%s' "${raw}"
}

{
  printf '[client]\n'
  printf 'host="%s"\n' "$(escape_my_cnf "${DB_HOST}")"
  printf 'port=%s\n' "${DB_PORT}"
  printf 'user="%s"\n' "$(escape_my_cnf "${DB_USER}")"
  if [[ -n "${DB_PASSWORD}" ]]; then
    printf 'password="%s"\n' "$(escape_my_cnf "${DB_PASSWORD}")"
  fi
} > "${TMP_MYSQL_CNF}"
chmod 600 "${TMP_MYSQL_CNF}"

mkdir -p "${OUTPUT_DIR}"
chmod 700 "${OUTPUT_DIR}" 2>/dev/null || true

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILENAME="talenta_db_${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${OUTPUT_DIR}/${BACKUP_FILENAME}"
CHECKSUM_FILEPATH="${BACKUP_FILEPATH}.sha256"
BACKUP_TMP="${BACKUP_FILEPATH}.tmp.$$"
CHECKSUM_TMP="${CHECKSUM_FILEPATH}.tmp.$$"

echo "=== MEMULAI CADANGAN BASIS DATA TALENTA ==="
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Basis Data: ${DB_NAME}"
echo "Target File: ${BACKUP_FILEPATH}"

DUMP_ARGS=(
  "--defaults-extra-file=${TMP_MYSQL_CNF}"
  "--single-transaction"
  "--quick"
  "--skip-lock-tables"
  "--routines"
  "--triggers"
  "--hex-blob"
  "--default-character-set=utf8mb4"
)

if "${DUMP_BIN}" --help 2>&1 | grep -q -- '--set-gtid-purged'; then
  DUMP_ARGS+=("--set-gtid-purged=OFF")
fi

# Eksekusi dump secara atomik ke file .tmp lalu uji integritas gzip sebelum dipromosikan
"${DUMP_BIN}" "${DUMP_ARGS[@]}" "${DB_NAME}" | gzip -c > "${BACKUP_TMP}"
gzip -t "${BACKUP_TMP}"
chmod 600 "${BACKUP_TMP}"
mv "${BACKUP_TMP}" "${BACKUP_FILEPATH}"
BACKUP_TMP=""

# Buat SHA256 Checksum secara atomik
(cd "${OUTPUT_DIR}" && sha256sum "${BACKUP_FILENAME}") > "${CHECKSUM_TMP}"
chmod 600 "${CHECKSUM_TMP}"
mv "${CHECKSUM_TMP}" "${CHECKSUM_FILEPATH}"
CHECKSUM_TMP=""

echo "[SUKSES] Cadangan basis data berhasil dibuat dan lolos uji gzip:"
ls -lh "${BACKUP_FILEPATH}"
cat "${CHECKSUM_FILEPATH}"

# Verifikasi Uji Restore jika opsi --test-restore diberikan
if [[ -n "${TEST_RESTORE_DB}" ]]; then
  if [[ ! "${TEST_RESTORE_DB}" =~ ^[A-Za-z0-9_]{1,64}$ ]]; then
    echo "[ERROR] Nama database uji '${TEST_RESTORE_DB}' tidak valid. Hanya huruf, angka, dan underscore yang diizinkan." >&2
    exit 1
  fi
  case "${TEST_RESTORE_DB}" in
    "${DB_NAME}"|mysql|information_schema|performance_schema|sys)
      echo "[ERROR] Database uji restore tidak boleh menimpa database sumber atau sistem '${TEST_RESTORE_DB}'." >&2
      exit 1
      ;;
  esac

  echo ""
  echo "=== UJI RESTORE KE BASIS DATA TERISOLASI ==="
  echo "Target Database Uji: ${TEST_RESTORE_DB}"

  if ! command -v mysql >/dev/null 2>&1 && ! command -v mariadb >/dev/null 2>&1; then
    echo "[ERROR] mysql/mariadb client tidak ditemukan untuk uji restore." >&2
    exit 1
  fi
  MYSQL_CLIENT="$(command -v mariadb || command -v mysql)"

  echo "1. Memverifikasi integritas checksum..."
  (cd "${OUTPUT_DIR}" && sha256sum -c "${BACKUP_FILENAME}.sha256")

  echo "2. Menyiapkan ulang database uji bersih: ${TEST_RESTORE_DB}..."
  "${MYSQL_CLIENT}" "--defaults-extra-file=${TMP_MYSQL_CNF}" \
    -e "DROP DATABASE IF EXISTS \`${TEST_RESTORE_DB}\`; CREATE DATABASE \`${TEST_RESTORE_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  echo "3. Melakukan restore data dari arsip terkompresi..."
  gzip -dc "${BACKUP_FILEPATH}" | "${MYSQL_CLIENT}" "--defaults-extra-file=${TMP_MYSQL_CNF}" "${TEST_RESTORE_DB}"

  TABLE_COUNT="$("${MYSQL_CLIENT}" "--defaults-extra-file=${TMP_MYSQL_CNF}" \
    -N -s -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${TEST_RESTORE_DB}';")"

  echo "[SUKSES] Pemulihan basis data uji berhasil!"
  echo "Jumlah tabel yang terpulihkan di '${TEST_RESTORE_DB}': ${TABLE_COUNT}"

  if [[ "${KEEP_TEST_DB}" != "true" ]]; then
    "${MYSQL_CLIENT}" "--defaults-extra-file=${TMP_MYSQL_CNF}" \
      -e "DROP DATABASE IF EXISTS \`${TEST_RESTORE_DB}\`;"
    echo "[INFO] Database uji '${TEST_RESTORE_DB}' dibersihkan kembali agar tidak memenuhi disk MySQL."
  fi

  if [[ "${TABLE_COUNT}" -eq 0 ]]; then
    echo "[PERINGATAN] Tabel terpulihkan bernilai 0. Periksa kembali isi dump basis data." >&2
    exit 1
  fi
fi

# Pembersihan otomatis arsip backup lama sesuai retensi agar disk home server tidak penuh
if [[ "${KEEP_DAYS}" -gt 0 ]]; then
  PRUNED_COUNT="$(find "${OUTPUT_DIR}" -maxdepth 1 -type f \( -name 'talenta_db_*.sql.gz' -o -name 'talenta_db_*.sql.gz.sha256' \) -mtime +"${KEEP_DAYS}" -print -delete | wc -l | tr -d ' ')"
  if [[ "${PRUNED_COUNT}" -gt 0 ]]; then
    echo "[RETENSI] Menghapus ${PRUNED_COUNT} berkas backup DB lama (> ${KEEP_DAYS} hari)."
  fi
fi

echo ""
echo "=== PROSES CADANGAN & VERIFIKASI SELESAI ==="
