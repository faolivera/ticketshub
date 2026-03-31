# Multi-stage build for Render: frontend (Vite) + backend (NestJS) + Caddy
# Build from repo root: docker build -f release/render/Dockerfile -t ticketshub-render:latest .

# -----------------------------------------------------------------------------
# Stage 1: Frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# -----------------------------------------------------------------------------
# Stage 2: Backend (production deps only; dist is built on host)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend
WORKDIR /app/backend
RUN corepack enable
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY backend/ ./
RUN pnpm exec prisma generate
# Backend dist is included via COPY backend/ (build.sh runs `npm run build` in backend first to avoid OOM in Docker)

# -----------------------------------------------------------------------------
# Stage 3: Runtime (Caddy + Node)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache libcap
COPY --from=caddy:2.8.4 /usr/bin/caddy /usr/bin/caddy
RUN setcap -r /usr/bin/caddy 2>/dev/null || true

WORKDIR /app/backend

# Copy backend runtime artifacts (prisma.config.ts required for Prisma 7 migrate deploy)
COPY --from=backend /app/backend/node_modules ./node_modules
COPY --from=backend /app/backend/dist ./dist
COPY --from=backend /app/backend/package.json ./
COPY --from=backend /app/backend/prisma ./prisma
COPY --from=backend /app/backend/prisma.config.ts ./
COPY --from=backend /app/backend/config ./config

# Copy frontend static assets
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Copy Caddy and entrypoint
COPY release/render/Caddyfile /etc/caddy/Caddyfile
COPY release/render/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
