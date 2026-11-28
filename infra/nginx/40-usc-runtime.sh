#!/bin/sh
set -eu

RUNTIME_JS="/usr/share/nginx/html/runtime-config.js"
SEC_HEADERS="/etc/nginx/snippets/security-headers.conf"

# Normalisasi origin tanpa spasi & tanpa garis miring di akhir
RAW_ORIGIN="$(printf '%s' "${API_PUBLIC_ORIGIN:-}" | tr -d '[:space:]' | sed 's:/*$::')"

if [ -z "$RAW_ORIGIN" ]; then
  printf 'window.__USC_RUNTIME_CONFIG__ = {};\n' > "$RUNTIME_JS"
  if [ -f "$SEC_HEADERS" ]; then
    sed -i -E \
      -e "s|img-src 'self' data: blob:[^;]*;|img-src 'self' data: blob:;|g" \
      -e "s|connect-src 'self'[^;]*;|connect-src 'self';|g" \
      "$SEC_HEADERS"
  fi
  exit 0
fi

# Validasi ketat skema HTTP/HTTPS + host (+ port opsional) tanpa path/quote untuk cegah injeksi JS/CSP
if ! printf '%s' "$RAW_ORIGIN" | grep -Eq '^https?://[A-Za-z0-9._-]+(:[0-9]{1,5})?$'; then
  echo "[USC_RUNTIME_ERROR] API_PUBLIC_ORIGIN tidak valid: $RAW_ORIGIN (contoh valid: https://api.domain.com)" >&2
  exit 1
fi

printf 'window.__USC_RUNTIME_CONFIG__ = { apiOrigin: "%s" };\n' "$RAW_ORIGIN" > "$RUNTIME_JS"

if [ -f "$SEC_HEADERS" ]; then
  sed -i -E \
    -e "s|img-src 'self' data: blob:[^;]*;|img-src 'self' data: blob: ${RAW_ORIGIN};|g" \
    -e "s|connect-src 'self'[^;]*;|connect-src 'self' ${RAW_ORIGIN};|g" \
    "$SEC_HEADERS"
fi
