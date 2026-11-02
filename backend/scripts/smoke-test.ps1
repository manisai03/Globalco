<#
  End-to-end smoke test through the API gateway. Exercises every service, the synchronous
  internal APIs and the asynchronous RabbitMQ events. Creates throwaway accounts and a job, then deletes the job.

  Usage:  .\scripts\smoke-test.ps1 [-Gateway http://localhost:8090]
#>
param([string]$Gateway = "http://localhost:8090")

$ErrorActionPreference = "Stop"
$script:failures = 0

function Call([string]$method, [string]$path, [string]$token = $null, $body = $null) {
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $params = @{ Method = $method; Uri = "$Gateway$path"; Headers = $headers; UseBasicParsing = $true }
    if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 6); $params.ContentType = "application/json" }
    try {
        $resp = Invoke-WebRequest @params
        $json = $null
        try { if ($resp.Content) { $json = $resp.Content | ConvertFrom-Json } } catch { }
        return [pscustomobject]@{ Status = [int]$resp.StatusCode; Body = $json; Headers = $resp.Headers }
    } catch [System.Net.WebException] {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $text = ""; $headers = @{}
        if ($_.Exception.Response) {
            $text = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
            $raw = $_.Exception.Response.Headers
            foreach ($key in $raw.AllKeys) { $headers[$key] = $raw[$key] }
        }
        $json = $null
        try { $json = $text | ConvertFrom-Json } catch { }
        return [pscustomobject]@{ Status = $status; Body = $json; Headers = $headers }
    }
}

# Invoke-WebRequest in Windows PowerShell 5.1 has no multipart support, so uploads go through curl.exe.
function Upload([string]$path, [string]$token, [string]$file) {
    $out = & curl.exe -s -o - -w "`n%{http_code}" -H "Authorization: Bearer $token" -F "file=@$file" "$Gateway$path"
    $lines = @($out -split "`n")
    return [pscustomobject]@{ Status = [int]$lines[-1]; Body = (($lines[0..($lines.Count - 2)] -join "`n") | ConvertFrom-Json) }
}

function Download([string]$path, [string]$token) {
    $code = & curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $token" "$Gateway$path"
    return [int]$code
}

function Check([string]$name, [bool]$ok, [string]$detail = "") {
    if ($ok) { Write-Host "  PASS  $name" -ForegroundColor Green }
    else { $script:failures++; Write-Host "  FAIL  $name $detail" -ForegroundColor Red }
}

function WaitFor([scriptblock]$condition, [int]$seconds = 10) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) { if (& $condition) { return $true }; Start-Sleep -Milliseconds 500 }
    return $false
}

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$password = "Passw0rd!"

Write-Host "`n[gateway + public]"
$r = Call GET "/api/public/health"; Check "public health" ($r.Status -eq 200)
$r = Call GET "/api/public/stats"; Check "public stats (job-service)" ($r.Status -eq 200 -and $null -ne $r.Body.data.openJobs)
$r = Call GET "/api/jobs?page=0&size=5"; Check "anonymous job search" ($r.Status -eq 200)
$r = Call GET "/internal/jobs/1"; Check "gateway hides /internal" ($r.Status -eq 404)
$r = Call GET "/api/applications/me"; Check "protected route needs token" ($r.Status -eq 401)
$r = Call GET "/api/public/health"; Check "gateway stamps X-Request-Id" ([string]$r.Headers["X-Request-Id"] -match '^[0-9a-f-]{36}$')
$r = Call GET "/swagger-ui.html"; Check "Swagger UI served by gateway" ($r.Status -eq 200)
$ok = WaitFor { $d = (Call GET "/v3/api-docs/auth-service").Body; $d.openapi -and $d.paths.'/api/auth/login' }
Check "OpenAPI spec for auth-service via gateway" $ok

Write-Host "`n[auth-service]"
$recEmail = "smoke.recruiter.$stamp@example.com"; $candEmail = "smoke.candidate.$stamp@example.com"
$r = Call POST "/api/auth/register" $null @{ email = $recEmail; password = $password; fullName = "Smoke Recruiter"; accountType = "RECRUITER"; companyName = "Smoke Co"; recruiterTitle = "Talent Lead" }
Check "register recruiter" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$r = Call POST "/api/auth/register" $null @{ email = $candEmail; password = $password; fullName = "Smoke Candidate"; accountType = "USER"; skills = "Java, Spring, React"; location = "Hyderabad"; phone = "9876543210" }
Check "register candidate" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$first = $r.Body.data.message
$r = Call POST "/api/auth/register" $null @{ email = $candEmail; password = "Different1!"; fullName = "Someone Else"; accountType = "USER" }
Check "registering a taken email looks the same (no account discovery)" ($r.Status -eq 200 -and $r.Body.data.message -eq $first) "status=$($r.Status)"
$r = Call POST "/api/auth/login" $null @{ email = $candEmail; password = "Different1!" }
Check "...and does not change the existing account" ($r.Status -eq 400) "status=$($r.Status)"
$r = Call POST "/api/auth/login" $null @{ email = $recEmail; password = "wrong-password" }
Check "bad password is 400 (frontend logs out on 401)" ($r.Status -eq 400)
$rec = (Call POST "/api/auth/login" $null @{ email = $recEmail; password = $password }).Body.data
$cand = (Call POST "/api/auth/login" $null @{ email = $candEmail; password = $password }).Body.data
Check "login both accounts" ($rec.token -and $cand.token)
$recToken = $rec.token; $candToken = $cand.token
$r = Call GET "/api/admin/dashboard" $candToken; Check "candidate blocked from /api/admin" ($r.Status -eq 403)

$otherEmail = "smoke.other.$stamp@example.com"
$null = Call POST "/api/auth/register" $null @{ email = $otherEmail; password = $password; fullName = "Smoke Other"; accountType = "USER"; skills = "Go"; location = "Pune"; phone = "9876500000" }
$otherToken = (Call POST "/api/auth/login" $null @{ email = $otherEmail; password = $password }).Body.data.token
for ($i = 0; $i -lt 5; $i++) { $null = Call POST "/api/auth/login" $null @{ email = $otherEmail; password = "wrong-$i" } }
$r = Call POST "/api/auth/login" $null @{ email = $otherEmail; password = $password }
Check "login locked (429 + Retry-After) after 5 bad passwords, even with the right one" ($r.Status -eq 429 -and [int]$r.Headers["Retry-After"] -gt 0) "status=$($r.Status)"
$r = Call POST "/api/auth/login" $null @{ email = $candEmail; password = $password }; Check "lock is per email" ($r.Status -eq 200)

$resumeFile = Join-Path $env:TEMP "smoke-resume-$stamp.pdf"
[IO.File]::WriteAllText($resumeFile, "%PDF-1.4`n% smoke test resume`n%%EOF")
$r = Upload "/api/users/me/resume" $candToken $resumeFile; Remove-Item $resumeFile
Check "candidate uploads resume" ($r.Status -eq 200 -and $r.Body.data.resumeUrl) "status=$($r.Status)"
$resumeUrl = $r.Body.data.resumeUrl
$fakeFile = Join-Path $env:TEMP "smoke-fake-$stamp.pdf"
[IO.File]::WriteAllText($fakeFile, "<html><script>alert(1)</script></html>")
$r = Upload "/api/users/me/resume" $candToken $fakeFile; Remove-Item $fakeFile
Check "file renamed to .pdf is rejected by content check" ($r.Status -eq 400) "status=$($r.Status)"
$disposition = (& curl.exe -s -D - -o NUL -H "Authorization: Bearer $candToken" "$Gateway$resumeUrl") -join "`n"
Check "files are served as attachments with nosniff" ($disposition -match '(?i)content-disposition:\s*attachment' -and $disposition -match '(?i)x-content-type-options:\s*nosniff')
Check "owner can download own resume" ((Download $resumeUrl $candToken) -eq 200)
Check "unrelated candidate cannot download it" ((Download $resumeUrl $otherToken) -eq 404)
Check "recruiter without an application cannot download it" ((Download $resumeUrl $recToken) -eq 404)

Write-Host "`n[job-service]"
$r = Call POST "/api/saved-searches" $candToken @{ search = "Smoke Java Developer $stamp"; sort = "recent" }
Check "candidate saves a job alert" ($r.Status -eq 200 -and $r.Body.data.alertsEnabled) "status=$($r.Status) $($r.Body.message)"
$alertId = $r.Body.data.id
$r = Call POST "/api/jobs" $recToken @{ title = "Smoke Java Developer $stamp"; description = "Build services"; location = "Hyderabad"; jobType = "FULL_TIME"; category = "Engineering"; skills = "Java, Spring"; experienceLevel = "MID"; salaryMin = 900000; salaryMax = 500000 }
Check "inverted salary range rejected" ($r.Status -eq 400)
$job = (Call POST "/api/jobs" $recToken @{ title = "Smoke Java Developer $stamp"; company = "Fake Corp"; featured = $true; description = "Build services"; location = "Hyderabad"; jobType = "FULL_TIME"; category = "Engineering"; skills = "Java, Spring"; experienceLevel = "MID" }).Body.data
Check "recruiter creates job" ($null -ne $job.id) ; $jobId = $job.id
Check "job carries recruiter snapshot" ($job.createdByName -eq "Smoke Recruiter")
Check "company comes from the recruiter profile and featured cannot be self-set" ($job.company -eq "Smoke Co" -and -not $job.featured) "company=$($job.company) featured=$($job.featured)"
$ok = WaitFor { @((Call GET "/api/notifications" $candToken).Body.data | Where-Object { $_.type -eq "JOB_ALERT" -and $_.referenceId -eq $jobId }).Count -eq 1 }
Check "matching job alert notifies the candidate (job.alert-matched event)" $ok
$r = Call PATCH "/api/saved-searches/$alertId" $candToken @{ alertsEnabled = $false }
Check "candidate pauses the alert" ($r.Status -eq 200 -and $r.Body.data.alertsEnabled -eq $false)
$r = Call PATCH "/api/saved-searches/$alertId" $otherToken @{ alertsEnabled = $true }
Check "another candidate's alert is not found" ($r.Status -eq 404) "status=$($r.Status)"
$r = Call GET "/api/admin/jobs" $recToken; Check "recruiter's jobs (/api/admin/jobs routed to job-service)" (@($r.Body.data | Where-Object { $_.id -eq $jobId }).Count -eq 1)
$r = Call POST "/api/saved-jobs/$jobId" $candToken; Check "candidate saves job" ($r.Status -eq 200)

Write-Host "`n[application-service + ai-service]"
$r = Call POST "/api/applications/jobs/$jobId`?coverLetter=Hello" $candToken
Check "candidate applies" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$appId = $r.Body.data.id
Check "match score computed by ai-service" ($r.Body.data.matchScore -gt 0) "score=$($r.Body.data.matchScore)"
$r = Call POST "/api/applications/jobs/$jobId" $candToken; Check "duplicate application rejected" ($r.Status -eq 400)
$r = Call GET "/api/jobs/$jobId" $candToken
Check "job shows applied/saved/applicantCount (job->application stats)" ($r.Body.data.applied -and $r.Body.data.saved -and $r.Body.data.applicantCount -eq 1)
Check "job shows match preview (job->ai)" ($null -ne $r.Body.data.matchPreview)
$r = Call GET "/api/admin/applicants?page=0&size=20" $recToken
Check "applicants are paged" ($r.Body.data.totalElements -eq 1 -and $r.Body.data.page -eq 0 -and $r.Body.data.size -eq 20)
$applicant = @($r.Body.data.content | Where-Object { $_.id -eq $appId })[0]
Check "applicant masked until viewed" ($applicant.userName -like "Candidate #*" -and $null -eq $applicant.userEmail)
$r = Call GET "/api/admin/applicants?search=Smoke%20Candidate" $recToken
Check "masked applicant not findable by name" ($r.Body.data.totalElements -eq 0)
$r = Call GET "/api/applications/$appId" $recToken
Check "recruiter opens application (application->auth, ->job, ->ai)" ($r.Status -eq 200 -and $r.Body.data.userEmail -eq $candEmail -and $r.Body.data.jobLocation -eq "Hyderabad")
$r = Call GET "/api/admin/applicants" $recToken
Check "applicant revealed after viewing" (@($r.Body.data.content | Where-Object { $_.id -eq $appId })[0].userName -eq "Smoke Candidate")
$r = Call GET "/api/admin/applicants?search=smoke%20cand" $recToken
Check "unlocked applicant searchable by name (application->auth search)" ($r.Body.data.totalElements -eq 1)
Check "recruiter with an application can download the resume" ((Download $resumeUrl $recToken) -eq 200)
$r = Call PATCH "/api/applications/$appId/status" $recToken @{ status = "HIRED" }; Check "cannot hire straight from pending" ($r.Status -eq 400)
$r = Call PATCH "/api/applications/$appId/status" $recToken @{ status = "SHORTLISTED" }; Check "recruiter shortlists" ($r.Body.data.status -eq "SHORTLISTED")
$r = Call PATCH "/api/applications/$appId/status" $recToken @{ status = "INTERVIEW_SCHEDULED" }; Check "interview status only via scheduling" ($r.Status -eq 400)
$r = Call POST "/api/applications/interviews" $recToken @{ applicationId = $appId; scheduledAt = (Get-Date).AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss"); location = "Zoom" }
Check "interview in the past rejected" ($r.Status -eq 400)
$r = Call POST "/api/applications/interviews" $recToken @{ applicationId = $appId; scheduledAt = (Get-Date).AddDays(3).ToString("yyyy-MM-ddTHH:mm:ss"); location = "Zoom" }
Check "recruiter schedules interview" ($r.Status -eq 200)
$r = Call POST "/api/applications/interviews" $recToken @{ applicationId = $appId; scheduledAt = (Get-Date).AddDays(4).ToString("yyyy-MM-ddTHH:mm:ss"); location = "Office" }
Check "recruiter reschedules interview" ($r.Status -eq 200)
$r = Call GET "/api/applications/interviews/me" $candToken
$scheduled = @($r.Body.data | Where-Object { $_.applicationId -eq $appId -and $_.status -eq "SCHEDULED" })
Check "candidate sees exactly one scheduled interview" ($scheduled.Count -eq 1 -and $scheduled[0].location -eq "Office") "count=$($scheduled.Count)"
$r = Call PATCH "/api/applications/$appId/status" $recToken @{ status = "PENDING" }; Check "cannot move an interview back to pending" ($r.Status -eq 400)

$r = Call POST "/api/applications/jobs/$jobId" $otherToken
Check "second candidate applies" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$otherAppId = $r.Body.data.id
$r = Call DELETE "/api/applications/$otherAppId" $candToken; Check "candidate cannot withdraw someone else's application" ($r.Status -eq 404)
$r = Call DELETE "/api/applications/$otherAppId" $otherToken; Check "second candidate withdraws" ($r.Status -eq 200)
$ok = WaitFor { @((Call GET "/api/notifications" $recToken).Body.data | Where-Object { $_.type -eq "APPLICATION_WITHDRAWN" -and $_.referenceId -eq $otherAppId }).Count -eq 1 }
Check "recruiter told about the withdrawal (application.withdrawn event)" $ok
$r = Call GET "/api/jobs/$jobId"; Check "withdrawn applications are not counted" ($r.Body.data.applicantCount -eq 1) "count=$($r.Body.data.applicantCount)"
$r = Call POST "/api/applications/jobs/$jobId" $otherToken; Check "withdrawn candidate may re-apply once" ($r.Status -eq 200)
$null = Call DELETE "/api/applications/$otherAppId" $otherToken
$r = Call POST "/api/applications/jobs/$jobId" $otherToken; Check "second re-apply is refused" ($r.Status -eq 400)
$r = Call GET "/api/admin/dashboard" $recToken
Check "dashboard combines job + application data" ($r.Body.data.totalJobs -ge 1 -and $r.Body.data.totalApplications -ge 1)
$r = Call GET "/api/admin/analytics/applications?period=week" $recToken; Check "analytics" ($r.Body.data.total -ge 1)

Write-Host "`n[messaging-service]"
$candidateId = $cand.user.id; $recruiterId = $rec.user.id
$r = Call POST "/api/messages" $candToken @{ receiverId = $recruiterId; content = "hi" }; Check "candidate cannot start chat" ($r.Status -eq 400)
$r = Call POST "/api/messages" $recToken @{ receiverId = $candidateId; content = "Hello from smoke test" }; Check "recruiter messages candidate" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$r = Call GET "/api/messages/contacts" $candToken
$contact = @($r.Body.data | Where-Object { $_.id -eq $recruiterId })[0]
Check "candidate contact list (messaging->auth batch)" ($contact.canReply -and $contact.unreadCount -eq 1 -and $contact.companyName -eq "Smoke Co")
$r = Call GET "/api/messages/conversation/$recruiterId" $candToken; Check "conversation" (@($r.Body.data).Count -eq 1)
$r = Call GET "/api/messages/unread-count" $candToken; Check "conversation marks read" ($r.Body.data.count -eq 0)
$r = Call POST "/api/messages" $candToken @{ receiverId = $recruiterId; content = "Thanks!" }; Check "candidate replies" ($r.Status -eq 200)

Write-Host "`n[notification-service via RabbitMQ events]"
$expected = "APPLICATION_SUBMITTED", "STATUS_UPDATE", "INTERVIEW_SCHEDULED", "NEW_MESSAGE", "JOB_ALERT"
$ok = WaitFor { $types = @((Call GET "/api/notifications" $candToken).Body.data | ForEach-Object { $_.type }); @($expected | Where-Object { $types -notcontains $_ }).Count -eq 0 }
Check "candidate notified: $($expected -join ', ')" $ok
$ok = WaitFor { $types = @((Call GET "/api/notifications" $recToken).Body.data | ForEach-Object { $_.type }); ($types -contains "JOB_POSTED") -and ($types -contains "NEW_APPLICATION") }
Check "recruiter notified: JOB_POSTED, NEW_APPLICATION" $ok
$r = Call PATCH "/api/notifications/read-all" $candToken; Check "mark all read" ($r.Status -eq 200)

Write-Host "`n[event-driven data sync]"
$r = Call PUT "/api/jobs/$jobId" $recToken @{ title = "Renamed Smoke Role $stamp"; description = "Build services"; location = "Hyderabad"; jobType = "FULL_TIME"; category = "Engineering"; skills = "Java, Spring" }
Check "recruiter renames job" ($r.Status -eq 200)
$ok = WaitFor { @((Call GET "/api/applications/me" $candToken).Body.data | Where-Object { $_.id -eq $appId })[0].jobTitle -like "Renamed*" }
Check "job.updated refreshes application copy" $ok
$r = Call PUT "/api/users/me" $recToken @{ fullName = "Renamed Recruiter" }; Check "recruiter renames profile" ($r.Status -eq 200)
$ok = WaitFor { (Call GET "/api/jobs/$jobId").Body.data.createdByName -eq "Renamed Recruiter" }
Check "account.recruiter-updated refreshes job snapshot" $ok
$r = Call POST "/api/auth/forgot-password" $null @{ email = $candEmail }
Check "forgot password accepted (OTP sent via event; 429 if re-run within 15 min)" ($r.Status -eq 200 -or $r.Status -eq 429) "status=$($r.Status)"

Write-Host "`n[session revocation + rate limits]"
$r = Call PUT "/api/users/me/password" $otherToken @{ currentPassword = $password; newPassword = "short" }
Check "password shorter than 8 rejected" ($r.Status -eq 400)
$newPassword = "N3w-Passw0rd!"
$r = Call PUT "/api/users/me/password" $otherToken @{ currentPassword = $password; newPassword = $newPassword }
Check "password change returns a fresh token" ($r.Status -eq 200 -and $r.Body.data.token) "status=$($r.Status) $($r.Body.message)"
$oldOtherToken = $otherToken; $otherToken = $r.Body.data.token; $password2 = $newPassword
$ok = WaitFor { (Call GET "/api/users/me" $oldOtherToken).Status -eq 401 } 45
Check "old token revoked by the gateway after a password change" $ok
$r = Call GET "/api/users/me" $otherToken; Check "new token keeps working" ($r.Status -eq 200)
$limited = $null
for ($i = 0; $i -lt 7 -and -not $limited; $i++) {
    $r = Call POST "/api/auth/forgot-password" $null @{ email = "nobody.$stamp.$i@example.com" }
    if ($r.Status -eq 429) { $limited = $r }
}
Check "forgot-password is rate limited per IP (429 + Retry-After)" ($null -ne $limited -and [int]$limited.Headers["Retry-After"] -gt 0)

Write-Host "`n[job deletion]"
$r = Call DELETE "/api/jobs/$jobId" $recToken; Check "recruiter deletes job" ($r.Status -eq 200)
$ok = WaitFor { @((Call GET "/api/applications/me" $candToken).Body.data | Where-Object { $_.id -eq $appId })[0].status -eq "JOB_REMOVED" }
Check "job.deleted keeps the candidate's application as JOB_REMOVED" $ok
$ok = WaitFor { @((Call GET "/api/notifications" $candToken).Body.data | Where-Object { $_.message -like "*was removed by the recruiter*" }).Count -eq 1 }
Check "candidate told the job was removed" $ok
$r = Call GET "/api/admin/applicants" $recToken; Check "recruiter no longer sees it" ($r.Body.data.totalElements -eq 0)

Write-Host "`n[account deletion]"
$r = Call DELETE "/api/users/me" $candToken @{ password = "wrong-password" }; Check "wrong password refuses deletion" ($r.Status -eq 400)
$r = Call DELETE "/api/users/me" $candToken @{ password = $password }; Check "candidate deletes account" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$r = Call POST "/api/auth/login" $null @{ email = $candEmail; password = $password }; Check "deleted account cannot log in" ($r.Status -eq 400)
$ok = WaitFor { @((Call GET "/api/messages/contacts" $recToken).Body.data | Where-Object { $_.id -eq $candidateId }).Count -eq 0 }
Check "account.deleted erases the conversation (messaging-service)" $ok
Check "deleted candidate's resume is gone" ((Download $resumeUrl $recToken) -eq 404)
$r = Call DELETE "/api/users/me" $otherToken @{ password = $password2 }; Check "locked account can still delete itself" ($r.Status -eq 200) "status=$($r.Status) $($r.Body.message)"
$r = Call DELETE "/api/users/me" $recToken @{ password = $password }; Check "recruiter deletes account" ($r.Status -eq 200)

Write-Host ""
if ($script:failures -eq 0) { Write-Host "All smoke checks passed." -ForegroundColor Green; exit 0 }
Write-Host "$($script:failures) smoke check(s) failed." -ForegroundColor Red; exit 1
