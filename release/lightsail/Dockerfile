# Multi-stage build for AWS Lightsail: frontend + backend + Caddy with TLS
# Build from repo root: docker build -f release/lightsail/Dockerfile -t ticketshub-lightsail:latest .
# Caddy serves on 80/443 with automatic HTTPS for ticketshub.shop, ticketshub.com.ar, ticketshub.ar

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

COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./
RUN pnpm exec prisma generate

COPY backend/ ./

# -----------------------------------------------------------------------------
# Stage 3: Runtime (Caddy + Node)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
COPY --from=caddy:2.8.4 /usr/bin/caddy /usr/bin/caddy

WORKDIR /app/backend

COPY --from=backend /app/backend/node_modules ./node_modules
COPY --from=backend /app/backend/dist ./dist
COPY --from=backend /app/backend/package.json ./
COPY --from=backend /app/backend/prisma ./prisma
COPY --from=backend /app/backend/prisma.config.ts ./
COPY --from=backend /app/backend/config ./config

COPY --from=frontend /app/frontend/dist /app/frontend/dist

COPY release/lightsail/Caddyfile /etc/caddy/Caddyfile
COPY release/lightsail/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
