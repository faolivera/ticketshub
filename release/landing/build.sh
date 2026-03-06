#!/usr/bin/env bash
# Build the landing Docker image. Default: linux/amd64 for Lightsail.
# Run from repo root: ./release/landing/build.sh [tag] [platform]
#   tag: default latest. platform: default linux/amd64 (use linux/arm64 for M2 local).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TAG="${1:-latest}"
PLATFORM="${2:-linux/amd64}"
cd "$REPO_ROOT"
docker build --platform "$PLATFORM" -t "landing:${TAG}" -f landing/Dockerfile landing
echo "Built landing:${TAG} (${PLATFORM})"
