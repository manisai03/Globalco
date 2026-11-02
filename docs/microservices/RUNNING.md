# Running the Microservices

Two ways to run the stack. Both serve the API at **http://localhost:8090** (the gateway).

| | Option A: local JVMs | Option B: Docker Compose |
|---|---|---|
| Needs | JDK 21+, MySQL, Docker (RabbitMQ only) | Docker only |
| Start time | ~2 min | First build ~5-10 min, then ~2 min |
| Best for | Day-to-day development, debugging one service | A clean, production-like environment |

## Prerequisites

- **JDK 21 or newer** (`JAVA_HOME` set). The Maven wrapper is included; no Maven install needed.
- **Docker Desktop** (for RabbitMQ in Option A, or everything in Option B).
- **MySQL 8+** for Option A. The five databases are created automatically on first start.

## Option A: local JVMs

```powershell
cd backend

# 1. Build all modules (about 1 minute)
.\mvnw.cmd -B install -DskipTests

# 2. RabbitMQ (once; afterwards: docker start jobboard-rabbitmq)
docker run -d --name jobboard-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management

# 3. Start everything (discovery first, then the rest). Logs go to backend/logs/
.\scripts\run-local.ps1 -DbPassword <mysql-root-password>

# Stop
.\scripts\stop-local.ps1
```

`run-local.ps1` options: `-DbHost`, `-DbPort` (default 3306), `-DbUsername` (default root), `-DbPassword`.

Optional local secrets, read from each service's working directory (gitignored):

| File | Service | Purpose |
|---|---|---|
| `backend/auth-service/cloudinary-local.yml` | auth | Avatar uploads to Cloudinary (`app.cloudinary.cloud-name`, `api-key`, `api-secret`) |
| `backend/notification-service/mail-local.yml` | notification | SMTP settings (`spring.mail.host`, `port`, `username`, `password`; `app.mail.from`) |

Copy the matching `*.yml.example` file next to it and fill in your values.

Without any email provider, `run-local.ps1` sets `LOG_OTP_WHEN_UNCONFIGURED=true`, so password-reset OTPs are written to
`logs/notification-service.log` instead of being emailed. Never enable that in production.

To run a single service from your IDE instead, start `discovery-server` first, then run the service's `*Application`
class; it registers with Eureka and the gateway routes to it within ~10 seconds.

## Option B: Docker Compose

```powershell
cd backend
docker compose up -d --build
docker compose ps          # wait until everything is running
docker compose logs -f job-service
docker compose down        # add -v to also delete the MySQL volume
```

Compose starts MySQL on host port **3307** (so it doesn't clash with a local MySQL), RabbitMQ, Eureka, the gateway and
all six services. The MySQL init script creates the five databases. Optional secrets are read from your shell or a
`backend/.env` file: `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, `INTERNAL_API_TOKEN`, `CLOUDINARY_*`, `BREVO_API_KEY`,
`MAIL_*`, `OPENAI_API_KEY`, `CORS_ORIGINS`.

## Point the frontend at the gateway

```powershell
cd frontend
$env:VITE_API_URL = "http://localhost:8090"
npm run dev
```

Or set `VITE_API_URL=http://localhost:8090` in `frontend/.env.local`. Nothing else in the frontend changes; the chat
WebSocket URL is derived from the same variable.

## Verify

```powershell
cd backend
.\mvnw.cmd -B verify          # unit tests in every module
.\scripts\smoke-test.ps1      # end-to-end, against the running stack

cd ..\frontend
npm test                      # Vitest
```

The smoke test registers throwaway accounts and walks the whole product through the gateway: posting a job, applying,
match scoring, masking and revealing candidates, paged applicant search, resume access rules, status changes, interviews,
chat, notifications delivered via RabbitMQ, event-driven data sync, login lockout, job deletion (applications kept as
`JOB_REMOVED`) and account deletion across all services. It prints PASS/FAIL per step (67 checks) and deletes the
accounts it created.

Databases are migrated by Flyway on startup (`src/main/resources/db/migration` in each service). An existing database
without Flyway history is adopted at version 1 without being changed.

Useful URLs:

| URL | What |
|---|---|
| http://localhost:8090/api/public/health | Through the gateway |
| http://localhost:8761 | Eureka dashboard: every service should be UP |
| http://localhost:15672 | RabbitMQ (guest/guest): queues, DLQs |
| http://localhost:900X/actuator/health | Health of a single service |
| http://localhost:900X/actuator/health/readiness, `/liveness` | Kubernetes-style probes; the Docker `HEALTHCHECK` uses readiness |
| http://localhost:8090/swagger-ui.html | Swagger UI for every service (pick one in the top-right selector) |
| http://localhost:900X/actuator/prometheus | Prometheus metrics of a single service (HTTP, JVM, RabbitMQ, circuit breakers) |

Every response carries an `X-Request-Id` header. Log lines look like `[traceId,requestId]`, so `Select-String <id> logs\*.log`
finds a request in every service it reached.

## Environment variables

| Variable | Default | Used by |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | localhost, 3306, root, (empty) | all services with a database |
| `AUTH_DB_URL`, `JOB_DB_URL`, `APPLICATION_DB_URL`, `MESSAGING_DB_URL`, `NOTIFICATION_DB_URL` | built from `DB_*` | override one service's JDBC URL (e.g. separate DB servers) |
| `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | localhost, 5672, guest, guest | all services |
| `EUREKA_URL` | http://localhost:8761/eureka | all services + gateway |
| `APP_ENV` | local | all services + gateway. Anything other than `local`/`test` makes startup fail on default or short secrets |
| `JWT_SECRET` | dev default | **all** services + gateway (must match; 32+ bytes outside local) |
| `INTERNAL_API_TOKEN` | dev default | all services + gateway (must match; 24+ characters outside local). The gateway uses it to check token versions with auth-service |
| `TRACING_SAMPLING` | 0.1 | all services: share of requests whose trace spans are sampled |
| `CORS_ORIGINS` | (empty) | gateway, messaging (WebSocket origins). Comma-separated; `localhost:*` is added only when `APP_ENV` is `local`/`test`. Preview domains such as `*.vercel.app` must be listed explicitly |
| `TRUST_FORWARDED_FOR` | false | gateway: key rate limits on the `X-Forwarded-For` client IP. Set `true` only behind a trusted proxy (Render) |
| `PORT` | per service | any service. Must be set in Docker containers, because the image's health check reads it (Compose and Render set it) |
| `SHUTDOWN_TIMEOUT` | 20s | any service: how long a graceful shutdown waits for requests in flight |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | (empty) | auth |
| `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | (empty) | notification |
| `LOG_OTP_WHEN_UNCONFIGURED` | false | notification (local dev only) |
| `OPENAI_API_KEY`, `OPENAI_ENABLED` | (empty), false | ai |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Gateway returns **503** right after startup | Services are not in Eureka yet. Wait ~10-30 s and check http://localhost:8761 |
| **401** on every request with a token from the old monolith | Old tokens lack the `accountId` claim. Log out and log in again |
| `Communications link failure` in a service log | MySQL isn't reachable at `DB_HOST:DB_PORT`, or the password is wrong |
| `Connection refused: localhost:5672` | RabbitMQ isn't running: `docker start jobboard-rabbitmq` |
| Notifications never appear | Check `notification-service.events` in the RabbitMQ UI: messages piling up means notification-service is down; messages in `.dlq` mean the handler failed (see its log) |
| Forgot-password says OK but no email arrives | Email is sent asynchronously. Check `logs/notification-service.log`; an SMTP `535 Authentication failed` means the credentials in `mail-local.yml` are wrong. The event waits in the DLQ for replay |
| Port already in use | Another process uses 8090/8761/900X. Stop it or start the service with `PORT=<other>` |
| `Insecure configuration for APP_ENV=...` at startup | Set real `JWT_SECRET` / `INTERNAL_API_TOKEN` values, or `APP_ENV=local` for development |
| `Schema-validation: missing column` | An entity changed without a migration. Add `V<n>__<description>.sql` to that service's `db/migration` |
| Login returns **429** | 5 wrong passwords for that email in 15 minutes. Wait for the time in `Retry-After`, or reset the password |
