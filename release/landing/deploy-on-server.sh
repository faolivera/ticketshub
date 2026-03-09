#!/usr/bin/env bash
# Run on the Lightsail (or any) instance to pull the latest image and restart the landing container.
# Usage: GITHUB_OWNER=faolivera ./deploy-on-server.sh   OR   ./deploy-on-server.sh faolivera
# Requires: Docker, and docker login ghcr.io if the image is private.
set -e
GITHUB_OWNER="faolivera"
if [[ -z "$GITHUB_OWNER" ]]; then
  echo "Usage: GITHUB_OWNER=youruser ./deploy-on-server.sh   OR   ./deploy-on-server.sh youruser"
  exit 1
fi
IMAGE="ghcr.io/${GITHUB_OWNER}/ticketshub-landing:latest"
echo "Pulling $IMAGE ..."
docker pull "$IMAGE"
echo "Stopping existing container (if any)..."
docker stop landing 2>/dev/null || true
docker rm landing 2>/dev/null || true
echo "Starting new container..."
docker run -d \
  -p 80:80 -p 443:443 \
  -e DOMAIN=ticketshub.shop \
  -v landing_caddy_data:/data \
  --name landing \
  --restart unless-stopped \
  "$IMAGE"
echo "Done. Landing is running from $IMAGE"
