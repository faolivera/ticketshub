#!/usr/bin/env bash
# Run the Render image locally, connected to docker-compose Postgres and LocalStack.
# Start compose first: docker compose up -d
# From repo root: ./release/render/run-local.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
IMAGE="${1:-ticketshub-render:latest}"
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
  -e S3_ENDPOINT="http://localstack:4566" \
  -e S3_SIGNED_URL_ENDPOINT="http://localhost:4567" \
  "$IMAGE"
