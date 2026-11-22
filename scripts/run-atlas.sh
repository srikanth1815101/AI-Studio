#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$ROOT/telugustates/Hugo-Project"

hugo_bin="${HUGO_BIN:-hugo}"
if ! command -v "$hugo_bin" >/dev/null 2>&1; then
  echo 'Hugo is not installed. Install Hugo Extended (the project documents 0.131.0+) and rerun npm run atlas:serve.' >&2
  exit 127
fi
cd "$PROJECT"
printf 'Serving bundled Telugu States Hugo project: '
"$hugo_bin" version
exec "$hugo_bin" server --bind 0.0.0.0 --port "${PORT:-1313}" --baseURL / --disableFastRender
