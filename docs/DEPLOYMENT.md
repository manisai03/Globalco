# Deployment Guide

Production deployment for the Job Board platform — Render (backend), Vercel (frontend), Railway (MySQL).

**Assessment checklist:** [SUBMISSION.md](SUBMISSION.md) · **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Live URLs

| Service | URL | Status |
|---------|-----|--------|
| **GitHub** | https://github.com/manisai03/Globalco | Active |
| **Backend (Render)** | https://globalco-job-board-api-vpee.onrender.com | Deployed |
| **Health check** | https://globalco-job-board-api-vpee.onrender.com/api/public/health | `{"status":"UP"}` |
| **Frontend (Vercel)** | `https://YOUR-PROJECT.vercel.app` | Deploy and add URL |

---

## Architecture

```
GitHub (main) → GitHub Actions → Render (API) + Vercel (SPA)
                                      ↓
                               Railway MySQL
                                      ↓
                               Brevo (email OTP)
                               Cloudinary (avatars, optional)
```

---

## 1. Database (Railway MySQL)

1. Create project at [railway.app](https://railway.app) → **Provision MySQL**
2. Copy connection details from **Connect** tab
3. Build JDBC URL:
   ```
   jdbc:mysql://HOST:PORT/DATABASE?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC
   ```
4. Optionally run `database/schema.sql` — JPA `ddl-auto: update` also creates tables

---

## 2. Backend (Render)

### Option A — Blueprint (recommended)
1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect repo `manisai03/Globalco` → applies `render.yaml`

### Option B — Manual
- Runtime: **Docker**
- Dockerfile path: `backend/Dockerfile`
- Docker context: `backend`
- Health check: `/api/public/health`

### Environment variables

| Variable | Value |
|----------|--------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | JDBC URL from Railway |
| `DATABASE_USERNAME` | MySQL user |
| `DATABASE_PASSWORD` | MySQL password |
| `JWT_SECRET` | Long random string (256+ bits) |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `BREVO_API_KEY` | Brevo API key (`xkeysib-...`) |
| `MAIL_FROM` | Verified sender email in Brevo |
| `CLOUDINARY_CLOUD_NAME` | Optional — profile pictures |
| `CLOUDINARY_API_KEY` | Optional |
| `CLOUDINARY_API_SECRET` | Optional |

> Render free tier blocks SMTP. Use **Brevo HTTP API** (`BREVO_API_KEY`), not SMTP keys.

### Deploy hook
Render → Service → **Settings** → **Deploy Hook** → copy URL → GitHub secret `RENDER_DEPLOY_HOOK`

---

## 3. Frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `manisai03/Globalco`
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment variable:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://globalco-job-board-api-vpee.onrender.com` |

4. Deploy → copy production URL
5. Update Render `CORS_ORIGINS` with your Vercel URL → redeploy backend

---

## 4. GitHub Actions secrets

**Settings → Secrets and variables → Actions:**

| Secret | Purpose |
|--------|---------|
| `RENDER_DEPLOY_HOOK` | Trigger Render redeploy on push to `main` |
| `VERCEL_TOKEN` | [Vercel account tokens](https://vercel.com/account/settings/tokens) |
| `VERCEL_ORG_ID` | From `vercel link` → `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same as above |
| `VITE_API_URL` | `https://globalco-job-board-api-vpee.onrender.com` |

Get Vercel IDs locally:
```bash
cd frontend
npx vercel link
cat .vercel/project.json
```

Until secrets are set, the deploy workflow skips Vercel with a warning (CI still runs).

---

## 5. CI/CD workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Backend: JDK 21, MySQL service, `mvn package`; Frontend: Node 20, `npm ci && npm run build` |
| `deploy.yml` | Push to main | `curl` Render hook; Vercel `pull → build → deploy --prebuilt` |

---

## 6. Verify deployment

1. **Health:** `GET /api/public/health` → `{"status":"UP"}`
2. **Frontend:** Vercel URL loads home page
3. **Register:** Create recruiter + candidate accounts
4. **Recruiter:** Set company in profile → post job via AI generator
5. **Candidate:** Apply → check match score
6. **Chat:** Recruiter views application → sends message → candidate replies
7. **CI:** GitHub Actions tab shows green builds

---

## 7. Local development

```bash
# Backend (port 8080)
cd backend
# Optional: mysql-local.yml, mail-local.yml, cloudinary-local.yml
mvn spring-boot:run

# Frontend (port 5173)
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:8080
npm install && npm run dev
```

### Local production build test
```bash
cd backend && mvn clean package
cd frontend && set VITE_API_URL=http://localhost:8080 && npm run build
```

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors on Vercel | Set `CORS_ORIGINS` on Render to exact Vercel URL |
| 500 on job post | Check Render logs; `LegacySchemaMigration` repairs schema on boot |
| OTP email not sent | Use `BREVO_API_KEY` (not SMTP key); verify `MAIL_FROM` in Brevo |
| Render cold start | Free tier sleeps after inactivity — first request may take ~30s |
| Chat not real-time | Check WebSocket URL uses `wss://` in production |
| Company shows placeholder | Set real company in recruiter Profile; restart clears legacy data |

---

## Related docs

- [WORKFLOWS.md](WORKFLOWS.md) — end-to-end platform flows
- [SUBMISSION.md](SUBMISSION.md) — assessment submission links
