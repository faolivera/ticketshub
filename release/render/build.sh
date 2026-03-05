#!/usr/bin/env bash
# Build the TicketsHub image for Render.
# Run from repo root: ./release/render/build.sh [tag]
# Builds the backend on the host first (avoids OOM in Docker), then runs docker build.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TAG="${1:-ticketshub:latest}"
cd "$REPO_ROOT"
echo "Building backend (required for image)..."
(cd backend && npm run build)
docker build -f release/render/Dockerfile -t "$TAG" .
