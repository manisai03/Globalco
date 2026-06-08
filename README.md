# Globalco Jobs — AI-Powered Job Board

A full-stack recruitment platform: Naukri/LinkedIn-style job search, Easy Apply, AI match scoring, recruiter dashboards, and real-time chat.

## Live

| Service | URL |
|---------|-----|
| **Backend API** | https://globalco-job-board-api-vpee.onrender.com |
| **Frontend** | Deploy to Vercel — see [DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Repository** | https://github.com/manisai03/Globalco |

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
| **Candidate** | Search & filter jobs (URL-synced), Easy Apply, save jobs, AI match score, Naukri-style profile, track applications, chat |
| **Recruiter** | Post/manage jobs, AI job descriptions, review applicants by match score, schedule interviews, analytics |

## Tech stack

React 19 · Vite · Tailwind 4 · Spring Boot 3.3 · JWT · MySQL · Cloudinary · Brevo · WebSocket · GitHub Actions · Vercel + Render

## Docs

| Doc | Purpose |
|-----|---------|
| [FEATURES.md](docs/FEATURES.md) | Feature list |
| [API.md](docs/API.md) | REST endpoints |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deploy |
| [SUBMISSION.md](docs/SUBMISSION.md) | Assessment checklist |
| [AI_USAGE.md](docs/AI_USAGE.md) | Cursor AI usage |

## Project layout

```
job-board-platform/
├── frontend/          # React SPA
├── backend/           # Spring Boot API
├── docs/
└── .github/workflows/ # CI/CD
```

Built for the Globalco Software Engineer assessment with [Cursor AI](https://cursor.com).
