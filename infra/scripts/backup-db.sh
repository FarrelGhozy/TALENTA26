#!/usr/bin/env bash
# ==============================================================================
# TALENTA — Skrip Cadangan Basis Data MySQL & Uji Pemulihan (Disaster Recovery)
# Mengacu pada: docs/15-env-mock-strategy.md & docs/17-runbook-operasi.md
# ==============================================================================

set -euo pipefail

# Direktori skrip & root proyek
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Muat variabel dari .env jika ada
if [ -f "${PROJECT_ROOT}/.env" ]; then
  # Ekspor variabel tanpa mengeksekusi perintah arbitrer
  set -a
  # shellcheck source=/dev/null
  source <(grep -E '^(DB_|DATABASE_URL)' "${PROJECT_ROOT}/.env" | sed 's/\r$//')
  set +a
fi

# Fallback konfigurasi dari DATABASE_URL jika DB_* belum diatur
if [ -z "${DB_HOST:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  # Format: mysql://user:pass@host:port/dbname
  PROTO="$(echo "${DATABASE_URL}" | grep :// | sed -e's,^\(.*://\).*,\1,g')"
  URL_NO_PROTO="${DATABASE_URL/${PROTO}/}"
  USER_PASS="$(echo "${URL_NO_PROTO}" | grep @ | cut -d@ -f1)"
  DB_USER="$(echo "${USER_PASS}" | cut -d: -f1)"
  DB_PASSWORD="$(echo "${USER_PASS}" | cut -d: -f2)"
  HOST_PORT_DB="$(echo "${URL_NO_PROTO}" | sed -e "s,${USER_PASS}@,,g")"
  HOST_PORT="$(echo "${HOST_PORT_DB}" | cut -d/ -f1)"
  DB_HOST="$(echo "${HOST_PORT}" | cut -d: -f1)"
  DB_PORT="$(echo "${HOST_PORT}" | cut -d: -f2 -s)"
  DB_NAME="$(echo "${HOST_PORT_DB}" | cut -d/ -f2 | cut -d? -f1)"
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-talenta}"

OUTPUT_DIR="${PROJECT_ROOT}/backups"
TEST_RESTORE_DB=""

usage() {
  cat << EOF
Penggunaan: $(basename "$0") [PILIHAN]

Pilihan:
  -o, --output-dir DIR      Direktori penyimpanan file backup (default: ./backups)
  --test-restore DB_NAME    Uji pemulihan (restore) hasil backup ke basis data terisolasi
  -h, --help                Tampilkan bantuan ini

Contoh:
  $(basename "$0")
  $(basename "$0") --test-restore talenta_test
EOF
  exit 0
}

# Parsing argumen
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --test-restore)
      TEST_RESTORE_DB="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "[ERROR] Opsi tidak dikenal: $1" >&2
      usage
      ;;
  esac
done

# Periksa perkakas yang dibutuhkan
DUMP_BIN=""
if command -v mariadb-dump &> /dev/null; then
  DUMP_BIN="mariadb-dump"
elif command -v mysqldump &> /dev/null; then
  DUMP_BIN="mysqldump"
else
  echo "[ERROR] mariadb-dump atau mysqldump tidak ditemukan di sistem." >&2
  exit 1
fi

if ! command -v gzip &> /dev/null; then
  echo "[ERROR] gzip tidak ditemukan di sistem." >&2
  exit 1
fi

if ! command -v sha256sum &> /dev/null; then
  echo "[ERROR] sha256sum tidak ditemukan di sistem." >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILENAME="talenta_db_${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${OUTPUT_DIR}/${BACKUP_FILENAME}"
CHECKSUM_FILEPATH="${BACKUP_FILEPATH}.sha256"

echo "=== MEMULAI CADANGAN BASIS DATA TALENTA ==="
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Basis Data: ${DB_NAME}"
echo "Target File: ${BACKUP_FILEPATH}"

# Eksekusi dump dengan single transaction untuk konsistensi tanpa lock penuh
MYSQL_PWD="${DB_PASSWORD}" "${DUMP_BIN}" \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USER}" \
  --single-transaction \
  --quick \
  --skip-lock-tables \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip -c > "${BACKUP_FILEPATH}"

# Buat SHA256 Checksum
(cd "${OUTPUT_DIR}" && sha256sum "${BACKUP_FILENAME}" > "${BACKUP_FILENAME}.sha256")

echo "[SUKSES] Cadangan basis data berhasil dibuat:"
ls -lh "${BACKUP_FILEPATH}"
cat "${CHECKSUM_FILEPATH}"

# Verifikasi Uji Restore jika opsi --test-restore diberikan
if [ -n "${TEST_RESTORE_DB}" ]; then
  if [[ ! "${TEST_RESTORE_DB}" =~ ^[A-Za-z0-9_]{1,64}$ ]]; then
    echo "[ERROR] Nama database uji '${TEST_RESTORE_DB}' tidak valid. Hanya huruf, angka, dan underscore yang diizinkan." >&2
    exit 1
  fi
  if [ "${TEST_RESTORE_DB}" = "${DB_NAME}" ]; then
    echo "[ERROR] Database uji restore tidak boleh sama dengan database sumber '${DB_NAME}'." >&2
    exit 1
  fi

  echo ""
  echo "=== UJI RESTORE KE BASIS DATA TERISOLASI ==="
  echo "Target Database Uji: ${TEST_RESTORE_DB}"

  if ! command -v mysql &> /dev/null && ! command -v mariadb &> /dev/null; then
    echo "[ERROR] mysql client tidak ditemukan untuk uji restore." >&2
    exit 1
  fi
  MYSQL_CLIENT="$(command -v mariadb || command -v mysql)"

  # Verifikasi integritas checksum terlebih dahulu
  echo "1. Memverifikasi integritas checksum..."
  (cd "${OUTPUT_DIR}" && sha256sum -c "${BACKUP_FILENAME}.sha256")

  # Buat database uji bila belum ada
  echo "2. Mempersiapkan database uji: ${TEST_RESTORE_DB}..."
  MYSQL_PWD="${DB_PASSWORD}" "${MYSQL_CLIENT}" \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -e "CREATE DATABASE IF NOT EXISTS \`${TEST_RESTORE_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  # Jalankan pemulihan dari arsip gzip
  echo "3. Melakukan restore data dari arsip terkompresi..."
  gzip -dc "${BACKUP_FILEPATH}" | MYSQL_PWD="${DB_PASSWORD}" "${MYSQL_CLIENT}" \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    "${TEST_RESTORE_DB}"

  # Verifikasi jumlah tabel
  TABLE_COUNT="$(MYSQL_PWD="${DB_PASSWORD}" "${MYSQL_CLIENT}" \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -N -s -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${TEST_RESTORE_DB}';")"

  echo "[SUKSES] Pemulihan basis data uji berhasil!"
  echo "Jumlah tabel yang terpulihkan di '${TEST_RESTORE_DB}': ${TABLE_COUNT}"

  if [ "${TABLE_COUNT}" -eq 0 ]; then
    echo "[PERINGATAN] Tabel terpulihkan bernilai 0. Periksa kembali isi dump basis data." >&2
    exit 1
  fi
fi

echo ""
echo "=== PROSES CADANGAN & VERIFIKASI SELESAI ==="
