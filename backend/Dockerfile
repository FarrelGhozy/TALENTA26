FROM oven/bun:1.4.4-alpine AS runtime
WORKDIR /app

COPY package.json bun.lock prisma.config.ts ./
COPY backend/package.json ./backend/package.json
RUN bun install --frozen-lockfile

COPY backend/ ./backend/
RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3001/health/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "backend/src/index.ts"]
