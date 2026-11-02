#!/bin/bash
# Provision the Zettly journal hook on a Unix-like device from the published repo.
set -euo pipefail

REPO_URL="https://github.com/programinglive/zettly.git"
DEST="${1:-$HOME/code/zettly}"
TOKEN="$2"
BASE="https://zettly.programinglive.com"

# The hook resolves its state dir as LOCALAPPDATA/DailyActivityJournal, falling
# back to $HOME/DailyActivityJournal. On macOS LOCALAPPDATA is unset, so the real
# path is ~/DailyActivityJournal — writing to ~/.local/share silently left the
# config unread and every event spooled to an outbox that never drained.
if [ -n "${LOCALAPPDATA:-}" ]; then
  STATE="$LOCALAPPDATA/DailyActivityJournal"
else
  STATE="$HOME/DailyActivityJournal"
fi

echo "--- repo at $DEST ---"
if [ -d "$DEST/.git" ]; then
  git -C "$DEST" fetch origin main -q
  git -C "$DEST" reset --hard origin/main -q
else
  mkdir -p "$(dirname "$DEST")"
  git clone -q "$REPO_URL" "$DEST"
fi
echo "commit: $(git -C "$DEST" rev-parse --short HEAD)"

echo "--- state dir + config.env ($STATE) ---"
mkdir -p "$STATE"
chmod 700 "$STATE"
printf '# Zettly journal hook config. Env vars win; this file is the fallback.\nZETTLY_API_BASE=%s\nZETTLY_CLI_TOKEN=%s\n' "$BASE" "$TOKEN" > "$STATE/config.env"
chmod 600 "$STATE/config.env"
echo "config.env: $(wc -c < "$STATE/config.env" | tr -d ' ') bytes"

echo "--- working-directory check that the hook agrees ---"
python3 - "$STATE" <<'PY'
import os, sys
from pathlib import Path
resolved = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "DailyActivityJournal"
print("hook state dir :", resolved)
print("provisioned at :", sys.argv[1])
print("MATCH" if str(resolved) == sys.argv[1] else "MISMATCH")
PY

echo "--- install opencode plugin ---"
OPENCODE_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
mkdir -p "$OPENCODE_DIR/plugins"
cp "$DEST/scripts/opencode/zettly-journal.ts" "$OPENCODE_DIR/plugins/zettly-journal.ts"
echo "plugins: $(ls "$OPENCODE_DIR/plugins" | tr '\n' ' ')"
