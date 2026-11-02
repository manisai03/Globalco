# Design Decisions and Trade-offs

Short records of the main decisions: what was chosen, why, and what it costs.

## D1. Six services, split by business capability
**Chosen:** auth, job, application, messaging, notification, ai.
**Why:** each owns a set of tables that change together and a part of the product a team could own end-to-end.
Notifications and AI have no shared state with the rest, which makes them the natural first extractions.
**Rejected:** a separate "company" or "saved-jobs" service (too small: they live entirely on job data), or splitting
recruiter analytics from applications (they query the same table).

## D2. Database per service (separate schemas)
**Chosen:** one schema per service on a shared MySQL server locally; each URL is configurable separately in production.
**Why:** no service can join another's tables, which is what keeps them independently deployable. Schemas can be moved
to separate servers later without code changes.
**Cost:** no cross-service foreign keys or joins; consistency between services is eventual (see D4).

## D3. Synchronous Feign for queries, RabbitMQ events for side effects
**Why:** a page that needs data from another service has to wait for it anyway, so a plain HTTP query is the simplest
correct option. Side effects (notifications, email, keeping copies fresh) must not slow down or fail the user's action, so
they are events.
**Rejected:** fully event-sourced or CQRS designs (too much machinery for this domain), and gRPC (REST matches the
existing stack and is easy to debug).

## D4. Snapshots instead of cross-service joins
**Chosen:** jobs keep a copy of recruiter display fields; applications keep `recruiter_id` and the job title/company.
**Why:** the recruiter dashboard runs 12 aggregate queries. Doing them over HTTP would mean fetching every job, then
every application. A local copy keeps them as single SQL queries.
**Cost:** copies lag the source by milliseconds and rely on events being delivered. `recruiter_id` never changes, so it
can never be stale.

## D5. Gateway validates the JWT, and so does every service
**Why:** the gateway rejects bad tokens early, in one place. Services re-check because they must stay safe if reached
directly (misconfigured network, port-forward, another internal caller). Verifying an HMAC is cheap.
**Rejected:** forwarding pre-trusted identity headers (`X-User-Id`) from the gateway: simpler, but one exposed service port
would allow impersonation.

## D6. Self-describing JWT (`accountId`, `accountType` claims)
**Why:** services learn who the caller is without calling auth-service on every request.
**Cost:** monolith tokens are not accepted (users log in once more). A renamed user's token still carries the old name
until they log in again; services that display names fetch fresh ones from auth-service.

## D7. Shared `common` library
**Why:** the API DTOs must stay identical to the monolith's for the frontend; one definition prevents drift. Security,
Feign and event plumbing are the same everywhere.
**Cost:** changing `common` means rebuilding the services that use it. Mitigated by keeping only contracts and plumbing
there, never business logic, and by additive-only changes to event records.

## D8. Spring Cloud Gateway + Eureka
**Why:** native to the Spring stack, client-side load balancing (`lb://`), and no extra infrastructure beyond one small
registry. In Kubernetes, Eureka could be replaced by Kubernetes Services without touching business code.

## D9. Failure handling
- Feign maps downstream 4xx to the same exceptions the monolith threw, so error messages reach the browser unchanged; 5xx and timeouts become 503.
- Enrichment calls degrade (no badge, masked name) rather than fail a page.
- Event handlers retry 3 times, then move the message to a DLQ.
- **Circuit breakers** (Resilience4j core, `common/feign/RemoteCalls`): one breaker per downstream service, used on
  the enrichment paths that already degrade. After 50% failures in the last 10 calls the breaker opens for 20 s and calls
  fail immediately, so a sick dependency can't tie up request threads. 4xx answers don't count as failures.
- **No remote calls inside database transactions.** Services call other services first, then open a short transaction
  for the local write and outbox insert. A slow dependency never holds a connection from the pool.

## D10. Transactional outbox for events
**Chosen:** a plain `event_outbox` table per producing service, relayed by a small JDBC poller with publisher confirms.
**Why:** a lost `job.deleted` or `account.deleted` leaves data inconsistent forever, so "publish after commit, best effort"
wasn't enough. The table approach needs no extra infrastructure.
**Rejected:** Debezium/CDC (an extra moving part to run), Spring Modulith's event registry (pulls in a framework for one feature).
**Cost:** one insert per event plus a 2 s poll; duplicates are possible after a crash (consumers are idempotent, and
notification-service skips event ids it has already processed).

## D11. Flyway owns the schema
**Chosen:** `V1__baseline.sql` (the schema as it stood) plus versioned changes; Hibernate only *validates* (`ddl-auto: validate`).
**Why:** `ddl-auto: update` never drops or renames anything, can't backfill data and silently diverges between environments.
Existing databases are adopted with `baseline-on-migrate` at version 1, so no data is touched.

## D12. Account deletion and job deletion keep history honest
- Deleting a job no longer deletes applications: candidates keep them, marked `JOB_REMOVED`, and get a notification.
- A user can delete their own account (password confirmed). `account.deleted` erases their data in every service, and
  their uploaded files are removed after the commit.

## D13. Production refuses insecure defaults
Every service and the gateway check `APP_ENV`. Outside `local`/`test`, startup fails if `JWT_SECRET` is the dev default or
shorter than 32 bytes, or `INTERNAL_API_TOKEN` is the default or shorter than 24 characters.

## D14. Token versions for revocation
**Chosen:** every account has a `token_version`, and each JWT carries the version it was issued with. Changing or
resetting the password bumps the version (change-password returns a fresh token, so the current tab stays signed in).
The gateway asks auth-service for the current version (`/internal/accounts/token-versions/{type}/{id}`) and caches the
answer for 30 s; a deleted account answers `-1`, which rejects all its tokens.
**Why:** stateless JWTs otherwise stay valid for their full lifetime after a password change or account deletion.
**Cost:** old tokens can survive up to 30 s. If auth-service is unreachable the gateway accepts the token (signature and
expiry were already checked), so an outage doesn't log everyone out.

## D15. Rate limiting at the gateway
**Chosen:** a fixed-window, per-IP `RateLimitFilter` in the gateway for the abuse-prone endpoints: register (20/hour),
login (30/min), forgot-password (5 per 15 min), reset-password (10 per 15 min), sending messages (60/min) and
submitting applications (30/min). Over the limit the answer is `429` with `Retry-After`. `X-Forwarded-For` is only
trusted when `TRUST_FORWARDED_FOR=true` (set on Render, which sits behind a proxy).
**Why:** one place, no extra infrastructure, and it covers every service behind the gateway.
**Cost:** counters are in memory, so the limits are per gateway instance (see the limitations table).

## D16. Recruiters can't choose a company or feature their own jobs
**Chosen:** a job's company always comes from the recruiter's profile, and `featured` is no longer settable through the
recruiter API. The AI job generator uses the profile company as well.
**Why:** otherwise any recruiter could post jobs under another company's name or promote their own listings.

## D17. Application status follows a transition table
**Chosen:** `ApplicationService.STATUS_TRANSITIONS` allows only PENDING → SHORTLISTED/REJECTED,
SHORTLISTED → REJECTED/HIRED, INTERVIEW_SCHEDULED → SHORTLISTED/REJECTED/HIRED and REJECTED → SHORTLISTED.
`INTERVIEW_SCHEDULED` is reached only by scheduling an interview (in the future); rescheduling cancels the earlier one.
HIRED, WITHDRAWN and JOB_REMOVED are final. Candidates can withdraw an active application and re-apply once.
**Why:** prevents nonsense jumps (hiring someone straight from pending, reopening a removed job's application) and keeps
interviews and statuses consistent. The frontend shows only the actions the table allows.

## D18. The session token stays out of long-lived storage and URLs
**Chosen:** the frontend keeps the JWT in `sessionStorage`. Tokens left in `localStorage` by older versions are moved
over once and deleted. A new tab asks open tabs for the session over a `BroadcastChannel` (`jb_auth`) and waits up to
250 ms. Login, logout and token refreshes are announced on the same channel. For chat, the client trades its JWT for a
single-use ticket (`POST /api/messages/ws-ticket`, valid 30 s) and connects with `/ws/chat?ticket=`.
messaging-service closes each socket when the JWT it was opened with expires (close code `4001`, and the client
reconnects with a new ticket). It also closes all of an account's sockets when the account is deleted.
**Why:** a token in `localStorage` survives forever and can be read by any script that runs on the origin. A JWT in a
WebSocket URL ends up in proxy and access logs.
**Cost:** the session doesn't survive a browser restart; users sign in again. Tickets are held in memory, so they
only work on the messaging instance that issued them (already true of chat sockets, see the limitations table). After a
password change, sockets that are already open stay open until their token would have expired.

## D19. Registration doesn't reveal which emails have accounts
**Chosen:** registering with an email that is already taken returns the same success message as a new signup and
still runs the password hash, so the timing matches too. Instead of creating an account, auth-service emits
`account.registration-existing-email`, and the owner gets an email at most once an hour.
**Cost:** someone who mistypes their email sees "account created" but can't sign in. The email to the real owner
explains what happened. The hourly cooldown is kept in memory per auth-service instance.

## D20. Uploads are checked by content and served as attachments
**Chosen:** a resume must match its extension: `%PDF-` for `.pdf`, the OLE2 header for `.doc`, and a ZIP that
contains `word/document.xml` for `.docx`. Downloads are sent with `Content-Disposition: attachment`,
`X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox; default-src 'none'`.
**Why:** otherwise an HTML or SVG file renamed to `.pdf` could be served from the API origin and run script there.

## D21. Graceful shutdown and health probes
**Chosen:** every service shuts down gracefully (`server.shutdown: graceful`, `SHUTDOWN_TIMEOUT`, default 20 s) and
exposes `/actuator/health/liveness` and `/actuator/health/readiness`. The Docker image's `HEALTHCHECK` checks
readiness on `$PORT`. Compose waits for every service to be healthy before starting the gateway.
**Why:** a redeploy no longer cuts off requests in flight, and the gateway doesn't start routing to services that are
still booting.

## Known limitations and next steps

| Limitation | Impact | Next step |
|---|---|---|
| **In-memory WebSocket sessions** | messaging-service must run as one instance (or behind sticky sessions) for live chat delivery; REST chat works with any number | Fan out deliveries via a RabbitMQ fanout exchange or Redis pub/sub so every instance pushes to its local sockets |
| **Login throttling and gateway rate limits are per instance** | With N auth-service instances an attacker gets 5×N guesses per 15 min per email; with N gateways each IP gets N× the limits | Move the counters to Redis |
| **Local file uploads in auth-service** | Uploaded resumes live on that instance's disk/volume | Store resumes in Cloudinary/S3 like avatars |
| **Traces are only in logs** | Trace and request ids appear on every log line, but there's no trace UI | Add a Zipkin/Tempo exporter (`micrometer-tracing` is already wired) |
| **Unit tests, no contract tests** | Business rules are unit-tested and the 98-check smoke test covers integration; internal API contracts aren't pinned | Add Spring Cloud Contract or Pact for the internal APIs |
