# API Documentation

Base URL: `http://localhost:8080` (dev) or your Render URL (prod)

All protected endpoints require: `Authorization: Bearer <token>`

Response format:
```json
{
  "success": true,
  "message": "optional message",
  "data": { }
}
```

## Authentication

### POST /api/auth/register
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "+91...",
  "location": "Hyderabad"
}
```

### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
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

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | ✓ | Get profile |
| PUT | `/api/users/me` | ✓ | Update profile |
| POST | `/api/users/me/resume` | ✓ | Upload resume (multipart) |
| PUT | `/api/users/me/password` | ✓ | Change password |
| GET | `/api/users/{id}` | ✓ | Get user by ID |

## Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | - | List/search jobs (paginated) |
| GET | `/api/jobs/featured` | - | Featured jobs |
| GET | `/api/jobs/recommended` | - | Skill-based recommendations (better when logged in) |
| GET | `/api/jobs/categories` | - | Category list |
| GET | `/api/jobs/{id}/similar` | - | Similar jobs by category |
| GET | `/api/jobs/{id}` | - | Job details (includes recruiter company info) |
| POST | `/api/jobs` | Admin | Create job |
| PUT | `/api/jobs/{id}` | Admin | Update job |
| DELETE | `/api/jobs/{id}` | Admin | Delete job |
| PATCH | `/api/jobs/{id}/close` | Admin | Close posting |
| PATCH | `/api/jobs/{id}/reopen` | Admin | Reopen posting |

### Query Parameters (GET /api/jobs)
- `search`, `location`, `jobType`, `experienceLevel`, `category`
- `minSalary`, `maxSalary`, `status`, `sort`
- `page` (default 0), `size` (default 12)

## Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/applications/jobs/{jobId}` | ✓ | Apply (multipart) |
| GET | `/api/applications/me` | ✓ | My applications |
| GET | `/api/applications/interviews/me` | ✓ | My scheduled interviews |
| GET | `/api/applications/jobs/{jobId}` | Admin | Job applicants |
| PATCH | `/api/applications/{id}/status` | Admin | Update status |
| DELETE | `/api/applications/{id}` | ✓ | Withdraw |
| POST | `/api/applications/interviews` | Admin | Schedule interview |

Status values: `PENDING`, `SHORTLISTED`, `REJECTED`, `INTERVIEW_SCHEDULED`, `HIRED`, `WITHDRAWN`

## Saved Searches (Job Alerts)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saved-searches` | ✓ | List saved searches with match counts |
| POST | `/api/saved-searches` | ✓ | Save current filter set as alert |
| DELETE | `/api/saved-searches/{id}` | ✓ | Remove saved search |

## Companies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/companies/{adminId}` | - | Company profile + open jobs |

## Saved Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-jobs` | List saved jobs |
| POST | `/api/saved-jobs/{jobId}` | Save job |
| DELETE | `/api/saved-jobs/{jobId}` | Unsave job |

## Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send message |
| GET | `/api/messages/conversation/{partnerId}` | Get history |
| GET | `/api/messages/partners` | List partners |
| GET | `/api/messages/unread-count` | Unread count |

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/unread-count` | Unread count |
| PATCH | `/api/notifications/{id}/read` | Mark read |
| PATCH | `/api/notifications/read-all` | Mark all read |

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard analytics |
| GET | `/api/admin/applicants` | All applicants |

## AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-job-description` | Generate JD |

```json
{
  "jobTitle": "Backend Developer",
  "skills": "Java, Spring Boot, MySQL",
  "company": "Globalco",
  "location": "Hyderabad"
}
```

## Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/stats` | Platform statistics |
