param(
  [string]$TaskName = "LichViet-AI"
)

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script = Join-Path $repo "scripts\start-windows.ps1"
$arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $script + '"'

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Start LichViet AI personal server at Windows logon" -Force | Out-Null

Write-Host "Registered Scheduled Task: $TaskName" -ForegroundColor Green
Write-Host "It starts LichViet AI when this Windows user logs in."
