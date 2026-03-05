#!/usr/bin/env bash
# Interactive wrapper: prompt for version/tag, then run publish.sh.
# Run from repo root: npm run render:publish
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
read -r -p "Version/tag? [latest]: " version
version="${version:-latest}"
echo "Publishing ghcr.io/.../ticketshub:$version from local ticketshub:$version"
"$SCRIPT_DIR/publish.sh" "$version" "ticketshub:$version"
