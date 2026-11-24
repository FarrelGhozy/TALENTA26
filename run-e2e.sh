#!/usr/bin/env bash
set -uo pipefail

# ==============================================================================
# UNIDA Student Championship (USC) — Automated End-to-End Test Runner
# Menjalankan rangkaian pengujian Playwright lintas alur (Publik, Mhs, Validator, Admin)
# ==============================================================================

# Pastikan berada di root direktori proyek
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo " [USC E2E] Memulai pemeriksaan dan eksekusi pengujian Playwright..."
echo "======================================================================"

# 1. Pastikan Bun terpasang
if ! command -v bun &> /dev/null; then
  echo "[ERROR] Bun tidak ditemukan di PATH sistem. Silakan pasang Bun terlebih dahulu."
  exit 1
fi

# 2. Cek dependensi node_modules tanpa memodifikasi lockfile
if [ ! -d "node_modules/playwright" ]; then
  echo "[ERROR] Dependensi playwright belum terpasang. Jalankan 'bun install --frozen-lockfile' terlebih dahulu."
  exit 1
fi

# 3. Jalankan master runner Bun dan tangkap kode keluarnya secara aman
bun tests/e2e/runner.ts
EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✔ [USC E2E] Seluruh alur end-to-end terverifikasi sukses!"
else
  echo "✖ [USC E2E] Pengujian end-to-end mendeteksi kesalahan (exit ${EXIT_CODE}). Periksa log & screenshot di tests/e2e/screenshots."
fi

exit "$EXIT_CODE"
