#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="$ROOT/telugustates/UPSTREAM_COMMIT"
UPSTREAM='https://github.com/srikanth1815101/telugustates.git'

if [[ ! -s "$PIN" ]]; then
  echo "Missing upstream pin: $PIN" >&2
  exit 2
fi
pinned="$(tr -d '[:space:]' < "$PIN")"
if ! latest="$(git ls-remote "$UPSTREAM" refs/heads/main | awk 'NR == 1 {print $1}')"; then
  echo 'Could not check telugustates/main; network/GitHub access failed.' >&2
  exit 2
fi
if [[ -z "$latest" ]]; then
  echo 'GitHub returned no main-branch commit for telugustates.' >&2
  exit 2
fi
if [[ "$pinned" == "$latest" ]]; then
  echo "Telugu States Hugo project is up to date with main ($pinned)."
else
  printf 'Telugu States Hugo project is behind main.\n  Vendored: %s\n  Upstream: %s\nRun: npm run atlas:update\n' "$pinned" "$latest"
  exit 1
fi
