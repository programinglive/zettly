#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# Installs the Zettly journal plugin for OpenCode (Windows).
#
# The Codex hook only records Codex turns. OpenCode needs its own plugin,
# otherwise every turn here is invisible to Zettly.
#
# Usage: .\scripts\install_opencode_journal.ps1 [-ConfigDir <dir>]

param(
    [string]$ConfigDir = "$env:USERPROFILE\.config\opencode"
)

$repo = Split-Path -Parent $PSScriptRoot
$pluginSrc = Join-Path $repo "scripts\opencode\zettly-journal.ts"
$hook = Join-Path $repo "scripts\codex_journal.py"

if (-not (Test-Path -LiteralPath $pluginSrc)) { throw "Plugin source missing at $pluginSrc" }
if (-not (Test-Path -LiteralPath $hook)) { throw "Journal hook missing at $hook" }

$pluginsDir = Join-Path $ConfigDir "plugins"
New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
Copy-Item -LiteralPath $pluginSrc -Destination (Join-Path $pluginsDir "zettly-journal.ts") -Force

$stateDir = Join-Path $env:LOCALAPPDATA "DailyActivityJournal"
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
$configFile = Join-Path $stateDir "config.env"

Write-Host "Installed OpenCode journal plugin at $pluginsDir\zettly-journal.ts"
Write-Host "It spawns: $hook"
Write-Host ""
Write-Host "Remaining steps (per-device, one time):"
if (-not (Test-Path -LiteralPath $configFile)) {
    Write-Host "  1. Create $configFile with:"
    Write-Host "       ZETTLY_API_BASE=https://zettly.programinglive.com"
    Write-Host "       ZETTLY_CLI_TOKEN=<your zettly:cli token>"
} else {
    Write-Host "  1. Config already present at $configFile"
}
Write-Host "  2. Restart OpenCode so it loads the plugin."
Write-Host "  3. Verify: a session_id appears in Zettly after your next turn."
