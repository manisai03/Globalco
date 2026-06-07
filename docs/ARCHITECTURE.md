# Architecture

## System Overview

```mermaid
flowchart TB
    subgraph Client
        FE[React SPA - Vercel]
    end

    subgraph Backend
        API[Spring Boot API - Render]
        SEC[JWT Security Filter]
        SVC[Service Layer]
        JPA[Spring Data JPA]
    end

    subgraph Data
        DB[(MySQL - Railway/Aiven)]
        FS[File Storage /uploads]
    end

    FE -->|HTTPS REST| API
    API --> SEC --> SVC --> JPA --> DB
    SVC --> FS
```

## Backend Layers

```
controller/   → REST endpoints, validation
service/      → Business logic
repository/   → JPA data access
model/        → JPA entities
dto/          → Request/response objects
security/     → JWT, UserDetails
config/       → Security, CORS, data seeding
exception/    → Global error handling
```

## Frontend Layers

```
pages/        → Route-level views
components/   → Reusable UI (Navbar, JobCard, etc.)
context/      → Auth & Theme state
services/     → Axios API client
```

## Database ER Diagram

```mermaid
erDiagram
    ROLES ||--o{ USERS : has
    USERS ||--o{ JOBS : creates
    USERS ||--o{ APPLICATIONS : submits
    JOBS ||--o{ APPLICATIONS : receives
    USERS ||--o{ SAVED_JOBS : saves
    JOBS ||--o{ SAVED_JOBS : saved_in
    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ NOTIFICATIONS : receives
    APPLICATIONS ||--o{ INTERVIEWS : schedules

    ROLES {
        bigint id PK
        string name
    }
    USERS {
        bigint id PK
        string email
        string password
        string full_name
        bigint role_id FK
    }
    JOBS {
        bigint id PK
        string title
        string company
        text description
        bigint created_by FK
    }
    APPLICATIONS {
        bigint id PK
        bigint job_id FK
        bigint user_id FK
        string status
    }
```

## Authentication Flow

1. User logs in → `AuthService` validates credentials
2. `JwtService` generates signed token (HS256, 24h)
3. Frontend stores token in `localStorage`
4. Axios interceptor adds `Bearer` header
5. `JwtAuthenticationFilter` validates on each request
6. `@PreAuthorize` enforces role-based access

## Deployment Architecture

```mermaid
flowchart LR
    GH[GitHub Push] --> GHA[GitHub Actions]
    GHA -->|Build & Test| CI[CI Pipeline]
    GHA -->|Deploy| VER[Vercel Frontend]
    GHA -->|Deploy Hook| REN[Render Backend]
    REN --> MYSQL[(Railway MySQL)]
    VER -->|API Calls| REN
```
