# Assessment Submission Package

Submission checklist for the Globalco Software Engineer assessment — AI-powered job board with CI/CD deployment.

---

## Assessment tasks

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Build job board with AI tool (UX + features) | Done | Full-stack app — [FEATURES.md](FEATURES.md), [WORKFLOWS.md](WORKFLOWS.md) |
| 2 | Push code to GitHub | Done | https://github.com/manisai03/Globalco |
| 3 | CI/CD pipeline on GitHub (AI-assisted) | Done | [ci.yml](../.github/workflows/ci.yml), [deploy.yml](../.github/workflows/deploy.yml) |
| 4 | Deploy to Vercel via CI/CD | Ready | Vercel project + GitHub secrets — [DEPLOYMENT.md](DEPLOYMENT.md) |
| 5 | AI-written documentation | Done | `docs/` folder (7 guides) |
| 6 | Submit final links | Pending | Fill Vercel URL below if not yet deployed |

---

## Final links to submit

Copy this block into your submission email:

```
GitHub Repository:
https://github.com/manisai03/Globalco

Live Demo (Vercel Frontend):
https://YOUR-PROJECT.vercel.app

Backend API (Render):
https://globalco-job-board-api-vpee.onrender.com

CI Workflow:
https://github.com/manisai03/Globalco/actions/workflows/ci.yml

Deploy Workflow:
https://github.com/manisai03/Globalco/actions/workflows/deploy.yml

AI Documentation:
https://github.com/manisai03/Globalco/blob/main/docs/AI_USAGE.md

End-to-End Workflows:
https://github.com/manisai03/Globalco/blob/main/docs/WORKFLOWS.md
```

| Item | Link |
|------|------|
| **Live App (Vercel)** | `https://YOUR-PROJECT.vercel.app` |
| **Backend API (Render)** | https://globalco-job-board-api-vpee.onrender.com |
| **GitHub Repository** | https://github.com/manisai03/Globalco |
| **CI Workflow** | https://github.com/manisai03/Globalco/actions/workflows/ci.yml |
| **Deploy Workflow** | https://github.com/manisai03/Globalco/actions/workflows/deploy.yml |

---

## Documentation index (AI-generated)

All documentation was created and maintained with **Cursor AI**.

| Document | Purpose | Link |
|----------|---------|------|
| **WORKFLOWS.md** | End-to-end candidate & recruiter journeys | [View](WORKFLOWS.md) |
| **AI_USAGE.md** | How AI was used to build the project | [View](AI_USAGE.md) |
| **FEATURES.md** | Complete feature list (40+) | [View](FEATURES.md) |
| **API.md** | REST API reference | [View](API.md) |
| **ARCHITECTURE.md** | System design & diagrams | [View](ARCHITECTURE.md) |
| **DEPLOYMENT.md** | Render + Vercel production setup | [View](DEPLOYMENT.md) |
| **SUBMISSION.md** | This checklist | [View](SUBMISSION.md) |

**Primary doc for reviewers:** [WORKFLOWS.md](WORKFLOWS.md) — explains the full platform flow from registration to hire.

---

## AI tool used

**Cursor AI** — architecture, full-stack implementation, CI/CD workflows, and all documentation. Details: [AI_USAGE.md](AI_USAGE.md).

---

## Feature highlights for reviewers

1. **Naukri-style candidate profile** — education, internships, employment, skills, resume, Cloudinary avatar
2. **Split-pane job browse** — LinkedIn/Naukri-style list + preview panel with URL-synced filters
3. **Easy Apply** — one-click apply with AI match score (0–100%)
4. **Job alerts** — save search filters with live match counts
5. **Company pages** — public recruiter/employer profiles with open jobs
6. **AI job description generator** — recruiter dashboard, uses real company from profile
7. **Recruiter privacy** — candidate identity masked until application is viewed
8. **Real-time chat** — WebSocket messaging with recruiter-initiated conversations
9. **Forgot password** — OTP via Brevo email API
10. **Analytics dashboard** — charts, applicant pipeline, period filters
11. **GitHub Actions CI/CD** — auto build/test + deploy to Render + Vercel
12. **Dark mode**, responsive UI, form validations

---

## Quick demo script (for live review)

### As recruiter
1. Register or login as recruiter → set company name (e.g. XPO) in Profile
2. `/admin?tab=ai` → generate job description → post job
3. Wait for candidate application (or apply from another browser)
4. Applicants tab → open application (identity reveals) → message candidate
5. Update status: Shortlist → Hired

### As candidate
1. Register or login as candidate → complete profile + upload resume
2. `/jobs` → search, save job, create job alert
3. Easy Apply on a job → check match score
4. `/dashboard` → track application status
5. Reply to recruiter message

---

## Deploy setup (if not live yet)

### Vercel frontend
1. [vercel.com](https://vercel.com) → Import `manisai03/Globalco`
2. Root Directory: `frontend`
3. Env: `VITE_API_URL` = `https://globalco-job-board-api-vpee.onrender.com`
4. Deploy → copy production URL into submission

### Render CORS
After Vercel deploy, set on Render:
```
CORS_ORIGINS = https://your-project.vercel.app
```

### GitHub secrets (auto-deploy)
| Secret | Purpose |
|--------|---------|
| `RENDER_DEPLOY_HOOK` | Render redeploy on push |
| `VERCEL_TOKEN` | Vercel CLI auth |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VITE_API_URL` | Production API URL for frontend build |

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

---

## Health check

Backend is live when this returns `{"status":"UP"}`:

```
https://globalco-job-board-api-vpee.onrender.com/api/public/health
```
