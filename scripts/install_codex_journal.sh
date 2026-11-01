#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to this script (repo root / scripts/)
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO/scripts/codex_journal.py"
CODEX_HOME="$HOME/.codex"
HOOKS_FILE="$CODEX_HOME/hooks.json"

# Find a real python3.
PYTHON="$(command -v python3 || command -v python)"
if [ -z "$PYTHON" ]; then
    echo "Python is not on PATH. Install Python 3.11+ and re-run this installer." >&2
    exit 1
fi

[ -f "$SCRIPT" ] || { echo "Journal script missing at $SCRIPT" >&2; exit 1; }

mkdir -p "$CODEX_HOME"

# Use python3 to merge/initialise the hooks.json safely.
PYTHON="$PYTHON" SCRIPT="$SCRIPT" HOOKS_FILE="$HOOKS_FILE" "$PYTHON" - <<'PYEOF'
import json, os

hooks_file = os.environ["HOOKS_FILE"]
script     = os.environ["SCRIPT"]
python     = os.environ["PYTHON"]
command    = f'"{python}" "{script}" hook'

config = {"hooks": {}}
if os.path.exists(hooks_file):
    with open(hooks_file) as f:
        config = json.load(f)
    config.setdefault("hooks", {})

for event in ("UserPromptSubmit", "SessionStart", "Stop", "PostToolUse"):
    items = config["hooks"].get(event, [])
    # Idempotency: skip if a codex_journal.py entry already exists for this event.
    already = any(
        "codex_journal.py" in h.get("command", "")
        for i in items
        for h in i.get("hooks", [])
    )
    if not already:
        items.append({"hooks": [{"type": "command", "command": command, "async": True, "timeout": 3}]})
        config["hooks"][event] = items

with open(hooks_file, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")

print(f"Installed Codex hooks at {hooks_file}")
print(f"Hook command: {command}")
print()
print("Remaining steps (per-device, one time):")
print("  1. Set ZETTLY_API_BASE + ZETTLY_CLI_TOKEN as env vars.")
print("  2. Restart Codex and accept the hook trust prompt.")
print(f"  3. Failures are spooled to {os.path.expanduser('~')}/DailyActivityJournal/outbox.jsonl and auto-flushed on the next hook run.")
PYEOF
