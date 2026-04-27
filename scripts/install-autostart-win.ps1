# Install Life Wallpaper as a scheduled task that runs:
#   - once at every logon
#   - once at 00:01 every day
# Each run renders + applies the wallpaper, then exits. Task Scheduler handles
# missed runs (e.g. if the machine was asleep).
#
# Usage  (PowerShell, run from the repo root):
#   powershell -ExecutionPolicy Bypass -File scripts\install-autostart-win.ps1
# Uninstall:
#   powershell -ExecutionPolicy Bypass -File scripts\install-autostart-win.ps1 -Uninstall

param([switch]$Uninstall)

$TaskName = "LifeWallpaper"
$RepoDir  = Split-Path -Parent $PSScriptRoot
$NodeCmd  = (Get-Command node -ErrorAction SilentlyContinue)

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Uninstalled scheduled task '$TaskName'."
    return
}

if (-not $NodeCmd) {
    Write-Error "node not found. Install Node.js 18+ from https://nodejs.org, then re-run."
    exit 1
}

$Action  = New-ScheduledTaskAction -Execute $NodeCmd.Source `
    -Argument "`"$RepoDir\index.js`"" -WorkingDirectory $RepoDir

# Two triggers: at logon, and daily at 00:01
$LogonTrigger = New-ScheduledTaskTrigger -AtLogOn
$DailyTrigger = New-ScheduledTaskTrigger -Daily -At 00:01

$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::FromMinutes(5))

Register-ScheduledTask -TaskName $TaskName -Action $Action `
    -Trigger @($LogonTrigger, $DailyTrigger) -Settings $Settings -Force | Out-Null

Write-Host "Installed. Life Wallpaper will:"
Write-Host "  - run at every logon"
Write-Host "  - run at 00:01 every day"
Write-Host "To stop: powershell -ExecutionPolicy Bypass -File scripts\install-autostart-win.ps1 -Uninstall"
