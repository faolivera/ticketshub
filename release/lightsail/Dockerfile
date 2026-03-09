# Multi-stage build for AWS Lightsail: frontend + backend + Caddy with TLS
# Build from repo root: docker build -f release/lightsail/Dockerfile -t ticketshub-lightsail:latest .
# Caddy serves on 80/443 with automatic HTTPS for ticketshub.shop, ticketshub.com.ar, ticketshub.ar

# -----------------------------------------------------------------------------
# Stage 1: Frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Backend (production deps only; dist is built on host)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY backend/ ./
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 3: Runtime (Caddy + Node)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache caddy

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
