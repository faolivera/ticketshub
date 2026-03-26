#!/usr/bin/env bash
# Build the TicketsHub image for AWS Lightsail.
# Run from repo root: ./release/lightsail/build.sh [tag]
# Builds the backend on the host first (avoids OOM in Docker), then runs docker build.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TAG="${1:-ticketshub-lightsail:latest}"
cd "$REPO_ROOT"
echo "Building backend (required for image)..."
(cd backend && pnpm run build)
# Set BUILD_PLATFORM=linux/amd64 for Lightsail (x86). Use linux/arm64 for ARM instances.
# Set REGISTRY_CACHE_REF (e.g. ghcr.io/owner/ticketshub-lightsail:buildcache) to use registry cache in CI.
if [[ -n "${BUILD_PLATFORM}" ]] && docker buildx version &>/dev/null; then
  echo "Building for ${BUILD_PLATFORM}..."
  cache_args=()
  if [[ -n "${REGISTRY_CACHE_REF}" ]]; then
    cache_args+=(--cache-from "type=registry,ref=${REGISTRY_CACHE_REF}" --cache-to "type=registry,ref=${REGISTRY_CACHE_REF},mode=max")
    echo "Using registry cache: ${REGISTRY_CACHE_REF}"
  fi
  docker buildx build --platform "${BUILD_PLATFORM}" -f release/lightsail/Dockerfile -t "$TAG" --load "${cache_args[@]}" .
else
  if [[ -n "${BUILD_PLATFORM}" ]]; then
    echo "BUILD_PLATFORM set but buildx not available. Building for host arch."
  fi
  docker build -f release/lightsail/Dockerfile -t "$TAG" .
fi
