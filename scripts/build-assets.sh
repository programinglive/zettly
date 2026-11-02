#!/usr/bin/env bash
#
# Build the frontend without ever leaving users without a manifest.
#
# `vite build` empties its output directory before writing, so building straight
# into public/build creates a window where manifest.json does not exist. Any
# request that lands in that window fails with
#
#     Vite manifest not found at: /var/www/zettly/public/build/manifest.json
#
# which is exactly what happened during the 2026-11-02 deploy: one 500 in the log.
#
# So: build into public/build.next, check the result, then swap the two directories
# with two renames on the same filesystem. The gap shrinks from ~40 s to a few
# milliseconds, and a failed build leaves the live assets untouched.
#
# --outDir does not change the asset base: laravel-vite-plugin keeps it at /build/,
# so the swapped-in files are served from the same URLs as before.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

NEXT="public/build.next"
PREV="public/build.prev"
LIVE="public/build"

rm -rf "$NEXT" "$PREV"

echo "[build-assets] building into $NEXT"
npx vite build --outDir "$NEXT"

if [ ! -s "$NEXT/manifest.json" ]; then
    echo "[build-assets] refusing to swap: $NEXT/manifest.json is missing or empty" >&2
    exit 1
fi

# The copy step of vite-plugin-pwa writes these last; an empty manifest would leave
# the app without its JS graph, so it is the one thing worth checking.

echo "[build-assets] swapping $NEXT -> $LIVE"
if [ -d "$LIVE" ]; then
    mv "$LIVE" "$PREV"
fi
mv "$NEXT" "$LIVE"
rm -rf "$PREV"

echo "[build-assets] done: $(grep -c 'file' "$LIVE/manifest.json") manifest entries"
