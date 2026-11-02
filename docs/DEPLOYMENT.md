# Deployment Guide

Production deployment for the Job Board platform: **microservices on Render** (Docker), **frontend on Vercel**,
MySQL (e.g. Railway) and RabbitMQ (e.g. CloudAMQP).

**Assessment checklist:** [SUBMISSION.md](SUBMISSION.md) · **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) · **Local setup:** [microservices/RUNNING.md](microservices/RUNNING.md)

---

## Live URLs

| Service | URL | Status |
|---------|-----|--------|
| **GitHub** | https://github.com/manisai03/Globalco | Active |
| **Backend (Render)** | https://globalco-job-board-api-vpee.onrender.com | Earlier single-app build; replace with the gateway URL after deploying below |
| **Frontend (Vercel)** | `https://YOUR-PROJECT.vercel.app` | Deploy and add URL |

---

## Architecture

```
GitHub (main) → GitHub Actions CI → Deploy workflow
                                     ├─ Render deploy hooks → jobboard-gateway (public)
                                     │                        jobboard-discovery, -auth, -jobs, -applications,
                                     │                        -messaging, -notifications, -ai (private network)
                                     └─ Vercel → React SPA (VITE_API_URL = gateway URL)

Services → MySQL (5 schemas) · RabbitMQ (CloudAMQP) · Brevo (email) · Cloudinary (avatars)
```

---

## 1. Infrastructure

### MySQL
1. Create a MySQL 8 instance (e.g. [railway.app](https://railway.app) → **Provision MySQL**).
2. Note host, port, user, password. The user needs `CREATE DATABASE` rights: services create
   `jobboard_auth`, `jobboard_jobs`, `jobboard_applications`, `jobboard_messaging`, `jobboard_notifications` on first start,
   and Hibernate creates the tables.

### RabbitMQ
1. Create a free instance at [cloudamqp.com](https://www.cloudamqp.com) (plan "Little Lemur").
2. From its AMQP URL `amqps://USER:PASSWORD@HOST/VHOST`, note host, user, password and vhost. Use port **5671** with TLS.
   Queues and exchanges are declared by the services automatically.

---

## 2. Services (Render Blueprint)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → connect `manisai03/Globalco`.
   Render reads `render.yaml` and creates:

   | Render service | Type | Module |
   |---|---|---|
   | `jobboard-gateway` | Web (public) | api-gateway |
   | `jobboard-discovery` | Private service | discovery-server |
   | `jobboard-auth`, `jobboard-jobs`, `jobboard-applications`, `jobboard-messaging`, `jobboard-notifications`, `jobboard-ai` | Private services | the six domain services |

   Each builds `backend/Dockerfile`; the `MODULE` env var is passed as a Docker build argument and selects the module.

2. Fill in the **`jobboard-shared`** environment group. `JWT_SECRET` and `INTERNAL_API_TOKEN` are generated, and
   `APP_ENV=production` is preset; with it, any service started with a default or short secret refuses to boot.

   | Variable | Value |
   |---|---|
   | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | From MySQL |
   | `RABBITMQ_HOST`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST` | From CloudAMQP (`RABBITMQ_PORT=5671`, `RABBITMQ_SSL=true` preset) |
   | `EUREKA_URL` | `http://jobboard-discovery:8761/eureka`. Check the discovery service's internal address in the Render dashboard and adjust if it differs |

3. Per-service variables:

   | Service | Variables |
   |---|---|
   | gateway, messaging | `CORS_ORIGINS` = your Vercel URL (comma-separate any preview URLs; `*.vercel.app` is no longer allowed by default) |
   | gateway | `TRUST_FORWARDED_FOR=true` (preset in `render.yaml`, so rate limits see the real client IP) |
   | auth | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (avatars) |
   | notifications | `BREVO_API_KEY` (`xkeysib-...`), `MAIL_FROM` (verified Brevo sender) |
   | ai | `OPENAI_API_KEY`, `OPENAI_ENABLED` (optional) |

4. Deploy, then check `https://<gateway>.onrender.com/api/public/health`.

> **Cost:** Render private services have no free plan (Starter, about $7/month each, ×8). A cheaper option is a single
> small VM (2 GB+ RAM) running `backend/docker-compose.yml` behind a reverse proxy; only port 8090 needs to be public.
> Render's free web services sleep when idle, which breaks Eureka registration, so they are not suitable here.

> Render free tier blocks SMTP. Use the **Brevo HTTP API** (`BREVO_API_KEY`), not SMTP keys.

### Deploy hooks
`render.yaml` sets `autoDeploy: false`, so deploys happen only after CI passes. For each service: **Settings** →
**Deploy Hook** → copy the URL. Put all 8 URLs, one per line, in the GitHub secret `RENDER_DEPLOY_HOOKS`.

### Moving existing data
If you have data from the earlier single-app database (`jobboard`), copy it once with
`backend/scripts/migrate-from-monolith.sql` after the services have started (they create the tables). See
[microservices/MIGRATION.md](microservices/MIGRATION.md).

---

## 3. Frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `manisai03/Globalco`
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment variable (required; the build has no production default):

| Name | Value |
|------|--------|
| `VITE_API_URL` | Gateway URL, e.g. `https://jobboard-gateway.onrender.com` |

4. Deploy → copy the production URL
5. Set `CORS_ORIGINS` on the gateway and messaging service to that URL → redeploy them

---

## 4. GitHub Actions secrets

**Settings → Secrets and variables → Actions:**

| Secret | Purpose |
|--------|---------|
| `RENDER_DEPLOY_HOOKS` | Deploy-hook URLs of all Render services, one per line |
| `VERCEL_TOKEN` | [Vercel account tokens](https://vercel.com/account/settings/tokens) |
| `VERCEL_ORG_ID` | From `vercel link` → `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same as above |
| `VITE_API_URL` | Gateway URL |

Get Vercel IDs locally:
```bash
cd frontend
npx vercel link
cat .vercel/project.json
```

---

## 5. CI/CD workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Services: JDK 21, `mvn verify`, `docker compose config` + `build`; Frontend: Node 24, `npm ci`, lint, build |
| `deploy.yml` | CI success on main | `curl` every Render deploy hook; Vercel `pull → build → deploy --prebuilt` |

---

## 6. Verify deployment

1. **Health:** `GET https://<gateway>/api/public/health` → `{"status":"UP"}`
2. **Smoke test:** `.\backend\scripts\smoke-test.ps1 -Gateway https://<gateway>` (creates throwaway accounts and a job, then deletes the job)
3. **Frontend:** Vercel URL loads the home page; register, post a job, apply, chat
4. **CI:** GitHub Actions shows green builds

---

## 7. Local development

See [microservices/RUNNING.md](microservices/RUNNING.md). In short:

```powershell
cd backend
.\mvnw.cmd -B install -DskipTests
docker run -d --name jobboard-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management
.\scripts\run-local.ps1 -DbPassword <mysql-root-password>

cd ..\frontend
npm install && npm run dev      # VITE_API_URL=http://localhost:8090
```

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| Gateway returns 503 | Services not registered yet, or `EUREKA_URL` is wrong. Check the discovery service logs |
| CORS errors on Vercel | Set `CORS_ORIGINS` on the gateway (and messaging, for WebSocket) to the exact Vercel URL |
| Services can't connect to RabbitMQ | CloudAMQP needs port 5671, `RABBITMQ_SSL=true`, and `RABBITMQ_VHOST` (usually equal to the username) |
| OTP email not sent | Use `BREVO_API_KEY` (not an SMTP key); verify `MAIL_FROM` in Brevo; failed sends wait in `notification-service.events.dlq` |
| 401 right after deploying | Users must log in again if their token was issued by the earlier build |
| Chat not real-time | WebSocket URL must use `wss://`; run messaging as a single instance |

---

## Related docs

- [WORKFLOWS.md](WORKFLOWS.md) — end-to-end platform flows
- [SUBMISSION.md](SUBMISSION.md) — assessment submission links
