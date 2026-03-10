#!/bin/sh
set -e

# Render sets PORT; Caddy must listen on it. Backend listens on 3000 inside the container.
CADDY_PORT="${PORT:-8080}"
export PORT=3000

cd /app/backend

echo "Running migrations..."
npx prisma migrate deploy

echo "Seeding terms (idempotent)..."
node dist/src/scripts/seed-terms.js || true

# Backend needs to read index.html from frontend dist for SEO placeholder replacement
export APP_CLIENT_BUILD_PATH=/app/frontend/dist

echo "Starting backend on port 3000..."
node dist/src/main.js &

# Caddy as PID 1; it reads PORT from env (we set it back so Caddyfile :{$PORT:8080} works)
export PORT="$CADDY_PORT"
echo "Starting Caddy on port $PORT..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
