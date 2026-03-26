#!/usr/bin/env bash
# Interactive wrapper: prompt for version/tag, then run build.sh.
# Run from repo root: pnpm run render:build
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
read -r -p "Version/tag? [latest]: " version
version="${version:-latest}"
echo "Building image with tag: ticketshub:$version"
"$SCRIPT_DIR/build.sh" "ticketshub:$version"
