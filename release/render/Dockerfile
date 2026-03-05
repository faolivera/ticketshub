# Multi-stage build for Render: frontend (Vite) + backend (NestJS) + Caddy
# Build from repo root: docker build -f release/render/Dockerfile -t ticketshub:latest .

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
# Stage 2: Backend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY backend/ ./
RUN npx prisma generate
# Backend dist is included via COPY backend/ (build.sh runs `npm run build` in backend first to avoid OOM in Docker)

# -----------------------------------------------------------------------------
# Stage 3: Runtime (Caddy + Node)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache caddy

WORKDIR /app/backend

# Copy backend runtime artifacts
COPY --from=backend /app/backend/node_modules ./node_modules
COPY --from=backend /app/backend/dist ./dist
COPY --from=backend /app/backend/package.json ./
COPY --from=backend /app/backend/prisma ./prisma
COPY --from=backend /app/backend/config ./config

# Copy frontend static assets
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Copy Caddy and entrypoint
COPY release/render/Caddyfile /etc/caddy/Caddyfile
COPY release/render/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
