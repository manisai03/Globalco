# AI Usage Documentation

This project was built using **Cursor AI** as the primary development assistant, per the assessment requirement to demonstrate AI-assisted full-stack development.

**Repository:** https://github.com/manisai03/Globalco

---

## Summary

| Area | AI contribution |
|------|-----------------|
| Architecture | System design, DB schema, API contract, deployment topology |
| Backend | Spring Boot entities, services, JWT security, migrations |
| Frontend | React pages, Tailwind UI, dashboards, chat, profile |
| DevOps | GitHub Actions CI/CD, Render + Vercel configuration |
| Documentation | All files in `docs/` including end-to-end workflows |

---

## How Cursor AI was used

### 1. Architecture & planning
- Chose React + Spring Boot + MySQL split-stack
- Designed separate `users` / `admins` tables for candidates vs recruiters
- Defined REST API before implementation
- Planned Vercel (frontend) + Render (backend) + Railway (MySQL) deployment

### 2. Backend generation
- JPA entities: `User`, `Admin`, `Job`, `Application`, `Message`, `Notification`, `SavedSearch`, `Interview`
- Repositories, services, controllers with validation
- JWT filter chain and `@PreAuthorize` role checks
- `LegacySchemaMigration` for production schema repair
- `RecruiterCompanyUtils` — resolve real company names, block placeholders
- `AiService` — template job descriptions + skill-based match scoring
- Brevo email integration for OTP password reset
- WebSocket chat with JWT handshake

### 3. Frontend generation
- Route structure and `ProtectedRoute` guards
- Naukri/LinkedIn-inspired UX: split-pane job browse, Easy Apply, company pages
- Candidate dashboard: applications, interviews, saved jobs, job alerts
- Admin dashboard: overview analytics, job CRUD, applicant pipeline, AI generator
- `NaukriStyleProfile` — multi-section profile with modals
- Real-time chat panel with WebSocket + polling fallback
- Dark mode, responsive navbar, toast notifications

### 4. DevOps
- `.github/workflows/ci.yml` — Maven + npm build on every push
- `.github/workflows/deploy.yml` — Render deploy hook + Vercel CLI
- `render.yaml` blueprint, `frontend/vercel.json` SPA rewrites
- Environment variable documentation in `DEPLOYMENT.md`

### 5. Documentation (this folder)
- **[WORKFLOWS.md](WORKFLOWS.md)** — end-to-end candidate & recruiter journeys
- **[FEATURES.md](FEATURES.md)** — 40+ feature inventory
- **[API.md](API.md)** — REST endpoint reference
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — layers, ER diagram, auth flow
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — production setup guide
- **[SUBMISSION.md](SUBMISSION.md)** — assessment checklist & submission links

---

## AI features inside the application

### Job description generator
| Item | Detail |
|------|--------|
| **UI** | Admin Dashboard → AI Generator tab |
| **API** | `POST /api/ai/generate-job-description` |
| **Input** | Job title, skills, company, location, experience level |
| **Output** | Professional markdown job description |
| **Engine** | Template builder in `AiService.java` |
| **OpenAI** | Optional — set `OPENAI_ENABLED=true` + `OPENAI_API_KEY` |

Company name is pulled from the recruiter profile (e.g. XPO), not a hardcoded default.

### Resume match score
| Item | Detail |
|------|--------|
| **Trigger** | On job application + browse preview when logged in |
| **Algorithm** | Skill overlap, location, profile completeness, early applicant bonus |
| **Range** | 0–100% stored on `applications.match_score` |
| **UI** | Application cards, job preview panel, admin applicant list |

**Scoring breakdown (see [WORKFLOWS.md](WORKFLOWS.md#52-resume-match-score)):**
- Base 35 + skills (up to 30) + location (15) + profile complete (10) + early applicant (10)

### OpenAI integration point

```java
// AiService.java — production hook
if (openAiEnabled && openAiApiKey != null && !openAiApiKey.isBlank()) {
    // Call OpenAI Chat Completions API
}
return buildTemplateDescription(request);
```

---

## Prompts & workflow used during development

| Phase | AI prompt focus |
|-------|-----------------|
| 1 | System architecture, tech stack, folder structure |
| 2 | MySQL schema, entity relationships |
| 3 | Spring Boot backend — auth, jobs, applications |
| 4 | React frontend — pages, Tailwind, dark mode |
| 5 | Chat module — WebSocket real-time messaging |
| 6 | Profile module — Naukri-style sections, Cloudinary |
| 7 | AI module — job description generator, match score |
| 8 | Auth module — forgot password OTP via Brevo |
| 9 | UX overhaul — split-pane browse, job alerts, company pages |
| 10 | CI/CD — GitHub Actions, Render, Vercel |
| 11 | Production fixes — schema migrations, messaging FKs, company resolution |
| 12 | Documentation — workflows, submission package, API reference |

---

## AI-assisted debugging & iteration

Cursor AI was also used iteratively for:
- Fixing `notifications.user_id` legacy column breaking job posts on Render
- Dropping `messages` FK constraints that blocked admin-to-candidate messaging
- Candidate identity masking until recruiter views application
- Removing hardcoded "Globalco Technologies" — recruiter company from profile
- Brevo API vs SMTP configuration for Render free tier

---

## Recommendations for production AI

1. Enable OpenAI with rate limiting on `/api/ai/*`
2. Cache repeated job description requests
3. Use embeddings for semantic resume–job matching
4. Add AI candidate ranking in admin applicant view
5. Background job for job-alert email notifications when new matches appear

---

## Related docs

- [WORKFLOWS.md](WORKFLOWS.md) — how AI features fit in user journeys
- [FEATURES.md](FEATURES.md) — full feature list
- [SUBMISSION.md](SUBMISSION.md) — links to submit for assessment
