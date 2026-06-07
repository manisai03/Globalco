# One-time Cloudinary setup for profile pictures
Write-Host "Globalco Jobs - Cloudinary Profile Picture Setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "Get credentials from https://console.cloudinary.com → Settings → API Keys" -ForegroundColor Gray
Write-Host ""
$cloudName = Read-Host "Cloud name"
$apiKey = Read-Host "API Key"
$apiSecret = Read-Host "API Secret" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiSecret))

$content = @"
app:
  cloudinary:
    cloud-name: $cloudName
    api-key: $apiKey
    api-secret: $plain
    folder: globalco-jobs/avatars
"@

$content | Out-File -FilePath "cloudinary-local.yml" -Encoding utf8
Write-Host ""
Write-Host "Created cloudinary-local.yml. Restart the backend to enable profile picture uploads." -ForegroundColor Green
