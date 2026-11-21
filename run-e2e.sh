#!/usr/bin/env bash
set -e

# ==============================================================================
# TALENTA UNIDA Gontor — Automated End-to-End Test Runner
# Menjalankan rangkaian pengujian Playwright lintas alur (Publik, Mhs, Validator, Admin)
# ==============================================================================

# Pastikan berada di root direktori proyek
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo " [TALENTA E2E] Memulai pemeriksaan dan eksekusi pengujian Playwright..."
echo "======================================================================"

# 1. Pastikan Bun terpasang
if ! command -v bun &> /dev/null; then
  echo "[ERROR] Bun tidak ditemukan di PATH sistem. Silakan pasang Bun terlebih dahulu."
  exit 1
fi

# 2. Cek dependensi node_modules
if [ ! -d "node_modules/playwright" ]; then
  echo "[INFO] Menginstal dependensi playwright..."
  bun add -d playwright
fi

# 3. Jalankan master runner Bun
bun tests/e2e/runner.ts

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✔ [TALENTA E2E] Seluruh alur end-to-end terverifikasi sukses!"
else
  echo "✖ [TALENTA E2E] Pengujian end-to-end mendeteksi kesalahan. Periksa log & screenshot di tests/e2e/screenshots."
fi

exit $EXIT_CODE
