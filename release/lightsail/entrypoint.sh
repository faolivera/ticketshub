#!/bin/sh
set -e

# Backend listens on 3000. Caddy listens on 80/443 (set by Caddyfile domains).
export PORT=3000

cd /app/backend

echo "Running migrations..."
npx prisma migrate deploy

echo "Seeding terms (idempotent)..."
node dist/src/scripts/seed-terms.js || true

echo "Starting backend on port 3000..."
node dist/src/main.js &

echo "Starting Caddy on 80/443 (TLS)..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
