# Globalco Assessment — Submission Package

## Assessment Tasks Completed

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Build job board with AI tool (UX + features) | ✅ Done | Full-stack app with 40+ features — see [FEATURES.md](FEATURES.md) |
| 2 | Push code to GitHub | ⏳ Ready | Repo initialized; follow [GitHub Setup](#github-setup) below |
| 3 | CI/CD pipeline on GitHub (AI-assisted) | ✅ Done | [.github/workflows/ci.yml](../.github/workflows/ci.yml), [deploy.yml](../.github/workflows/deploy.yml) |
| 4 | Deploy to Vercel via CI/CD | ⏳ Ready | Vercel config + deploy workflow — follow [Deploy Setup](#deploy-setup) |
| 5 | AI-written documentation | ✅ Done | `docs/` folder (5 guides) |
| 6 | Submit final links | ⏳ Pending | Fill in [Final Links](#final-links-to-submit) |

---

## Final Links to Submit

Replace placeholders after deployment:

| Item | Link |
|------|------|
| **Live App (Vercel)** | `https://________________.vercel.app` |
| **Backend API (Render)** | `https://________________.onrender.com` |
| **GitHub Repository** | `https://github.com/________________/globalco-job-board` |
| **CI Workflow** | `https://github.com/________________/globalco-job-board/actions/workflows/ci.yml` |
| **Deploy Workflow** | `https://github.com/________________/globalco-job-board/actions/workflows/deploy.yml` |

---

## GitHub Setup

```bash
cd job-board-platform
git init
git add .
git commit -m "feat: Globalco AI-powered job board — assessment submission"
git branch -M main

# Create repo on GitHub (github.com → New repository → globalco-job-board)
git remote add origin https://github.com/YOUR_USERNAME/globalco-job-board.git
git push -u origin main
```

> **Never commit** `backend/mail-local.yml` or `backend/cloudinary-local.yml` (already in `.gitignore`).

---

## Deploy Setup

### Step 1 — MySQL Database

1. Create MySQL on [Railway](https://railway.app) or [Aiven](https://aiven.io)
2. Optionally run `database/schema.sql`
3. Save `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`

### Step 2 — Backend on Render

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect GitHub repo
2. Or use `render.yaml` at repo root
3. Set environment variables:

| Variable | Example |
|----------|---------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | `jdbc:mysql://host:3306/jobboard` |
| `DATABASE_USERNAME` | your user |
| `DATABASE_PASSWORD` | your password |
| `JWT_SECRET` | long random string |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |

4. Render → Service → **Settings** → **Deploy Hook** → copy URL

### Step 3 — Frontend on Vercel

1. [Vercel](https://vercel.com) → **Add New Project** → import GitHub repo
2. **Root Directory**: `frontend`
3. **Framework**: Vite
4. Environment variable: `VITE_API_URL` = your Render backend URL (e.g. `https://globalco-job-board-api.onrender.com`)

### Step 4 — GitHub Secrets (for CI/CD auto-deploy)

Go to **GitHub repo → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|-----------------|
| `RENDER_DEPLOY_HOOK` | Render deploy hook URL |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel project settings (`.vercel/project.json` after `vercel link`) |
| `VERCEL_PROJECT_ID` | Same as above |
| `VITE_API_URL` | Your Render backend URL |

After secrets are set, every push to `main` triggers:
- **CI** — build & test backend + frontend
- **Deploy** — Render backend + Vercel frontend

---

## AI Tool Used

**Cursor AI** — used for architecture, full-stack implementation, CI/CD workflows, and documentation. See [AI_USAGE.md](AI_USAGE.md).

---

## Demo Accounts (after deploy)

| Role | Email | Password |
|------|-------|----------|
| Admin / Recruiter | `admin@globalco.com` | `admin123` |
| Candidate | `candidate@globalco.com` | `user123` |

---

## Feature Highlights for Reviewers

1. **Naukri-style candidate profile** — education, internships, employment, skills, resume
2. **Profile pictures** — Cloudinary upload for candidates and recruiters
3. **Real-time chat** — WebSocket messaging between recruiter and candidate
4. **Forgot password** — OTP via email (Brevo SMTP)
5. **AI job description generator** — admin dashboard
6. **AI resume match score** — on job application
7. **Recruiter isolation** — each admin sees only their own jobs/applicants
8. **Analytics dashboard** — donut charts, applicant pipeline
9. **Dark mode**, responsive UI, form validations
10. **GitHub Actions CI/CD** → Vercel + Render
