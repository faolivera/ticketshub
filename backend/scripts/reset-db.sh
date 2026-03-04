#!/usr/bin/env bash
#
# Resets the local development PostgreSQL database: drops and recreates the DB
# so all tables (including Prisma's _prisma_migrations) are removed.
# Safe by design: only connects to the docker-compose postgres container;
# never uses DATABASE_URL, so it cannot accidentally reset a remote/prod DB.
#
set -euo pipefail

CONTAINER_NAME="ticketshub-db"
PG_USER="ticketshub"
PG_DB="ticketshub"

# Ensure we only run when the local dev container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Error: Container '${CONTAINER_NAME}' is not running." >&2
  echo "Start it with: docker compose up -d (from project root)" >&2
  exit 1
fi

echo "Dropping database ${PG_DB} ..."
docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS ${PG_DB};"

echo "Creating database ${PG_DB} ..."
docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};"

echo "Done. Run migrations from scratch with: npx prisma migrate deploy"
echo "  or: npx prisma migrate dev"
