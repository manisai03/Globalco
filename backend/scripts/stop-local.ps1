# Stops the JVMs started by run-local.ps1 (only those PIDs; other Java processes are left alone).
$pidFile = Join-Path (Split-Path -Parent $PSScriptRoot) "logs\pids.txt"
if (-not (Test-Path $pidFile)) { Write-Host "Nothing to stop."; return }
Get-Content $pidFile | ForEach-Object {
    $processId, $name = $_ -split " ", 2
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "java") {
        Stop-Process -Id $processId -Force
        Write-Host "stopped $name ($processId)"
    }
}
Remove-Item $pidFile
