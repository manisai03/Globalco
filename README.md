# Job Board — AI-Powered Recruitment Platform

A full-stack recruitment platform: Naukri/LinkedIn-style job search, Easy Apply, AI match scoring, recruiter dashboards, and real-time chat.

Built for the Globalco Software Engineer assessment with [Cursor AI](https://cursor.com).

## Live

| Service | URL |
|---------|-----|
| **GitHub** | https://github.com/manisai03/Globalco |
| **Backend API** | https://globalco-job-board-api-vpee.onrender.com |
| **Frontend** | Deploy on Vercel — see [DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Health** | https://globalco-job-board-api-vpee.onrender.com/api/public/health |

## Quick start

**Backend** (Java 21, MySQL):

```bash
cd backend
# Optional: mysql-local.yml, mail-local.yml
mvn spring-boot:run
```

**Frontend** (Node 20+):

```bash
cd frontend
cp .env.example .env
npm install && npm run dev
```

- API: `http://localhost:8080`
- App: `http://localhost:5173`

## What you can do

| Role | Highlights |
|------|------------|
| **Candidate** | Search & filter jobs (URL-synced), Easy Apply, save jobs, job alerts, AI match score, Naukri-style profile, track applications & interviews, chat |
| **Recruiter** | Post/manage jobs, AI job descriptions, review applicants by match score, privacy-masked pipeline, analytics, company pages, chat |

**Full journeys:** [docs/WORKFLOWS.md](docs/WORKFLOWS.md)

## Tech stack

React 19 · Vite · Tailwind 4 · Spring Boot 3.3 · JWT · MySQL · Cloudinary · Brevo · WebSocket · GitHub Actions · Vercel + Render

## Documentation

| Doc | Purpose |
|-----|---------|
| **[WORKFLOWS.md](docs/WORKFLOWS.md)** | **End-to-end workflows** — candidate & recruiter journeys |
| [FEATURES.md](docs/FEATURES.md) | Complete feature list (40+) |
| [API.md](docs/API.md) | REST API reference |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & diagrams |
| [AI_USAGE.md](docs/AI_USAGE.md) | How Cursor AI built the project |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deploy (Render + Vercel) |
| [SUBMISSION.md](docs/SUBMISSION.md) | Assessment submission checklist & links |

## Project layout

```
job-board-platform/
├── frontend/          # React SPA (Vercel)
├── backend/           # Spring Boot API (Render)
├── docs/              # AI-generated documentation
├── database/          # SQL schema reference
└── .github/workflows/ # CI/CD
```

## Assessment submission

Copy links from [docs/SUBMISSION.md](docs/SUBMISSION.md) — includes GitHub, live demo, backend API, CI/CD, and AI documentation URLs.
