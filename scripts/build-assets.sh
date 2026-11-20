#!/usr/bin/env bash
#
# Thin wrapper delegating to the cross-platform atomic asset builder
# (scripts/build-assets.mjs) so both `bash scripts/build-assets.sh` and
# `npm run build` share one tested implementation.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$APP_DIR/scripts/build-assets.mjs"
