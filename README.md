# Globalco Jobs — AI-Powered Job Board & Recruitment Platform

A full-stack recruitment platform built for the **Globalco Software Engineer assessment** using **Cursor AI**, featuring JWT authentication, Naukri-style profiles, Cloudinary avatars, real-time WebSocket chat, AI job descriptions, analytics, and automated CI/CD deployment.

## Assessment Deliverables

| Task | Status | Link |
|------|--------|------|
| 1. Job board (UX + features) | ✅ Complete | Run locally or see live demo below |
| 2. GitHub repository | ⏳ Push required | See [Submission Guide](docs/SUBMISSION.md) |
| 3. CI/CD pipeline (GitHub Actions) | ✅ Complete | [ci.yml](.github/workflows/ci.yml) · [deploy.yml](.github/workflows/deploy.yml) |
| 4. Vercel deployment via CI/CD | ⏳ Configure secrets | [Deployment Guide](docs/DEPLOYMENT.md) |
| 5. AI documentation | ✅ Complete | [docs/](docs/) folder |
| 6. Final submission links | ⏳ Fill after deploy | [SUBMISSION.md](docs/SUBMISSION.md) |

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | _Add your Vercel URL after deploy_ |
| **Backend API (Render)** | _Add your Render URL after deploy_ |
| **GitHub Repository** | _Add your GitHub repo URL_ |
| **CI Pipeline** | _Add Actions URL after push_ |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin / Recruiter | `admin@globalco.com` | `admin123` |
| Candidate | `candidate@globalco.com` | `user123` |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Axios, React Router, Recharts |
| Backend | Java 21, Spring Boot 3.3, Spring Security, JWT, JPA, WebSocket |
| Database | MySQL (prod) / H2 in-memory (dev) |
| Media | Cloudinary (profile pictures) |
| Email | Brevo SMTP (password reset OTP) |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend) + Render (backend) |

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- Java 21+
- Maven 3.9+ (or use `mvnw`)

### Backend

```bash
cd backend
# Optional: configure email (Brevo) and Cloudinary
# copy mail-local.yml.example → mail-local.yml
# copy cloudinary-local.yml.example → cloudinary-local.yml
mvn spring-boot:run
```

API: `http://localhost:8080` · H2 console: `/h2-console`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

## Key Features

- **Auth** — Register, login, forgot password (email OTP), JWT, role-based access
- **Profiles** — Naukri-style sections, Cloudinary avatar, resume upload, validations
- **Jobs** — Search, filters, sort, save, share, styled descriptions
- **Applications** — Cover letter, resume box upload, AI match score, status tracking
- **Admin** — Job CRUD, applicant management, analytics charts, AI job generator
- **Chat** — Real-time WebSocket messaging with unread badges
- **Notifications** — Application updates, interviews, messages
- **UX** — Dark mode, responsive design, toast feedback, loading states

Full list: [docs/FEATURES.md](docs/FEATURES.md)

## Documentation

| Document | Description |
|----------|-------------|
| [FEATURES.md](docs/FEATURES.md) | Complete feature documentation |
| [API.md](docs/API.md) | REST API endpoints |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Vercel + Render |
| [AI_USAGE.md](docs/AI_USAGE.md) | How Cursor AI was used |
| [SUBMISSION.md](docs/SUBMISSION.md) | Assessment submission checklist |

## CI/CD

**CI** (every push/PR to `main`):
- Backend: Maven build + tests (JDK 21)
- Frontend: `npm ci` + `vite build`

**Deploy** (push to `main`):
- Backend → Render (deploy hook)
- Frontend → Vercel (CLI deploy)

Required GitHub Secrets: `RENDER_DEPLOY_HOOK`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_API_URL`

## Project Structure

```
job-board-platform/
├── frontend/              # React + Vite SPA
├── backend/               # Spring Boot REST API + WebSocket
├── database/              # MySQL schema
├── docs/                  # Assessment documentation
├── .github/workflows/     # CI/CD pipelines
└── render.yaml            # Render deployment blueprint
```

## AI Tool

Built with **[Cursor AI](https://cursor.com)** — architecture, implementation, CI/CD, and documentation. See [docs/AI_USAGE.md](docs/AI_USAGE.md).

## License

Built for Globalco assessment submission.
