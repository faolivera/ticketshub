#!/usr/bin/env bash
# Run on the AWS Lightsail instance to pull the latest image and restart the app container.
# TLS/SSL for ticketshub.shop, ticketshub.com.ar, ticketshub.ar is handled by Caddy inside the image.
# Usage: GITHUB_OWNER=faolivera ./deploy-on-server.sh   OR   ./deploy-on-server.sh faolivera
# Requires: Docker, and docker login ghcr.io if the image is private.
# Ensure DNS A records for the three domains point to this instance's public IP.
# Optional: set ENV_FILE=/path/to/.env to pass backend env (e.g. DATABASE_URL) into the container.
set -e
GITHUB_OWNER="${1:-$GITHUB_OWNER}"
if [[ -z "$GITHUB_OWNER" ]]; then
  echo "Usage: GITHUB_OWNER=youruser ./deploy-on-server.sh   OR   ./deploy-on-server.sh youruser"
  exit 1
fi
IMAGE="ghcr.io/${GITHUB_OWNER}/ticketshub-lightsail:latest"
echo "Pulling $IMAGE ..."
docker pull "$IMAGE"
echo "Stopping existing container (if any)..."
docker stop ticketshub 2>/dev/null || true
docker rm ticketshub 2>/dev/null || true
echo "Starting new container..."
extra_args=()
if [[ -n "${ENV_FILE}" && -f "${ENV_FILE}" ]]; then
  extra_args+=(--env-file "${ENV_FILE}")
fi
docker run -d \
  -p 80:80 -p 443:443 \
  -v lightsail_caddy_data:/data \
  --name ticketshub \
  --restart unless-stopped \
  "${extra_args[@]}" \
  "$IMAGE"
echo "Done. App is running from $IMAGE (TLS for ticketshub.shop, ticketshub.com.ar, ticketshub.ar)"
