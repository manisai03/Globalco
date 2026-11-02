# From Monolith to Microservices

> The original monolith (`backend/`) has been removed from the repository; it remains available in git history.
> This document records how it was split and how to move data from its database.

## 1. How the monolith was split

The monolith was a layered Spring Boot app: controllers, services, JPA repositories, one MySQL schema.
Services were cut along **business capabilities**, i.e. the groups of tables that change together:

| Monolith code | Became | Notes |
|---|---|---|
| `AuthController`, `UserController`, `FileController`, `AuthService`, `UserService`, `AccountService`, `FileStorageService`, `CloudinaryService` | auth-service | Unchanged logic; OTP email moved out as an event |
| `JobController`, `CompanyController`, `SavedJobController`, `SavedSearchController`, `PublicController`, `JobService`, `JobSpecification` | job-service | Applicant counts, match scores and recruiter data now come from other services |
| `ApplicationController`, `AdminController` (minus `/jobs`), `ApplicationService`, `AdminService` | application-service | All recruiter analytics rewritten against the local `recruiter_id` copy |
| `MessageController`, `MessageService`, `ChatSocketService`, WebSocket config | messaging-service | Same rules; identity checks now batch-query application-service |
| `NotificationController`, `NotificationService`, `EmailService`, `BrevoApiEmailSender`, `MailConfig` | notification-service | Writes notifications from events instead of direct calls |
| `AiController`, `AiService` | ai-service | Scoring takes a self-contained `MatchInput`, so it reads no database |

### Couplings that had to be broken

| Coupling in the monolith | Replacement |
|---|---|
| `Application` had JPA relations to `Job` and `User`; 12 analytics queries joined `a.job.createdBy.id` | `applications.recruiter_id` + job title/company copy, refreshed by `job.updated` |
| `JobService` read application counts and computed match scores in-process | `POST /internal/applications/job-stats` and `POST /internal/ai/match/batch` (one call per page) |
| Job responses joined the recruiter (`createdBy`) for name/company | Recruiter snapshot columns on `jobs`, refreshed by `account.recruiter-updated` |
| Every service called `NotificationService.create(...)` directly | Domain events consumed by notification-service |
| `AuthService` sent the OTP email synchronously | `account.password-reset-otp` event |
| `MessageService` queried `applications` for identity unlock rules | `recruiter-viewed`, `candidates`, `viewed-candidates` internal endpoints |
| Database `ON DELETE CASCADE` from jobs to applications/interviews | `job.deleted` event. Originally application-service deleted them; it now keeps them as `JOB_REMOVED` (see DECISIONS D12) |

## 2. Data migration

`backend/scripts/migrate-from-monolith.sql` copies the monolith schema (`jobboard`) into the five service schemas.

1. Start every service once against the target MySQL, so Hibernate creates the tables.
2. Stop writes to the monolith (maintenance window).
3. Run the script:
   ```powershell
   Get-Content backend\scripts\migrate-from-monolith.sql -Raw | mysql -u root -p
   ```
4. Check the row-count table the script prints at the end (monolith vs service).

What it does:

- Copies rows **with their original primary keys**, so every cross-service id stays valid and existing URLs
  (`/jobs/42`) keep working.
- Fills the snapshots with joins: recruiter details onto `jobs`, and `recruiter_id`/job title/company onto `applications`.
- Copies only still-valid, unused password-reset OTPs.
- Uses `INSERT IGNORE`, so it is safe to re-run.

Locally uploaded files (resumes) are not database rows: they live in `backend/auth-service/uploads/` (or the
`uploads` Docker volume); the monolith's local uploads were moved there. Avatars stored on Cloudinary need nothing.

## 3. Behaviour differences (intentional)

The REST contract and business rules are unchanged; these are the observable differences:

| Area | Monolith | Microservices |
|---|---|---|
| Existing sessions | - | Users must log in again once (new tokens carry `accountId`) |
| Notifications | Written in the same transaction | Appear a few milliseconds later (event-driven) |
| Forgot password with broken email config | Request fails with an error message | Request succeeds; delivery is retried and parked in the DLQ, and the error is in notification-service's log |
| Deleting a job | Applications cascade-deleted in the same transaction | Applications removed asynchronously right after (`job.deleted`) |
| A dependency is down | - (one process) | Pages degrade instead of failing: no match badge, masked names, zero job counts |
| Chat WebSockets | One process | messaging-service holds sessions in memory; run one instance or use sticky sessions (see DECISIONS.md) |

## 4. Production cutover

1. **Deploy** the microservices with `render.yaml` (see [DEPLOYMENT.md](../DEPLOYMENT.md)) and verify with
   `smoke-test.ps1 -Gateway https://<gateway-host>`.
2. **Maintenance window:** stop the old Render service, run the data migration against the production MySQL, check the row counts.
3. **Switch** the frontend's `VITE_API_URL` on Vercel to the gateway URL and redeploy.
4. Delete the old Render service once the new stack is confirmed.
