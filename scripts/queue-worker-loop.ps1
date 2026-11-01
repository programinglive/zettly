# Wrapper that keeps the Laravel queue worker alive: relaunches it if it exits.
# Intended to be run from a Windows scheduled task at logon + on a 10-minute
# interval watchdog. The inner `queue:work --max-time=3600` auto-restarts hourly.
$ErrorActionPreference = "Continue"
$repo = "D:\works\mine\code\zettly"
$php  = "C:\php83\php.exe"

while ($true) {
    $scriptArgs = @("$repo\artisan", "queue:work", "--sleep=3", "--tries=3", "--max-time=3600")
    & $php @scriptArgs 2>&1 | Tee-Object -FilePath "$repo\storage\logs\queue-worker.log" -Append
    # brief backoff before restart
    Start-Sleep -Seconds 5
}
