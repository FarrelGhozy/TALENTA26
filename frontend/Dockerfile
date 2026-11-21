FROM oven/bun:1.4.4-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
RUN bun install --frozen-lockfile

COPY frontend/ ./frontend/
RUN bun run build

FROM nginx:1.27-alpine AS runtime
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health >/dev/null 2>&1 || exit 1
