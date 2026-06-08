# Feature Documentation

Complete feature list for the AI-powered Job Board platform.

**End-to-end flows:** [WORKFLOWS.md](WORKFLOWS.md) · **API reference:** [API.md](API.md)

---

## 1. Authentication & Security

| Feature | Description | Route / API |
|---------|-------------|-------------|
| Candidate registration | Email/password signup | `POST /api/auth/register` (`accountType: CANDIDATE`) |
| Recruiter registration | Requires company name + role/title | `POST /api/auth/register` (`accountType: RECRUITER`) |
| Login | JWT authentication (24h token) | `POST /api/auth/login` |
| Logout | Token cleared from sessionStorage | Frontend |
| Forgot password | 6-digit OTP via email (10 min) | `POST /api/auth/forgot-password` |
| Reset password | OTP validation + new password | `POST /api/auth/reset-password` |
| Change password | Current + new password | `PUT /api/users/me/password` |
| Role-based access | `ROLE_ADMIN` vs `ROLE_USER` | JWT + Spring Security |
| Protected routes | Frontend guards + `@PreAuthorize` | `/admin`, `/dashboard`, etc. |
| Legacy company block | Rejects placeholder company names on register/profile | `RecruiterCompanyUtils` |

---

## 2. Profile Management

| Feature | Description | Route / API |
|---------|-------------|-------------|
| View profile | Load all fields | `GET /api/users/me` |
| Edit profile | Name, phone, location, bio, skills | `PUT /api/users/me` |
| Profile picture | Cloudinary upload (JPG/PNG/WEBP) | `POST /api/users/me/avatar` |
| Resume upload | PDF/DOC to server storage | `POST /api/users/me/resume` |
| Naukri-style sections | Education, internships, employment | JSON profile fields |
| Profile completion % | Progress ring | Frontend |
| Open to work | Toggle visibility intent | Profile field |
| Recruiter profile | Company name, website, description, title | Admin profile branch |
| Field validations | Phone, URL, year ranges | Frontend + `@Valid` |

---

## 3. Landing Page & Navigation

| Feature | Description |
|---------|-------------|
| Hero section | Gradient hero with search CTA |
| Featured jobs | `GET /api/jobs/featured` |
| Recommended jobs | Skill-based when logged in |
| Job categories | Filter chips → `/jobs?category=` |
| Platform statistics | `GET /api/public/stats` |
| Responsive navbar | Mobile menu, auth-aware links |
| Dark mode | Persisted theme toggle |
| Notification badge | Unread count (polled) |
| Message badge | Unread chat count |
| Footer | Platform links, contact |

---

## 4. Job Listing & Search

| Feature | API / Param |
|---------|-------------|
| Browse all jobs | `GET /api/jobs` |
| URL-synced filters | `?search&location&jobType&experienceLevel&category&minSalary&maxSalary&sort&page` |
| Split-pane preview | Desktop: list + preview panel (`?job=<id>`) |
| Search by keyword | `?search=` |
| Filter by location, salary, experience, type, category | Query params |
| Sort jobs | `?sort=newest`, `salary_desc`, etc. |
| Pagination | Page-based (`page`, `size`) |
| Save / bookmark job | `POST /api/saved-jobs/{id}` |
| Job alerts | `POST /api/saved-searches` from current filters |
| Share job | Copy link to clipboard |
| Similar jobs | `GET /api/jobs/{id}/similar` |
| Match preview | Shown when candidate is logged in |

---

## 5. Job Details & Applications

| Feature | Description |
|---------|-------------|
| Styled job description | Markdown rendering |
| Easy Apply | One-click apply with optional cover letter |
| Resume on apply | Upload or use profile resume |
| AI match score | 0–100% on apply and browse preview |
| Application status flow | PENDING → SHORTLISTED → INTERVIEW_SCHEDULED → HIRED / REJECTED |
| Withdraw application | `DELETE /api/applications/{id}` |
| Company page link | `/companies/{adminId}` from job card |
| Recruiter block | Admins cannot apply for jobs |

---

## 6. Candidate Dashboard

**Route:** `/dashboard` · **Tabs:** Applications · Interviews · Saved Jobs · Job Alerts

| Tab | Content |
|-----|---------|
| Applications | Status badges, match score, withdraw, view job |
| Interviews | Scheduled interviews (`GET /api/applications/interviews/me`) |
| Saved Jobs | Bookmarked listings grid |
| Job Alerts | Saved searches with live match counts |

Messages and Profile via navbar: `/dashboard?tab=messages`, `/dashboard?tab=profile`

---

## 7. Admin / Recruiter Dashboard

**Route:** `/admin` · **Tabs:** Overview · Jobs · Applicants · AI Generator

| Tab | Content |
|-----|---------|
| Overview | Stats cards, donut/bar charts, recent applicants (masked) |
| Jobs | Create, edit, delete jobs; company from profile |
| Applicants | Pipeline with match scores; shortlist, reject, interview, hire |
| AI Generator | Generate job descriptions from title + skills |

Messages and Profile via navbar: `/admin?tab=messages`, `/admin?tab=profile`

**Recruiter isolation:** Each admin sees only their own jobs, applicants, and analytics.

**Privacy:** Applicants shown as `Candidate #<id>` until application detail is opened.

---

## 8. Company Pages

| Feature | Description |
|---------|-------------|
| Public employer profile | `/companies/{adminId}` |
| Company info | Name, website, description, recruiter details |
| Open jobs list | All `OPEN` jobs from that recruiter |
| API | `GET /api/companies/{adminId}` |

---

## 9. Real-Time Chat

| Feature | Description |
|---------|-------------|
| WebSocket chat | `ws://<api>/ws/chat?token=<JWT>` |
| Recruiter initiates | Only admin can start new conversations |
| Candidate reply | After recruiter's first message |
| Identity masking | Candidate name hidden until application viewed |
| Contact list | `GET /api/messages/partners` with unread badges |
| Polling fallback | 5s interval if WebSocket disconnected |
| Embedded chat | Dashboard messages tab or standalone `/chat` |

---

## 10. Notifications

| Type | Trigger |
|------|---------|
| Application submitted | Candidate confirmation |
| New application | Recruiter alert |
| Status updated | Candidate notified |
| Interview scheduled | Candidate notified |
| New message | Receiver notified |
| Job posted | Recruiter (optional) |

Polled every 10s in navbar. Panel: mark read, mark all read, delete.

---

## 11. AI Features

| Feature | Location | Description |
|---------|----------|-------------|
| Job description generator | Admin → AI Generator | Template engine; optional OpenAI |
| Resume match score | Apply + browse | Skills, location, profile, early applicant |
| Match breakdown | Application detail | Matched/missing skills list |
| Recommended jobs | Home + dashboard | Skill token overlap sort |
| OpenAI hook | `AiService.java` | `OPENAI_ENABLED=true` + API key |

---

## 12. UI/UX Polish

- Responsive design (mobile-first, Tailwind CSS 4)
- Dark mode with toggle
- Toast notifications (react-hot-toast)
- Loading spinners and skeleton states
- 404 error page
- Form validation with inline errors
- Recharts analytics (donut, bar charts)
- Accessible modals and file upload zones
- Profile placeholder warning for recruiters without company name

---

## 13. DevOps & Deployment

| Feature | File |
|---------|------|
| GitHub Actions CI | `.github/workflows/ci.yml` |
| GitHub Actions Deploy | `.github/workflows/deploy.yml` |
| Vercel SPA config | `frontend/vercel.json` |
| Render blueprint | `render.yaml` |
| Docker backend | `backend/Dockerfile` |
| Schema reference | `database/schema.sql` (legacy; JPA is source of truth) |
| Env examples | `frontend/.env.example`, `backend/.env.example` |
| Startup migrations | `LegacySchemaMigration`, `CompanyDataRepair` |

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| [WORKFLOWS.md](WORKFLOWS.md) | End-to-end user journeys |
| [API.md](API.md) | REST endpoint reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [AI_USAGE.md](AI_USAGE.md) | Cursor AI usage |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deploy |
| [SUBMISSION.md](SUBMISSION.md) | Assessment submission |
