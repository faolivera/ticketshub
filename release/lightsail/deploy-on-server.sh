#!/usr/bin/env bash
# Run on the AWS Lightsail instance to pull the latest image and restart the app container.
# TLS/SSL for ticketshub.shop, ticketshub.com.ar, ticketshub.ar is handled by Caddy inside the image.
#
# Usage:
#   GITHUB_OWNER=faolivera ./deploy-on-server.sh
#   ./deploy-on-server.sh faolivera
#   ./deploy-on-server.sh faolivera --with-grafana-agent
#
# Requires: Docker, and docker login ghcr.io if the image is private.
# Ensure DNS A records for the three domains point to this instance's public IP.
#
# Optional:
#   ENV_FILE=/path/to/.env   Pass backend env (e.g. DATABASE_URL) and optionally Grafana vars into containers.
#   --with-grafana-agent     Start Grafana Alloy to scrape /metrics and send to Grafana Cloud.
#                            Requires in ENV_FILE: GRAFANA_CLOUD_PROMETHEUS_REMOTE_WRITE_URL, GRAFANA_CLOUD_USER, GRAFANA_CLOUD_API_KEY.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WITH_GRAFANA_AGENT=false
for arg in "$@"; do
  if [[ "$arg" == "--with-grafana-agent" ]]; then
    WITH_GRAFANA_AGENT=true
  elif [[ -z "${GITHUB_OWNER:-}" ]]; then
    GITHUB_OWNER="$arg"
  fi
done
# Allow GITHUB_OWNER from environment when not passed as argument
export GITHUB_OWNER="${GITHUB_OWNER:-}"
if [[ -z "$GITHUB_OWNER" ]]; then
  echo "Usage: GITHUB_OWNER=youruser ./deploy-on-server.sh   OR   ./deploy-on-server.sh youruser [--with-grafana-agent]"
  exit 1
fi

export GITHUB_OWNER

# So that docker-compose can resolve env_file: use a file in this directory.
if [[ -n "${ENV_FILE}" && -f "${ENV_FILE}" ]]; then
  cp "${ENV_FILE}" "$SCRIPT_DIR/.env"
  export ENV_FILE="$SCRIPT_DIR/.env"
else
  export ENV_FILE="$SCRIPT_DIR/.env.default"
fi

IMAGE="ghcr.io/${GITHUB_OWNER}/ticketshub-lightsail:latest"
echo "Pulling $IMAGE ..."
docker pull "$IMAGE"

echo "Stopping existing containers (if any)..."
docker compose down 2>/dev/null || true

COMPOSE_PROFILES=""
if [[ "$WITH_GRAFANA_AGENT" == true ]]; then
  COMPOSE_PROFILES="--profile grafana"
  echo "Starting app + Grafana Alloy..."
else
  echo "Starting app..."
fi

docker compose $COMPOSE_PROFILES up -d

echo "Done. App is running from $IMAGE (TLS for ticketshub.shop, ticketshub.com.ar, ticketshub.ar)"
if [[ "$WITH_GRAFANA_AGENT" == true ]]; then
  echo "Grafana Alloy is running and will scrape /metrics from the app (ensure the app exposes GET /metrics)."
fi
