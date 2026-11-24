FROM oven/bun:1.4.4-alpine AS builder
WORKDIR /app

# Pasang hanya dependensi workspace backend (tanpa React/Vite/Playwright)
COPY package.json bun.lock prisma.config.ts ./
COPY backend/package.json ./backend/package.json
RUN bun install --frozen-lockfile --filter talenta-backend

COPY backend/prisma/schema.prisma ./backend/prisma/schema.prisma
RUN bunx prisma generate

FROM oven/bun:1.4.4-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lock /app/prisma.config.ts ./
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY backend/src ./backend/src
COPY backend/prisma/schema.prisma ./backend/prisma/schema.prisma
COPY backend/prisma/migrations ./backend/prisma/migrations
COPY backend/prisma/seed.ts ./backend/prisma/seed.ts

RUN chown -R bun:bun /app
USER bun

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3001/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "backend/src/index.ts"]
