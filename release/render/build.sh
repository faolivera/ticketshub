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
# Set BUILD_PLATFORM=linux/amd64 to build for Render (requires Docker Buildx). Otherwise builds for host arch.
if [[ "${BUILD_PLATFORM}" == "linux/amd64" ]] && docker buildx version &>/dev/null; then
  echo "Building for linux/amd64 (Render)..."
  docker buildx build --platform linux/amd64 -f release/render/Dockerfile -t "$TAG" --load .
else
  if [[ "${BUILD_PLATFORM}" == "linux/amd64" ]]; then
    echo "BUILD_PLATFORM=linux/amd64 set but buildx not available. Building for host arch. To build for Render: install buildx (https://docs.docker.com/go/buildx/) or let Render build from repo."
  fi
  docker build -f release/render/Dockerfile -t "$TAG" .
fi
