#!/bin/sh
set -eu

RUNTIME_JS="/usr/share/nginx/html/runtime-config.js"
INDEX_HTML="/usr/share/nginx/html/index.html"
INDEX_TEMPLATE="/etc/nginx/usc-templates/index.html.base"
ROBOTS_TXT="/usr/share/nginx/html/robots.txt"
SITEMAP_STATIC="/usr/share/nginx/html/sitemap-static.xml"
SEC_HEADERS="/etc/nginx/snippets/security-headers.conf"
DEFAULT_PUBLIC_ORIGIN="https://talenta.utc.web.id"

# Normalisasi tanpa spasi & tanpa garis miring di akhir
RAW_PUBLIC_ORIGIN="$(printf '%s' "${PUBLIC_ORIGIN:-}" | tr -d '[:space:]' | sed 's:/*$::')"
RAW_API_ORIGIN="$(printf '%s' "${API_PUBLIC_ORIGIN:-}" | tr -d '[:space:]' | sed 's:/*$::')"

if [ -n "$RAW_PUBLIC_ORIGIN" ]; then
  if ! printf '%s' "$RAW_PUBLIC_ORIGIN" | grep -Eq '^https?://[A-Za-z0-9._-]+(:[0-9]{1,5})?$'; then
    echo "[USC_RUNTIME_ERROR] PUBLIC_ORIGIN tidak valid: $RAW_PUBLIC_ORIGIN (contoh valid: https://talenta.utc.web.id)" >&2
    exit 1
  fi
  EFFECTIVE_PUBLIC_ORIGIN="$RAW_PUBLIC_ORIGIN"
else
  EFFECTIVE_PUBLIC_ORIGIN="$DEFAULT_PUBLIC_ORIGIN"
fi

if [ -n "$RAW_API_ORIGIN" ]; then
  if ! printf '%s' "$RAW_API_ORIGIN" | grep -Eq '^https?://[A-Za-z0-9._-]+(:[0-9]{1,5})?$'; then
    echo "[USC_RUNTIME_ERROR] API_PUBLIC_ORIGIN tidak valid: $RAW_API_ORIGIN (contoh valid: https://api-talenta.utc.web.id)" >&2
    exit 1
  fi
  printf 'window.__USC_RUNTIME_CONFIG__ = { publicOrigin: "%s", apiOrigin: "%s" };\n' \
    "$EFFECTIVE_PUBLIC_ORIGIN" "$RAW_API_ORIGIN" > "$RUNTIME_JS"
  if [ -f "$SEC_HEADERS" ]; then
    sed -i -E \
      -e "s|img-src 'self' data: blob:[^;]*;|img-src 'self' data: blob: ${RAW_API_ORIGIN};|g" \
      -e "s|connect-src 'self'[^;]*;|connect-src 'self' ${RAW_API_ORIGIN};|g" \
      "$SEC_HEADERS"
  fi
else
  printf 'window.__USC_RUNTIME_CONFIG__ = { publicOrigin: "%s" };\n' \
    "$EFFECTIVE_PUBLIC_ORIGIN" > "$RUNTIME_JS"
  if [ -f "$SEC_HEADERS" ]; then
    sed -i -E \
      -e "s|img-src 'self' data: blob:[^;]*;|img-src 'self' data: blob:;|g" \
      -e "s|connect-src 'self'[^;]*;|connect-src 'self';|g" \
      "$SEC_HEADERS"
  fi
fi

# Injeksi domain FE (`PUBLIC_ORIGIN`) ke index.html secara idempoten untuk SEO/Open Graph
TEMPLATE_SOURCE="$INDEX_TEMPLATE"
if [ ! -f "$TEMPLATE_SOURCE" ] && [ -f "$INDEX_HTML" ]; then
  TEMPLATE_SOURCE="$INDEX_HTML"
fi

if [ -f "$TEMPLATE_SOURCE" ]; then
  INDEX_TMP="${INDEX_HTML}.tmp.$$"
  sed "s|${DEFAULT_PUBLIC_ORIGIN}|${EFFECTIVE_PUBLIC_ORIGIN}|g" "$TEMPLATE_SOURCE" > "$INDEX_TMP"
  case "$EFFECTIVE_PUBLIC_ORIGIN" in
    https://*) ;;
    *)
      sed -i '/property="og:image:secure_url"/d' "$INDEX_TMP"
      ;;
  esac
  mv "$INDEX_TMP" "$INDEX_HTML"
fi

# Render robots.txt & sitemap fallback statis sesuai PUBLIC_ORIGIN
cat > "$ROBOTS_TXT" <<EOF
User-agent: *
Allow: /
Allow: /kompetisi
Allow: /ranking
Disallow: /app/
Disallow: /admin/
Disallow: /api/
Disallow: /masuk
Disallow: /daftar
Disallow: /lupa-password
Disallow: /reset-password
Disallow: /403
Disallow: /404

Sitemap: ${EFFECTIVE_PUBLIC_ORIGIN}/sitemap.xml
EOF

cat > "$SITEMAP_STATIC" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${EFFECTIVE_PUBLIC_ORIGIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${EFFECTIVE_PUBLIC_ORIGIN}/kompetisi</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${EFFECTIVE_PUBLIC_ORIGIN}/ranking</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
EOF
