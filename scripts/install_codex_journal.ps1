$ErrorActionPreference="Stop"

# Resolve paths relative to this script (repo root / scripts/)
$repo = Split-Path -Parent $PSScriptRoot
$script = Join-Path $repo "scripts\codex_journal.py"
$codexHome = Join-Path $env:USERPROFILE ".codex"
$hooksFile = Join-Path $codexHome "hooks.json"

# Find a real Python 3 executable (skip the Microsoft Store shim).
$python = Get-Command python.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -and $_.Source -notmatch '\\WindowsApps\\' } |
    Select-Object -First 1
if (-not $python) {
    throw "Python is not on PATH. Install Python 3.11+ and re-run this installer."
}
$pythonPath = $python.Source

if (-not (Test-Path -LiteralPath $script)) {
    throw "Journal script missing at $script"
}

New-Item -ItemType Directory -Path $codexHome -Force | Out-Null

# Load or initialise the hooks document.
$config = @{ hooks = @{} }
if (Test-Path -LiteralPath $hooksFile) {
    $config = Get-Content -LiteralPath $hooksFile -Raw | ConvertFrom-Json -AsHashtable
    if (-not $config.ContainsKey('hooks')) { $config.hooks = @{} }
}

$command = '"{0}" "{1}" hook' -f $pythonPath, $script

foreach ($name in @('UserPromptSubmit', 'SessionStart', 'Stop', 'PostToolUse')) {
    $items = @($config.hooks[$name])
    # Idempotency: skip if a codex_journal.py entry already exists for this event.
    $found = $false
    foreach ($i in $items) {
        foreach ($h in @($i.hooks)) {
            if ($h.command -like '*codex_journal.py*') { $found = $true }
        }
    }
    if (-not $found) {
        $config.hooks[$name] = $items + @(@{
            hooks = @(@{ type = 'command'; command = $command; async = $true; timeout = 3 })
        })
    }
}

$temp = "$hooksFile.tmp"
$config | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $temp -Encoding utf8
Move-Item -LiteralPath $temp -Destination $hooksFile -Force

Write-Host "Codex hooks installed at $hooksFile"
Write-Host "Hook command: $pythonPath $script"
Write-Host ""
Write-Host "Remaining steps (per-device, one time):"
Write-Host "  1. Set ZETTLY_API_BASE + ZETTLY_CLI_TOKEN as User env vars."
Write-Host "  2. Restart Codex and accept the hook trust prompt."
Write-Host "  3. Failures are spooled to $env:LOCALAPPDATA\DailyActivityJournal\outbox.jsonl and auto-flushed on the next hook run."
