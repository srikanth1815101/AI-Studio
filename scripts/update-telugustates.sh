#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$ROOT/telugustates/Hugo-Project"
PIN="$ROOT/telugustates/UPSTREAM_COMMIT"
UPSTREAM='https://github.com/srikanth1815101/telugustates.git'
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo 'Fetching only Hugo-Project from telugustates/main…'
git clone --depth 1 --filter=blob:none --sparse --branch main "$UPSTREAM" "$TMP/source"
git -C "$TMP/source" sparse-checkout set Hugo-Project
new_commit="$(git -C "$TMP/source" rev-parse HEAD)"

# Compare vendored tracked source with the exact pinned upstream tree plus the
# documented adapter. This also catches authored edits that were already committed
# to the outer workspace; generated Hugo output is outside the upstream file list.
pinned="$(tr -d '[:space:]' < "$PIN")"
tracked_count="$(git -C "$ROOT" ls-files -- 'telugustates/Hugo-Project/**' | wc -l | tr -d '[:space:]')"
if [[ -d "$PROJECT" && "$tracked_count" != 0 ]]; then
  if ! git -C "$ROOT" diff --quiet HEAD -- telugustates/Hugo-Project || \
     ! git -C "$ROOT" diff --cached --quiet -- telugustates/Hugo-Project; then
    echo 'Local changes exist in telugustates/Hugo-Project; preserve or commit them before syncing.' >&2
    exit 1
  fi
  git -C "$TMP/source" fetch --depth 1 origin "$pinned"
  mkdir -p "$TMP/pinned"
  git -C "$TMP/source" archive --format=tar "$pinned" Hugo-Project | tar -xf - -C "$TMP/pinned"
  node "$ROOT/scripts/apply-atlas-video-hook.mjs" "$TMP/pinned/Hugo-Project"
  while IFS= read -r upstream_file; do
    relative="${upstream_file#Hugo-Project/}"
    if ! cmp -s "$TMP/pinned/Hugo-Project/$relative" "$PROJECT/$relative"; then
      echo "Local Atlas source differs from its pinned upstream file: $relative" >&2
      echo 'Preserve/review that change before updating upstream.' >&2
      exit 1
    fi
  done < <(git -C "$TMP/source" ls-tree -r --name-only "$pinned" -- Hugo-Project)
  untracked="$(git -C "$ROOT" ls-files --others --exclude-standard -- telugustates/Hugo-Project)"
  if [[ -n "$untracked" ]]; then
    echo 'Untracked files exist in telugustates/Hugo-Project; move or preserve them before syncing.' >&2
    exit 1
  fi
fi

mkdir -p "$TMP/stage"
git -C "$TMP/source" archive --format=tar "$new_commit" Hugo-Project | tar -xf - -C "$TMP/stage"
node "$ROOT/scripts/apply-atlas-video-hook.mjs" "$TMP/stage/Hugo-Project"

rm -rf "$PROJECT"
mkdir -p "$(dirname "$PROJECT")"
cp -a "$TMP/stage/Hugo-Project" "$PROJECT"
printf '%s\n' "$new_commit" > "$PIN"
echo "Updated telugustates/Hugo-Project to $new_commit"
