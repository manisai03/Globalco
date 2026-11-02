# Job Board — AI-Powered Recruitment Platform

A full-stack recruitment platform: Naukri/LinkedIn-style job search, Easy Apply, AI match scoring, recruiter dashboards, and real-time chat.
The backend is a **Spring Boot microservices** system: API gateway, Eureka, six domain services, database per service, RabbitMQ events.

Built for the Globalco Software Engineer assessment with [Cursor AI](https://cursor.com).

## Live

| Service | URL |
|---------|-----|
| **GitHub** | https://github.com/manisai03/Globalco |
| **Backend API** | https://globalco-job-board-api-vpee.onrender.com |
| **Frontend** | Deploy on Vercel — see [DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Health** | https://globalco-job-board-api-vpee.onrender.com/api/public/health |

> The Render URL above still serves the earlier single-app build until the microservices are deployed with
> `render.yaml` (see [DEPLOYMENT.md](docs/DEPLOYMENT.md)); the API contract is identical.

## Quick start

**Backend** (JDK 21+, MySQL, Docker for RabbitMQ):

```powershell
cd backend
.\mvnw.cmd -B install -DskipTests
docker run -d --name jobboard-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management
.\scripts\run-local.ps1 -DbPassword <mysql-root-password>
.\scripts\smoke-test.ps1        # optional: 67 end-to-end checks
```

Or everything in Docker: `cd backend && docker compose up -d --build`.

**Frontend** (Node 20+):

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:8090
npm install && npm run dev
```

- API gateway: `http://localhost:8090` · Eureka: `http://localhost:8761` · RabbitMQ UI: `http://localhost:15672`
- App: `http://localhost:5173`

Details: [docs/microservices/RUNNING.md](docs/microservices/RUNNING.md)

## What you can do

| Role | Highlights |
|------|------------|
| **Candidate** | Search & filter jobs (URL-synced), Easy Apply, save jobs, job alerts, AI match score, Naukri-style profile, track applications & interviews, chat |
| **Recruiter** | Post/manage jobs, AI job descriptions, review applicants by match score, privacy-masked pipeline, analytics, company pages, chat |

**Full journeys:** [docs/WORKFLOWS.md](docs/WORKFLOWS.md)

## Tech stack

React 19 · Vite · Tailwind 4 · shadcn/ui · Spring Boot 3.3 · Spring Cloud Gateway · Eureka · OpenFeign · RabbitMQ · JWT · MySQL · Cloudinary · Brevo · WebSocket · Docker · GitHub Actions · Vercel + Render

## Documentation

| Doc | Purpose |
|-----|---------|
| **[WORKFLOWS.md](docs/WORKFLOWS.md)** | **End-to-end workflows** — candidate & recruiter journeys |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & diagrams |
| [microservices/](docs/microservices/README.md) | Services, events, running locally, design decisions |
| [FEATURES.md](docs/FEATURES.md) | Complete feature list (40+) |
| [API.md](docs/API.md) | REST API reference |
| [AI_USAGE.md](docs/AI_USAGE.md) | How Cursor AI built the project |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deploy (Render + Vercel) |
| [SUBMISSION.md](docs/SUBMISSION.md) | Assessment submission checklist & links |

## Project layout

```
job-board-platform/
├── frontend/          # React SPA (Vercel)
├── backend/          # Spring Boot microservices (Maven multi-module)
│   ├── common/          shared DTOs, security, Feign clients, events
│   ├── api-gateway/     discovery-server/
│   ├── auth-service/    job-service/    application-service/
│   ├── messaging-service/    notification-service/    ai-service/
│   ├── docker-compose.yml, Dockerfile
│   └── scripts/         run-local, stop-local, smoke-test, data migration
├── docs/              # Documentation
├── render.yaml        # Render Blueprint for the services
└── .github/workflows/ # CI/CD
```

## Assessment submission

Copy links from [docs/SUBMISSION.md](docs/SUBMISSION.md) — includes GitHub, live demo, backend API, CI/CD, and AI documentation URLs.
