# API Documentation

**Base URL (dev):** `http://localhost:8080`  
**Base URL (prod):** `https://globalco-job-board-api-vpee.onrender.com`

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

### POST /api/auth/forgot-password
```json
{ "email": "user@example.com" }
```
Sends 6-digit OTP (10-minute expiry) via Brevo.

### POST /api/auth/reset-password
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | ✓ | Get current profile |
| PUT | `/api/users/me` | ✓ | Update profile |
| POST | `/api/users/me/resume` | ✓ | Upload resume (multipart) |
| POST | `/api/users/me/avatar` | ✓ | Upload avatar to Cloudinary |
| PUT | `/api/users/me/password` | ✓ | Change password |
| GET | `/api/users/{id}` | ✓ | Get user by ID |

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
`search`, `location`, `jobType`, `experienceLevel`, `category`, `minSalary`, `maxSalary`, `status`, `sort`, `page` (default 0), `size` (default 12)

---

## Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/applications/jobs/{jobId}` | ✓ | Apply (multipart: coverLetter, resume) |
| GET | `/api/applications/me` | ✓ | My applications |
| GET | `/api/applications/interviews/me` | ✓ | My scheduled interviews |
| GET | `/api/applications/{id}` | ✓ | Application detail (+ match breakdown) |
| DELETE | `/api/applications/{id}` | ✓ | Withdraw application |
| GET | `/api/applications/jobs/{jobId}` | Admin | Applicants for a job |
| PATCH | `/api/applications/{id}/status` | Admin | Update status |
| POST | `/api/applications/interviews` | Admin | Schedule interview |

**Status values:** `PENDING`, `SHORTLISTED`, `REJECTED`, `INTERVIEW_SCHEDULED`, `HIRED`, `WITHDRAWN`

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

---

## Saved searches (job alerts)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saved-searches` | ✓ | List with live match counts |
| POST | `/api/saved-searches` | ✓ | Save filter set as alert |
| DELETE | `/api/saved-searches/{id}` | ✓ | Remove saved search |

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
| GET | `/api/admin/applicants` | Admin | All applicants (masked until viewed) |
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
  "company": "XPO",
  "location": "Hyderabad",
  "experienceLevel": "Mid-Level"
}
```

Company/location auto-enriched from recruiter profile if omitted.

---

## Files

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/files/{subfolder}/{filename}` | ✓ | Download resume/uploads |

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
| `ws://<host>/ws/chat?token=<JWT>` | JWT in query | Real-time chat delivery |

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

Common HTTP codes: `400` validation, `401` unauthorized, `403` forbidden, `404` not found, `500` server error.
