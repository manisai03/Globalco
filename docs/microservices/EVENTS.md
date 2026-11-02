# Event Catalogue

All events go through one durable **topic exchange**, `jobboard.events`. Each consuming service declares its own
durable queue and binds only the routing keys it cares about, so adding a consumer never changes a producer.

Payloads are JSON-serialised Java records from `common/event/Events.java`. The `__TypeId__` header tells the consumer
which record to deserialise; only classes in `com.globalco.jobboard.common.event` are trusted.

## Events

| Routing key | Payload | Producer | Consumers | Effect |
|---|---|---|---|---|
| `account.recruiter-updated` | `RecruiterUpdated(recruiterId, fullName, companyName, companyWebsite, companyDescription, recruiterTitle, location)` | auth | job | Refresh recruiter snapshot on the recruiter's jobs |
| `account.password-reset-otp` | `PasswordResetOtpRequested(email, otp)` | auth | notification | Email the OTP (Brevo API or SMTP) |
| `account.registration-existing-email` | `RegistrationForExistingEmail(email)` | auth | notification | Tell the account owner someone tried to sign up with their email (at most once an hour per email). Registration answers the same either way, so the email's existence isn't revealed |
| `account.deleted` | `AccountDeleted(accountType, accountId)` | auth | job, application, messaging, notification | Erase the account's data everywhere: a recruiter's jobs (which then emit `job.deleted`), a candidate's saved jobs/searches, applications and interviews, all messages and notifications |
| `job.created` | `JobCreated(jobId, recruiterId, title)` | job | notification | "Job Posted" notification to the recruiter |
| `job.alert-matched` | `JobAlertMatched(userId, jobId, jobTitle, company, searchName)` | job | notification | "New job for your alert" (`JOB_ALERT`) to each candidate whose active saved search matches the new job |
| `job.updated` | `JobUpdated(jobId, title, company, status)` | job | application | Refresh job title/company on applications |
| `job.deleted` | `JobDeleted(jobId)` | job | application | Cancel scheduled interviews; active applications become `JOB_REMOVED` (one `application.status-changed` each, so the candidate is told) and every application is detached from the recruiter. Candidates keep their history |
| `application.submitted` | `ApplicationSubmitted(applicationId, jobId, jobTitle, userId, candidateName, recruiterId)` | application | notification | "Application Submitted" to candidate, "New Application" to recruiter |
| `application.status-changed` | `ApplicationStatusChanged(applicationId, userId, jobTitle, status)` | application | notification | "Application Update" to candidate |
| `application.withdrawn` | `ApplicationWithdrawn(applicationId, recruiterId, jobTitle)` | application | notification | "Application Withdrawn" (`APPLICATION_WITHDRAWN`) to the recruiter |
| `application.interview-scheduled` | `InterviewScheduled(interviewId, applicationId, userId, jobTitle, scheduledAt)` | application | notification | "Interview Scheduled" to candidate |
| `message.sent` | `MessageSent(messageId, receiverType, receiverId, senderName)` | messaging | notification | "New Message" to the receiver |

Notification titles, messages and `type` values are exactly the monolith's, so the frontend's notification icons and links work unchanged. The two newer types link to the job (`JOB_ALERT`) and to the recruiter's applicant page (`APPLICATION_WITHDRAWN`).

## Queues

| Queue | Bound keys | Dead-letter queue |
|---|---|---|
| `job-service.recruiter-events` | `account.recruiter-updated`, `account.deleted` | `job-service.recruiter-events.dlq` |
| `application-service.job-events` | `job.updated`, `job.deleted`, `account.deleted` | `application-service.job-events.dlq` |
| `messaging-service.account-events` | `account.deleted` | `messaging-service.account-events.dlq` |
| `notification-service.events` | `job.created`, `job.alert-matched`, `application.*` (4 keys), `message.sent`, `account.password-reset-otp`, `account.registration-existing-email`, `account.deleted` | `notification-service.events.dlq` |

Queues, bindings and DLQs are declared by the consumer at startup (`MessagingConfig.consumerQueue(...)`), so a fresh
RabbitMQ needs no manual setup.

## Delivery guarantees

- **Transactional outbox (auth, job, application, messaging).** `EventPublisher` writes the event to the service's
  `event_outbox` table in the same transaction as the business change, so the two commit or roll back together. After
  commit a relay (`JdbcEventOutbox`) sends pending rows with publisher confirms and deletes each row only once RabbitMQ
  has confirmed it. It also polls every 2 s (`app.events.outbox.poll-ms`), so events written while the broker was down
  go out when it comes back. Rows are claimed with `SELECT ... FOR UPDATE SKIP LOCKED`, so several instances can relay
  in parallel without sending a row twice. Ordering is preserved per service (rows go out by id).
- **Services without an outbox** (`app.events.outbox.enabled=false`, e.g. notification-service, which produces no
  events) fall back to sending after commit on a best-effort basis.
- **At-least-once consumption.** Messages are acknowledged after the handler succeeds. A failing handler is retried
  3 times (1 s, 2 s backoff); after that the message is rejected without requeue and RabbitMQ moves it to the queue's
  `.dlq`. Nothing loops forever and nothing is silently lost.
- **Idempotent handlers where it matters.** Snapshot refreshes and deletes are naturally idempotent (setting the same
  values twice, deleting what is already gone).
- **Notifications are de-duplicated per event.** Every message carries an AMQP `message-id`: `<service>:<outbox row id>`
  from the outbox relay, a random UUID from the best-effort path. notification-service records each id in
  `processed_events` (insert-if-absent, in the same transaction as the notification), so a redelivered event is
  skipped. Ids older than 14 days are purged daily. Messages without an id are processed as before.
- **At-least-once publishing.** If a service crashes after RabbitMQ confirmed a row but before deleting it, that row
  is sent again on restart. Handlers above tolerate this.
- Check for a stuck relay with `SELECT COUNT(*) FROM event_outbox`: it should be near zero while the broker is up.

## Inspecting and replaying

RabbitMQ management UI: <http://localhost:15672> (guest/guest locally).

- **Queues** tab: message counts per queue. A non-zero `.dlq` means a handler failed 3 times; the service log has the stack trace.
- To replay after fixing the cause, use the **Shovel** plugin or "Move messages" from the DLQ back to the main queue.

Example: with invalid SMTP credentials, `account.password-reset-otp` fails 3 times and lands in
`notification-service.events.dlq`. Once the credentials are fixed, moving it back sends the email.

## Adding a new event

1. Add a record to `Events` and a routing key to `EventTopics` (only add fields later; never rename or remove them).
2. Publish it with `eventPublisher.publish(EventTopics.X, new Events.X(...))` inside the producer's transaction
   (the outbox requires one). Make any remote calls before opening that transaction, not inside it.
3. In the consumer, add the key to its `consumerQueue(...)` bindings and a `@RabbitHandler` method for the record.
