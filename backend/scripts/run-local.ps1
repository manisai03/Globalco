<#
  Runs every service as a local JVM (no Docker images needed). Prerequisites:
    - MySQL reachable at DbHost:DbPort (databases are created automatically)
    - RabbitMQ on localhost:5672, e.g.  docker run -d --name jobboard-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management
    - Jars built:  .\mvnw.cmd -B install -DskipTests   (from backend/)

  Usage:  .\scripts\run-local.ps1 -DbPassword <mysql root password>
  Stop:   .\scripts\stop-local.ps1
#>
param(
    [string]$DbPassword = $env:DB_PASSWORD,
    [string]$DbUsername = "root",
    [string]$DbHost = "localhost",
    [int]$DbPort = 3306
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$pidFile = Join-Path $logs "pids.txt"

$java = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\java.exe" } else { "java" }

$env:DB_HOST = $DbHost
$env:DB_PORT = "$DbPort"
$env:DB_USERNAME = $DbUsername
$env:DB_PASSWORD = $DbPassword
if (-not $env:LOG_OTP_WHEN_UNCONFIGURED) { $env:LOG_OTP_WHEN_UNCONFIGURED = "true" }

function Start-Service-Jar([string]$name, [int]$port) {
    $jar = Get-ChildItem (Join-Path $root "$name\target") -Filter "$name-*.jar" | Select-Object -First 1
    if (-not $jar) { throw "Missing jar for $name - build first with .\mvnw.cmd -B install -DskipTests" }
    $log = Join-Path $logs "$name.log"
    $proc = Start-Process -FilePath $java -ArgumentList "-Xmx384m", "-jar", "`"$($jar.FullName)`"" `
        -WorkingDirectory (Join-Path $root $name) -RedirectStandardOutput $log -RedirectStandardError "$log.err" `
        -WindowStyle Hidden -PassThru
    Add-Content $pidFile "$($proc.Id) $name"
    Write-Host ("started {0,-22} pid {1,-6} port {2}  log: logs\{0}.log" -f $name, $proc.Id, $port)
}

function Wait-Port([int]$port, [int]$timeoutSec = 120) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("127.0.0.1", $port); $c.Close(); return } catch { Start-Sleep -Milliseconds 700 }
    }
    throw "Timed out waiting for port $port"
}

$busy = 8761, 8090, 9001, 9002, 9003, 9004, 9005, 9006 | Where-Object {
    try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("127.0.0.1", $_); $c.Close(); $true } catch { $false }
}
if ($busy) { throw "Ports already in use: $($busy -join ', '). Stop the other stack first (.\scripts\stop-local.ps1 or docker compose down)." }

Remove-Item $pidFile -ErrorAction SilentlyContinue
Start-Service-Jar "discovery-server" 8761
Wait-Port 8761

$services = [ordered]@{
    "auth-service" = 9001; "job-service" = 9002; "application-service" = 9003
    "messaging-service" = 9004; "notification-service" = 9005; "ai-service" = 9006; "api-gateway" = 8090
}
foreach ($entry in $services.GetEnumerator()) { Start-Service-Jar $entry.Key $entry.Value }
foreach ($entry in $services.GetEnumerator()) { Wait-Port $entry.Value 180 }

Write-Host "`nAll services are listening. Gateway: http://localhost:8090  Eureka: http://localhost:8761"
Write-Host "Services need ~10s more to appear in Eureka before the gateway can route to them."
