# Feature Documentation — Globalco Jobs

Complete feature list for the AI-powered job board platform.

---

## 1. Authentication & Security

| Feature | Description | Route / API |
|---------|-------------|-------------|
| User Registration | Email/password signup with client + server validation | `POST /api/auth/register` |
| User Login | JWT authentication (24h token) | `POST /api/auth/login` |
| User Logout | Token cleared from storage | Frontend |
| Forgot Password | OTP sent to email, reset flow | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Change Password | Current + new password validation | `PUT /api/users/me/password` |
| Role-Based Access | `ROLE_ADMIN` (recruiter) vs `ROLE_USER` (candidate) | JWT + Spring Security |
| Protected Routes | Frontend guards + backend `@PreAuthorize` | All `/api/*` except auth |

**UX details:** Register redirects to login (no auto-login). Toast errors for validation. Demo accounts seeded on startup.

---

## 2. Profile Management

| Feature | Description | Route / API |
|---------|-------------|-------------|
| View Profile | Load all profile fields | `GET /api/users/me` |
| Edit Profile | Update name, phone, location, bio, skills | `PUT /api/users/me` |
| Profile Picture | Upload to Cloudinary (JPG/PNG/WEBP, 5MB) | `POST /api/users/me/avatar` |
| Resume Upload | PDF/DOC to server storage | `POST /api/users/me/resume` |
| Naukri-Style Profile | Education, internships, employment sections | JSON fields on user |
| Profile Completion % | Progress ring based on filled sections | Frontend |
| Recruiter Profile | Company name, website, role/title | Admin profile branch |
| Field Validations | Phone, URL, year ranges, char limits | Frontend + `@Valid` backend |

**UX details:** Clickable avatar with camera overlay. Modal editors for education/internships. Month/year pickers. Quick-links sidebar.

---

## 3. Landing Page & Navigation

| Feature | Description |
|---------|-------------|
| Hero Section | Gradient hero with search CTA |
| Featured Jobs | Top featured listings carousel/grid |
| Job Categories | Clickable category filter chips |
| Platform Statistics | Open jobs, total listings |
| Responsive Navbar | Mobile hamburger, auth-aware links |
| Dark Mode Toggle | Persisted theme preference |
| Notification Badge | Unread count on navbar |
| Message Badge | Unread chat count |
| Footer | Company info, browse jobs, contact |

---

## 4. Job Listing & Search

| Feature | API / Param |
|---------|-------------|
| View All Jobs | `GET /api/jobs` |
| Search by Keyword | `?search=` |
| Filter by Location | `?location=` |
| Filter by Salary | `?minSalary=` |
| Filter by Experience | `?experienceLevel=` |
| Filter by Job Type | `?jobType=` |
| Filter by Category | `?category=` |
| Sort Jobs | `?sort=salary_desc`, `newest`, etc. |
| Pagination | Page-based listing |
| Save / Bookmark Job | `POST /api/saved-jobs/{id}` |
| Share Job | Copy link to clipboard |

---

## 5. Job Details & Applications

| Feature | Description |
|---------|-------------|
| Styled Job Description | Markdown parser — title, sections, bullets |
| Apply for Job | Cover letter + optional resume upload |
| Resume Upload Box | Dashed drag-and-drop style picker |
| AI Match Score | Skill overlap 0–100% on apply |
| Application Status | PENDING → SHORTLISTED → INTERVIEW → HIRED / REJECTED |
| Withdraw Application | Delete pending application |
| Recruiter Block | Admins cannot apply for jobs |

---

## 6. Candidate Dashboard

| Tab | Content |
|-----|---------|
| Applications | Status badges, withdraw, view job |
| Saved Jobs | Bookmarked listings grid |

Messages and Profile accessible via top navbar (`?tab=messages`, `?tab=profile`).

---

## 7. Admin / Recruiter Dashboard

| Tab | Content |
|-----|---------|
| Overview | Stats cards, applicant status donut chart |
| Jobs | CRUD — create, edit, delete, close jobs |
| Applicants | List with shortlist, reject, schedule interview |
| AI Generator | Generate job descriptions from title + skills |

**Recruiter isolation:** Each admin sees only their own jobs, applicants, and stats. **Unique Candidates** count (not total platform users).

---

## 8. Real-Time Chat

| Feature | Description |
|---------|-------------|
| WebSocket Chat | `ws://host/ws/chat` with JWT handshake |
| Recruiter Initiates | Only admin can start new conversations |
| Candidate Reply | Candidates see recruiters after first message |
| Contact List | Unread badges per contact |
| Message from Applicant Modal | Redirect to messages tab with user selected |

---

## 9. Notifications

| Type | Trigger |
|------|---------|
| Application submitted | Candidate applies |
| Status updated | Admin changes application status |
| Interview scheduled | Admin schedules interview |
| New message | Chat message received |
| Job posted | New job created |

Unread count badge in navbar. Notification panel with mark-as-read.

---

## 10. AI Features

| Feature | Location | Description |
|---------|----------|-------------|
| Job Description Generator | Admin → AI Generator | Template engine + optional OpenAI |
| Resume Match Score | Job application | Compares job skills vs candidate skills |
| OpenAI Integration | `AiService.java` | Enable with `OPENAI_ENABLED=true` + API key |

---

## 11. UI/UX Polish

- Responsive design (mobile-first, Tailwind CSS)
- Dark mode with system preference
- Toast notifications (react-hot-toast)
- Loading spinners and skeleton states
- 404 error page
- Form validation with inline error messages
- Recharts analytics (donut, bar charts)
- Accessible file upload boxes and modals

---

## 12. DevOps & Deployment

| Feature | File |
|---------|------|
| GitHub Actions CI | `.github/workflows/ci.yml` |
| GitHub Actions Deploy | `.github/workflows/deploy.yml` |
| Vercel Config | `frontend/vercel.json` |
| Render Blueprint | `render.yaml` |
| MySQL Schema | `database/schema.sql` |
| Environment Examples | `frontend/.env.example`, `backend/.env.example` |

---

## API Reference

See [API.md](API.md) for full endpoint documentation.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design.
