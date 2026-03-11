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

# Wait for backend to listen before starting Caddy (avoids 502 from Render health checks)
echo "Waiting for backend to be ready..."
BACKEND_URL="http://127.0.0.1:3000/health"
max_attempts=30
attempt=0
while [ "$attempt" -lt "$max_attempts" ]; do
  if node -e "
    const h = require('http');
    const r = h.get('$BACKEND_URL', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });
    r.on('error', () => process.exit(1));
    r.setTimeout(2000, () => { r.destroy(); process.exit(1); });
  " 2>/dev/null; then
    echo "Backend is ready."
    break
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "Backend did not become ready in time. Exiting."
    exit 1
  fi
  sleep 1
done

# Caddy as PID 1; it reads PORT from env (we set it back so Caddyfile :{$PORT:8080} works)
export PORT="$CADDY_PORT"
echo "Starting Caddy on port $PORT..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
