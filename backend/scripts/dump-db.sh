#!/usr/bin/env bash
#
# Dumps the local development PostgreSQL database (ticketshub-db container only).
# Safe by design: only connects to the docker-compose postgres container;
# never uses DATABASE_URL, so it cannot accidentally dump a remote/prod DB.
#
set -euo pipefail

CONTAINER_NAME="ticketshub-db"
PG_USER="ticketshub"
PG_DB="ticketshub"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMPS_DIR="${SCRIPT_DIR}/../dumps"

# Ensure we only dump when the local dev container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Error: Container '${CONTAINER_NAME}' is not running." >&2
  echo "Start it with: docker compose up -d (from project root)" >&2
  exit 1
fi

mkdir -p "$DUMPS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${DUMPS_DIR}/ticketshub_${TIMESTAMP}.sql"

echo "Dumping ${PG_DB} from ${CONTAINER_NAME} to ${OUTPUT_FILE} ..."
docker exec "$CONTAINER_NAME" pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --no-acl > "$OUTPUT_FILE"
echo "Done. Dump saved to ${OUTPUT_FILE}"
