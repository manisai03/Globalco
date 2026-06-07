# Deployment Guide

> Full assessment checklist: [SUBMISSION.md](SUBMISSION.md)

## 1. GitHub Repository

```bash
cd job-board-platform
git init
git add .
git commit -m "Initial commit: Globalco Job Board platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/globalco-job-board.git
git push -u origin main
```

## 2. Database (Railway / Aiven MySQL)

1. Create a MySQL instance on [Railway](https://railway.app) or [Aiven](https://aiven.io)
2. Run `database/schema.sql` or let JPA auto-create tables
3. Note connection URL, username, password

## 3. Backend (Render)

1. Create a **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `mvn -B clean package -DskipTests`
   - **Start Command**: `java -jar target/job-board-1.0.0.jar`
   - **Environment**: `prod`

4. Environment Variables:

| Variable | Value |
|----------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | `jdbc:mysql://host:3306/jobboard` |
| `DATABASE_USERNAME` | your username |
| `DATABASE_PASSWORD` | your password |
| `JWT_SECRET` | long random secret (256+ bits) |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `PORT` | `8080` |

5. Create a **Deploy Hook** URL and add to GitHub Secrets as `RENDER_DEPLOY_HOOK`

Alternatively, use `render.yaml` in the repo root.

## 4. Frontend (Vercel)

1. Import repo on [Vercel](https://vercel.com)
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. Environment Variable:
   - `VITE_API_URL` = your Render backend URL

4. For GitHub Actions deploy, add secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `VITE_API_URL`

## 5. CI/CD Secrets (GitHub)

| Secret | Purpose |
|--------|---------|
| `RENDER_DEPLOY_HOOK` | Trigger Render redeploy |
| `VERCEL_TOKEN` | Vercel CLI auth |
| `VERCEL_ORG_ID` | Vercel org |
| `VERCEL_PROJECT_ID` | Vercel project |
| `VITE_API_URL` | Production API URL for build |

## 6. Verify Deployment

1. Open Vercel URL → landing page loads
2. Login with demo admin account
3. Create a job, apply as candidate
4. Check chat and notifications work
5. Verify GitHub Actions CI passes on push

## Local Production Build Test

```bash
# Backend
cd backend && mvn clean package

# Frontend
cd frontend && VITE_API_URL=http://localhost:8080 npm run build
```
