#!/usr/bin/env bash
# Build landing image (amd64 for Lightsail), then tag and push to ghcr.io.
# Run from repo root: pnpm run landing:publish
# Requires: docker login ghcr.io
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
read -r -p "Version/tag? [latest]: " version
version="${version:-latest}"
echo "Building landing:${version} (linux/amd64)..."
"$SCRIPT_DIR/build.sh" "$version" "linux/amd64"
echo "Publishing ghcr.io/.../ticketshub-landing:${version} from local landing:${version}"
"$SCRIPT_DIR/publish.sh" "$version" "landing:${version}"
