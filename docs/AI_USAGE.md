# AI Usage Documentation

This project was built using **Cursor AI** as the primary development assistant, following the assessment requirement to demonstrate AI-assisted full-stack development.

## How AI Was Used

### 1. Architecture & Planning
- Generated complete system architecture (frontend/backend separation)
- Designed database schema with ER relationships
- Defined REST API contract before implementation

### 2. Backend Generation
- Spring Boot entities, repositories, services, controllers
- JWT security configuration
- Global exception handling and validation
- AI service with OpenAI integration placeholder

### 3. Frontend Generation
- React component library (Navbar, JobCard, Layout)
- All pages: Home, Jobs, Dashboard, Admin, Chat
- Tailwind CSS responsive styling with dark mode
- Axios API integration with auth interceptors

### 4. DevOps
- GitHub Actions CI/CD workflows
- Vercel and Render deployment configuration
- Environment variable documentation

### 5. Documentation
- README, API docs, feature list, architecture diagrams
- Deployment guide with step-by-step instructions

## AI Features in the Application

### Job Description Generator
- **Location**: Admin Dashboard → AI Generator tab
- **Input**: Job title, skills, company, location
- **Output**: Professional markdown job description
- **Implementation**: Template engine with optional OpenAI API
- **Enable OpenAI**: Set `OPENAI_ENABLED=true` and `OPENAI_API_KEY` env vars

### Resume Match Score
- **Trigger**: When candidate applies for a job
- **Algorithm**: Compares job skills vs candidate profile skills
- **Score**: 0-100% displayed on application cards
- **Future**: Can integrate OpenAI embeddings for semantic matching

### Skill Suggestions (Extensible)
The `AiService` class is designed to accept OpenAI Chat Completions:

```java
// Production integration point in AiService.java
if (openAiEnabled && openAiApiKey != null) {
    // Call OpenAI API with jobTitle + skills prompt
}
```

## Prompts Used (Assessment Workflow)

1. **Architecture prompt** — System design, tech stack, folder structure
2. **Database schema prompt** — Tables, relationships, SQL
3. **Backend prompt** — Spring Boot entities, JWT, services, controllers
4. **Frontend prompt** — React pages, Tailwind UI, dark mode
5. **Chat module prompt** — WebSocket real-time messaging
6. **Profile module prompt** — Naukri-style profile, Cloudinary avatars
7. **AI module prompt** — Job description generator, match score
8. **Auth module prompt** — Forgot password OTP via Brevo email
9. **CI/CD prompt** — GitHub Actions CI + Vercel/Render deploy
10. **Documentation prompt** — Features, API, deployment, submission guide

## Recommendations for Production AI

1. Add OpenAI API key via environment variables
2. Implement rate limiting on `/api/ai/*` endpoints
3. Add caching for repeated job description requests
4. Use embeddings for semantic resume-job matching
5. Add AI candidate ranking in admin applicant view
