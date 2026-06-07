# One-time local MySQL setup for Globalco Jobs backend
Write-Host "Globalco Jobs - MySQL Local Setup" -ForegroundColor Cyan
Write-Host ""
$host = Read-Host "MySQL host [localhost:3306]"
if (-not $host) { $host = "localhost:3306" }
$user = Read-Host "MySQL username [root]"
if (-not $user) { $user = "root" }
$password = Read-Host "MySQL password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$content = @"
spring:
  datasource:
    url: jdbc:mysql://${host}/jobboard?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: $user
    password: $plain
"@

$content | Out-File -FilePath "mysql-local.yml" -Encoding utf8
Write-Host ""
Write-Host "Created mysql-local.yml" -ForegroundColor Green
Write-Host "Start backend with MySQL:" -ForegroundColor Yellow
Write-Host '  $env:SPRING_PROFILES_ACTIVE = "mysql"' -ForegroundColor Gray
Write-Host "  .\mvnw.cmd spring-boot:run" -ForegroundColor Gray
