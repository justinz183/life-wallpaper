# Install Life Wallpaper as a scheduled task that runs at logon.
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

$Action   = New-ScheduledTaskAction -Execute $NodeCmd.Source `
    -Argument "`"$RepoDir\index.js`"" -WorkingDirectory $RepoDir
$Trigger  = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger `
    -Settings $Settings -Force | Out-Null

Write-Host "Installed. Life Wallpaper will start at every logon."
Write-Host "To stop: powershell -ExecutionPolicy Bypass -File scripts\install-autostart-win.ps1 -Uninstall"
