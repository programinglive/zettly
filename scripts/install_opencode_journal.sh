#!/usr/bin/env bash
set -euo pipefail

# Installs the Zettly journal plugin for OpenCode.
#
# The Codex hook only records Codex turns. OpenCode (this harness) needs its
# own plugin, otherwise every turn here is invisible to Zettly — which is
# exactly what happened before: the hook was installed and healthy but no
# session from OpenCode ever reached the API.
#
# Usage: scripts/install_opencode_journal.sh [--config-dir DIR]

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_SRC="$REPO/scripts/opencode/zettly-journal.ts"
HOOK="$REPO/scripts/codex_journal.py"

CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
if [ "${1:-}" = "--config-dir" ]; then
    CONFIG_DIR="$2"
fi

[ -f "$PLUGIN_SRC" ] || { echo "Plugin source missing at $PLUGIN_SRC" >&2; exit 1; }
[ -f "$HOOK" ] || { echo "Journal hook missing at $HOOK" >&2; exit 1; }

mkdir -p "$CONFIG_DIR/plugins"
cp "$PLUGIN_SRC" "$CONFIG_DIR/plugins/zettly-journal.ts"

echo "Installed OpenCode journal plugin at $CONFIG_DIR/plugins/zettly-journal.ts"
echo "It spawns: $HOOK"
echo
echo "Remaining steps (per-device, one time):"
echo "  1. Create $HOME/.local/share/DailyActivityJournal/config.env (or %LOCALAPPDATA%\\DailyActivityJournal\\config.env)"
echo "     with ZETTLY_API_BASE and ZETTLY_CLI_TOKEN. Env vars still win if set."
echo "  2. Restart OpenCode so it loads the plugin."
echo "  3. Verify: a session_id appears in Zettly after your next turn."
