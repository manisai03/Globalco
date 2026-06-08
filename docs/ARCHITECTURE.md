# Architecture

System design for the Job Board platform — React SPA, Spring Boot API, MySQL, deployed on Vercel + Render.

---

## System overview

```mermaid
flowchart TB
    subgraph Client["Client (Vercel)"]
        FE[React 19 SPA]
        WS[WebSocket Client]
    end

    subgraph Backend["Backend (Render)"]
        API[Spring Boot 3.3]
        SEC[JWT Filter]
        SVC[Service Layer]
        AI[AiService]
        CHAT[ChatSocketService]
    end

    subgraph External
        DB[(MySQL — Railway)]
        BREVO[Brevo Email API]
        CLD[Cloudinary]
    end

    FE -->|HTTPS REST| API
    WS -->|wss /ws/chat| CHAT
    API --> SEC --> SVC
    SVC --> AI
    SVC --> DB
    SVC --> BREVO
    SVC --> CLD
    CHAT --> SVC
```

---

## Backend layers

```
controller/     REST endpoints, @Valid, @PreAuthorize
service/        Business logic, transactions
repository/     Spring Data JPA
model/          JPA entities (User, Admin, Job, …)
dto/            Request/response objects
mapper/         Entity ↔ DTO conversion
security/       JWT, SecurityUtils, filters
config/         Security, CORS, schema migrations, data repair
websocket/      ChatWebSocketHandler, JWT handshake
util/           RecruiterCompanyUtils
exception/      GlobalExceptionHandler
```

---

## Frontend layers

```
pages/          Route-level views (Home, Jobs, Dashboard, Admin, …)
components/     Reusable UI (Navbar, JobCard, ChatPanel, …)
components/ui/  Design system (Pagination, EmptyState, Skeletons)
context/        AuthContext, ThemeContext
services/       Axios API client, WebSocket, auth storage
utils/          Formatters, recruiter company resolution, branding
```

---

## Database model (current)

Candidates and recruiters live in **separate tables**. Legacy `database/schema.sql` used a single `users` + `roles` model; runtime uses `users` + `admins` with Hibernate `ddl-auto: update` and `LegacySchemaMigration` for upgrades.

```mermaid
erDiagram
    ADMINS ||--o{ JOBS : posts
    USERS ||--o{ APPLICATIONS : submits
    JOBS ||--o{ APPLICATIONS : receives
    APPLICATIONS ||--o{ INTERVIEWS : has
    USERS ||--o{ SAVED_JOBS : bookmarks
    JOBS ||--o{ SAVED_JOBS : in
    USERS ||--o{ SAVED_SEARCHES : creates

    ADMINS {
        bigint id PK
        string email UK
        string password
        string full_name
        string company_name
        string recruiter_title
    }
    USERS {
        bigint id PK
        string email UK
        string password
        string skills
        string resume_url
        json education_profile
    }
    JOBS {
        bigint id PK
        bigint admin_id FK
        string title
        string company
        text description
        string status
    }
    APPLICATIONS {
        bigint id PK
        bigint job_id FK
        bigint user_id FK
        string status
        int match_score
        boolean recruiter_viewed
    }
    MESSAGES {
        bigint id PK
        string sender_type
        bigint sender_id
        string receiver_type
        bigint receiver_id
        text content
    }
    NOTIFICATIONS {
        bigint id PK
        string account_type
        bigint account_id
        string type
        text message
    }
```

**Polymorphic messaging:** `sender_type` / `receiver_type` are `ADMIN` or `USER` — no single FK to one account table.

---

## Authentication flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React SPA
    participant API as Spring Boot
    participant DB as MySQL

    U->>FE: Login (email, password)
    FE->>API: POST /api/auth/login
    API->>DB: Validate users or admins
    API-->>FE: JWT + user (role)
    FE->>FE: Store token in sessionStorage
    FE->>API: GET /api/users/me (Bearer token)
    API-->>FE: Profile data
    FE->>API: WebSocket /ws/chat?token=...
```

1. `AuthService` validates credentials against `users` or `admins`
2. `JwtService` signs token (HS256, 24h expiry)
3. Frontend stores token in **sessionStorage** (supports admin + candidate in separate tabs)
4. Axios interceptor adds `Authorization: Bearer <token>`
5. `JwtAuthenticationFilter` validates on each request
6. `@PreAuthorize("hasRole('ADMIN')")` enforces recruiter-only endpoints

---

## Security model

| Layer | Mechanism |
|-------|-----------|
| Transport | HTTPS (Vercel + Render) |
| Auth | Stateless JWT, BCrypt passwords |
| Authorization | Role-based — `ROLE_USER` vs `ROLE_ADMIN` |
| Privacy | Candidate PII masked until `recruiterViewed=true` |
| Messaging | Recruiter initiates; candidate replies only after first message |
| CORS | `CORS_ORIGINS` env var on backend |
| Files | Auth required for `/api/files/**`; resumes local, avatars Cloudinary |

Public endpoints: `/api/auth/**`, `/api/public/**`, `GET /api/jobs/**`, `GET /api/companies/**`, `/ws/**`

---

## Deployment architecture

```mermaid
flowchart LR
    DEV[Developer] -->|git push main| GH[GitHub]
    GH --> CI[CI Workflow]
    GH --> DEP[Deploy Workflow]
    CI -->|mvn test + npm build| PASS[Build Pass]
    DEP -->|curl hook| REN[Render Backend]
    DEP -->|vercel deploy| VER[Vercel Frontend]
    REN --> MYSQL[(Railway MySQL)]
    VER -->|VITE_API_URL| REN
```

| Component | Technology |
|-----------|------------|
| Frontend host | Vercel (Vite build, SPA rewrites) |
| Backend host | Render (Docker, `backend/Dockerfile`) |
| Database | Railway / Aiven MySQL 8 |
| Email | Brevo HTTP API |
| CI/CD | GitHub Actions |

---

## Startup & schema repair

On every backend boot:

| Runner | Purpose |
|--------|---------|
| `LegacySchemaMigration` (Order 0) | Migrate legacy schema; fix notifications/messages columns |
| `JobDataRepair` (Order 1) | Fix jobs with invalid `admin_id` |
| `CompanyDataRepair` (Order 2) | Clear legacy placeholder company names |

Hibernate `ddl-auto: update` adds new columns/tables automatically.

---

## Related documentation

- [WORKFLOWS.md](WORKFLOWS.md) — end-to-end user journeys
- [API.md](API.md) — REST endpoints
- [DEPLOYMENT.md](DEPLOYMENT.md) — production setup
