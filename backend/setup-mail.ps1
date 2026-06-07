# One-time email setup for OTP password reset
Write-Host "Globalco Jobs - Email OTP Setup" -ForegroundColor Cyan
Write-Host ""
$email = Read-Host "Enter your Gmail address"
$password = Read-Host "Enter your Gmail App Password (16 chars, from Google Account > Security > App passwords)" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$content = @"
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: $email
    password: $plain
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

app:
  mail:
    from: $email
"@

$content | Out-File -FilePath "mail-local.yml" -Encoding utf8
Write-Host ""
Write-Host "Created mail-local.yml. Restart the backend to enable email OTP." -ForegroundColor Green
