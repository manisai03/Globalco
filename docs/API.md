# API Documentation

**Base URL (dev):** `http://localhost:8090` (API gateway)  
**Base URL (prod):** the deployed gateway URL (see [DEPLOYMENT.md](DEPLOYMENT.md))  
Every endpoint below is served through the gateway, which routes it to the owning service; see
[microservices/SERVICES.md](microservices/SERVICES.md#gateway-routes).

All protected endpoints require: `Authorization: Bearer <token>`

**Response format:**
```json
{
  "success": true,
  "message": "optional message",
  "data": { }
}
```

**Workflow context:** See [WORKFLOWS.md](WORKFLOWS.md) for when each endpoint is called.

**Interactive docs:** `http://localhost:8090/swagger-ui.html` serves the generated OpenAPI spec of every service
(raw specs at `/v3/api-docs/<service-name>`). Every response has an `X-Request-Id` header; send your own (letters,
digits, `.`, `_`, `-`, up to 64 characters) to correlate a call across services.

---

## Authentication

### POST /api/auth/register
```json
{
  "accountType": "CANDIDATE",
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "+91...",
  "location": "Hyderabad"
}
```

Registering with an email that already has an account returns the same success response as a new signup (the
account is not changed, and its owner gets an email instead), so the endpoint can't be used to find out who has an
account. Validation errors are still `400`.

Recruiter registration — add:
```json
{
  "accountType": "RECRUITER",
  "companyName": "XPO",
  "recruiterTitle": "Talent Acquisition Manager",
  "companyWebsite": "https://xpo.com",
  "companyDescription": "Optional"
}
```

### POST /api/auth/login
```json
{ "email": "user@example.com", "password": "password123" }
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": 1, "email": "...", "role": "ROLE_USER" }
  }
}
```

A wrong password returns `400`. After 5 wrong passwords for the same email within 15 minutes, login returns `429`
with a `Retry-After` header (seconds) for 15 minutes, even with the right password. A password reset lifts the lock.

### POST /api/auth/forgot-password
```json
{ "email": "user@example.com" }
```
Sends 6-digit OTP (10-minute expiry) via Brevo. Always returns success, whether or not the email is registered. A new OTP is sent at most once per minute per email.

### POST /api/auth/reset-password
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```
After 5 incorrect attempts, the OTP is invalidated and a new one must be requested. A successful reset signs the
account out everywhere (existing tokens stop working within 30 seconds).

Passwords must be 8–72 characters.

### Rate limits (gateway)

Per client IP. Over the limit the gateway answers `429` with a `Retry-After` header (seconds) and
`{ "success": false, "message": "Too many requests. Please wait a moment and try again." }`.

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/register` | 20 per hour |
| `POST /api/auth/login` | 30 per minute |
| `POST /api/auth/forgot-password` | 5 per 15 minutes |
| `POST /api/auth/reset-password` | 10 per 15 minutes |
| `POST /api/messages/ws-ticket` | 30 per minute |
| `POST /api/messages` | 60 per minute |
| `POST /api/applications/**` | 30 per minute |

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | ✓ | Get current profile |
| PUT | `/api/users/me` | ✓ | Update profile |
| POST | `/api/users/me/resume` | ✓ | Upload resume (multipart, `.pdf`/`.doc`/`.docx`, max 10 MB). The content must match the extension, otherwise `400` |
| POST | `/api/users/me/avatar` | ✓ | Upload avatar to Cloudinary |
| PUT | `/api/users/me/password` | ✓ | Change password. Returns `{ "token": "..." }`; every older token is revoked, so store the new one |
| DELETE | `/api/users/me` | ✓ | Delete own account. Body `{ "password": "..." }`. Erases the account's jobs, applications, messages, notifications and files in every service |

---

## Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | - | List/search jobs (paginated) |
| GET | `/api/jobs/featured` | - | Featured jobs |
| GET | `/api/jobs/recommended` | - | Skill-based recommendations |
| GET | `/api/jobs/categories` | - | Category list |
| GET | `/api/jobs/{id}` | - | Job details |
| GET | `/api/jobs/{id}/similar` | - | Similar jobs by category |
| POST | `/api/jobs` | Admin | Create job |
| PUT | `/api/jobs/{id}` | Admin | Update job |
| DELETE | `/api/jobs/{id}` | Admin | Delete job |
| PATCH | `/api/jobs/{id}/close` | Admin | Close posting |
| PATCH | `/api/jobs/{id}/reopen` | Admin | Reopen posting |

### Query parameters (GET /api/jobs)
`search`, `location`, `jobType`, `experienceLevel`, `category`, `minSalary`, `maxSalary`, `postedWithin`
(`today`, `3days`, `week`), `sort` (`recent`, `salary_asc`, `salary_desc`, `title`), `page` (default 0), `size`
(default 12, max 50). Only open jobs are listed.

### POST/PUT /api/jobs
The company always comes from the recruiter's profile (a `company` field in the body is ignored), and recruiters can't
set `featured`. `salaryMin` must not exceed `salaryMax` (`400` otherwise).

---

## Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/applications/jobs/{jobId}` | ✓ | Apply (multipart: coverLetter, resume) |
| GET | `/api/applications/me` | ✓ | My applications |
| GET | `/api/applications/interviews/me` | ✓ | My scheduled interviews |
| GET | `/api/applications/{id}` | ✓ | Application detail (+ match breakdown) |
| DELETE | `/api/applications/{id}` | ✓ | Withdraw application |
| PATCH | `/api/applications/{id}/status` | Admin | Update status |
| POST | `/api/applications/interviews` | Admin | Schedule interview |

**Status values:** `PENDING`, `SHORTLISTED`, `REJECTED`, `INTERVIEW_SCHEDULED`, `HIRED`, `WITHDRAWN`, `JOB_REMOVED`

Recruiters may only make these status changes (anything else is `400`):

| From | To |
|------|----|
| `PENDING` | `SHORTLISTED`, `REJECTED` |
| `SHORTLISTED` | `REJECTED`, `HIRED` |
| `INTERVIEW_SCHEDULED` | `SHORTLISTED`, `REJECTED`, `HIRED` |
| `REJECTED` | `SHORTLISTED` |

`INTERVIEW_SCHEDULED` is set only by scheduling an interview. `HIRED`, `WITHDRAWN` and `JOB_REMOVED` are final;
rejecting or hiring cancels any scheduled interview. Candidates can withdraw while the status is `PENDING`,
`SHORTLISTED`, or `INTERVIEW_SCHEDULED` (the recruiter is notified). Applying again after withdrawing reopens the same
application as `PENDING`; this is allowed once per job. Withdrawn applications aren't counted in recruiter analytics.

### PATCH /api/applications/{id}/status
```json
{ "status": "SHORTLISTED" }
```

### POST /api/applications/interviews
```json
{
  "applicationId": 1,
  "scheduledAt": "2026-06-15T10:00:00",
  "location": "Hyderabad / Video call",
  "notes": "Optional"
}
```
`scheduledAt` must be in the future. Scheduling again (rescheduling) cancels the previous interview, so an application
has at most one scheduled interview.

---

## Saved searches (job alerts)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saved-searches` | ✓ | List with live match counts |
| POST | `/api/saved-searches` | ✓ | Save filter set as alert (same filters as `GET /api/jobs`, including `postedWithin`) |
| PATCH | `/api/saved-searches/{id}` | ✓ | Pause or resume the alert. Body `{ "alertsEnabled": false }` |
| DELETE | `/api/saved-searches/{id}` | ✓ | Remove saved search |

When a new job is posted, every candidate with an active saved search that matches it gets a `JOB_ALERT`
notification linking to the job. Another candidate's saved search answers `404`.

---

## Companies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/companies/{adminId}` | - | Company profile + open jobs |

---

## Saved jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saved-jobs` | ✓ | List saved jobs |
| POST | `/api/saved-jobs/{jobId}` | ✓ | Save job |
| DELETE | `/api/saved-jobs/{jobId}` | ✓ | Unsave job |

---

## Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/messages` | ✓ | Send message |
| GET | `/api/messages/conversation/{partnerId}` | ✓ | Conversation history |
| GET | `/api/messages/partners` | ✓ | Contact list (alias: `/contacts`) |
| GET | `/api/messages/unread-count` | ✓ | Total unread messages |

### POST /api/messages
```json
{
  "receiverId": 2,
  "content": "Hello, we'd like to discuss your application."
}
```

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | ✓ | List notifications |
| GET | `/api/notifications/unread-count` | ✓ | Unread count |
| PATCH | `/api/notifications/{id}/read` | ✓ | Mark one read |
| PATCH | `/api/notifications/read-all` | ✓ | Mark all read |
| DELETE | `/api/notifications/{id}` | ✓ | Delete notification |

---

## Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Dashboard analytics |
| GET | `/api/admin/applicants` | Admin | Paged applicants, newest first (masked until viewed). `?page=0&size=20` (max 100), `search` (job title, or name/email of unlocked candidates), `jobId`. Returns `{ content, page, size, totalElements, totalPages }` |
| GET | `/api/admin/jobs` | Admin | Recruiter's jobs |
| GET | `/api/admin/analytics/applications` | Admin | Status analytics (`?period=week\|month\|year`) |

---

## AI

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/generate-job-description` | Admin | Generate job description |

```json
{
  "jobTitle": "Java Developer",
  "skills": "Java, Spring Boot, React",
  "location": "Hyderabad",
  "experienceLevel": "Mid-Level"
}
```

The company always comes from the recruiter's profile; location falls back to the profile if omitted.

---

## Files

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/files/{subfolder}/{filename}` | ✓ | Download uploads. A resume is served only to its owner or to a recruiter who has opened an application from that candidate; anyone else gets `404`. Always sent as a download (`Content-Disposition: attachment`, `nosniff`, sandboxing CSP) |

---

## Public

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/public/health` | - | Health check (`{"status":"UP"}`) |
| GET | `/api/public/stats` | - | Platform statistics |

---

## WebSocket

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/messages/ws-ticket` | JWT (header) | Returns `{ "ticket": "..." }`: single use, valid 30 seconds |
| `ws://<host>/ws/chat?ticket=<ticket>` | Ticket in query | Real-time chat delivery |

Browsers can't set headers on a WebSocket handshake, so the client fetches a fresh ticket before every connect; the
JWT never goes in the URL. A missing, reused or expired ticket is refused. When the JWT the ticket was issued for
expires, the server closes the socket with code `4001`. Deleting the account closes it with `1008`.

On new message, server pushes `{ type: "NEW_MESSAGE", data: MessageResponse }`.

---

## Error responses

```json
{
  "success": false,
  "message": "Human-readable error",
  "data": null
}
```

Common HTTP codes: `400` validation, `401` unauthorized, `403` forbidden, `404` not found, `429` too many requests
(see rate limits) or login attempts, `503` a downstream service is unavailable, `500` server error.
