#!/usr/bin/env bash
# Run the Render image locally, connected to docker-compose Postgres and LocalStack.
# Start compose first: docker compose up -d
# From repo root: ./release/render/run-local.sh
#
# Optional: create a .env file at the repo root (not committed) with secrets.
# See .env.example for variable names (AWS, Twilio, JWT, etc.).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Load secrets from repo root .env if present (not committed)
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$REPO_ROOT/.env"
  set +a
fi

IMAGE="${1:-ticketshub:latest}"
# Use same network as docker-compose (default name: ticketshub_default)
NETWORK="ticketshub_default"
docker run --rm -it \
  --network "$NETWORK" \
  -p 8080:8080 \
  -e ENVIRONMENT=prod \
  -e DATABASE_URL="postgresql://ticketshub:ticketshub@postgres:5432/ticketshub" \
  -e JWT_SECRET="${JWT_SECRET:-local-dev-secret}" \
  -e AWS_REGION="${AWS_REGION:-us-east-1}" \
  -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}" \
  -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}" \
  -e S3_PRIVATE_BUCKET="${S3_PRIVATE_BUCKET:-ticketshub-private-dev}" \
  -e S3_PUBLIC_BUCKET="${S3_PUBLIC_BUCKET:-ticketshub-public-dev}" \
  -e S3_ENDPOINT="http://localhost:4567" \
  -e S3_SIGNED_URL_ENDPOINT="http://localhost:4567" \
  -e TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}" \
  -e TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}" \
  -e TWILIO_VERIFY_SERVICE_SID="${TWILIO_VERIFY_SERVICE_SID:-}" \
  -e APP_PUBLIC_URL="http://localhost:8080" \
  -e SES_FROM_EMAIL="${SES_FROM_EMAIL:-}" \
  "$IMAGE"
