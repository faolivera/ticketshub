#!/usr/bin/env bash
# Tag and push the landing image to GitHub Container Registry.
# Run from repo root: ./release/landing/publish.sh [tag]
# Requires: docker login ghcr.io
# Set GITHUB_OWNER or pass as env to override (derived from git remote origin if unset).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TAG="${1:-latest}"
if [[ -z "${GITHUB_OWNER}" ]]; then
  REMOTE="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
  if [[ "$REMOTE" =~ github\.com[:/]([^/]+) ]]; then
    GITHUB_OWNER="${BASH_REMATCH[1]}"
  else
    echo "Set GITHUB_OWNER (e.g. export GITHUB_OWNER=youruser) or run from a repo with origin on GitHub."
    exit 1
  fi
fi
IMAGE="ghcr.io/${GITHUB_OWNER}/ticketshub-landing:${TAG}"
SOURCE="${2:-landing:latest}"
cd "$REPO_ROOT"
docker tag "$SOURCE" "$IMAGE"
docker push "$IMAGE"
echo "Pushed $IMAGE"
