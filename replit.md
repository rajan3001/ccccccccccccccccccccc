# Learnpro AI

### Overview
Learnpro AI is an AI-powered learning platform designed for UPSC and State PSC exam preparation. It aims to provide a comprehensive and personalized study experience, leveraging AI for content generation, evaluation, and study planning. The platform supports a multi-step onboarding process, a personalized dashboard, and covers key features such as AI Chat, Daily Current Affairs, Practice Quizzes, Answer Sheet Evaluation, Note-taking, and a Study Planner. Its core vision is to streamline and enhance the preparation journey for competitive civil services exams, offering a competitive edge through intelligent tools and personalized guidance.

### User Preferences
- I prefer clear and concise communication.
- I appreciate detailed explanations for complex topics.
- I expect an iterative development approach, with regular updates and feedback opportunities.
- Please ask for confirmation before making significant architectural changes or adding new major dependencies.
- Ensure the AI features are tightly integrated and contextually relevant to exam preparation.

### System Architecture
The Learnpro AI platform is built with a modern web stack. The frontend is developed using **React, Vite, TailwindCSS, and shadcn/ui**, served on port 5000. The backend is an **Express 5 (TypeScript)** application that utilizes SSE for streaming responses, particularly for AI chat interactions. Data persistence is managed by **PostgreSQL**, hosted via Neon on Replit.

**Key Architectural Decisions & Features:**
- **Authentication**: Custom Phone OTP authentication via Twilio SMS, with session persistence for 30 days.
- **File Storage**: Replit Object Storage (leveraging Google Cloud Storage) for user uploads like answer sheets and attachments. Includes local filesystem fallback (`.uploads/` directory) when Object Storage bucket is not provisioned. The fallback auto-detects availability on startup and provides the same API interface (`/api/uploads/request-url` → presigned URL or local PUT endpoint).
- **AI Integration**: Gemini 2.5 Flash via Replit AI Integrations for all AI-driven functionalities, including chat, content generation (Current Affairs, Quizzes), and evaluations.
- **UI/UX**: Features a multi-step onboarding wizard, a personalized dashboard, and a consistent design language using shadcn/ui. Client-side PDF generation with Learnpro branding is implemented for various reports.
- **Core Modules**:
    - **AI Chat**: Streaming responses, conversation history, and file attachment support for contextual AI interactions.
    - **Daily Current Affairs**: AI-generated digests with GS paper categorization, revision tracking, sourced from NextIAS (with fallback to AI generation). Supports state-specific current affairs. Features horizontal date strip navigation (14 days), auto-selection of latest available date, GS category filters, topics grouped by category, and prev/next topic navigation on detail pages.
    - **Practice Quiz**: AI-generated MCQs tailored for UPSC and 15 State PSC exams, including score tracking and performance analytics.
    - **Answer Sheet Evaluation**: AI-powered evaluation of uploaded answer sheets against UPSC/State PSC norms, providing detailed scores, competency analysis across 7 parameters, and per-question feedback. Supports optional question paper uploads for context.
    - **My Notes**: Allows saving AI chat responses as structured notes with markdown support, categorization, tags, folders, and spaced repetition for review.
    - **Study Planner**: Comprehensive module for building weekly timetables, tracking UPSC and State PSC syllabus progress, setting daily goals, and analyzing weak areas based on quiz performance. Includes AI-powered timetable and goal generation.
    - **Study Progress**: Dashboard showing 90-day streak calendar (GitHub-style contributions), daily study time chart (30 days), GS paper coverage with accuracy bars, exam-wise performance, motivational messages, and recent study topics. Derives data from existing chat/quiz/notes activity.
    - **SEO Articles System**: Data-driven article generation using Gemini AI. Server-rendered HTML for SEO. Features: 100+ cluster-based UPSC topic templates (data tables, trend analysis, comparison articles), premium AI cover images, full SEO meta (OG, Twitter Cards, JSON-LD), sitemap.xml/robots.txt, 90-min scheduled generation. Manual triggers: `POST /api/blog/generate`, `POST /api/blog/scrape`, `POST /api/blog/clear-all`. Routes in `server/blog-routes.ts`.
    - **PYQ Practice System**: Complete Previous Year Question bank with PDF ingestion pipeline. Features: Admin uploads UPSC/JPSC PDFs → text extraction (pdf-parse + Gemini OCR fallback for scanned PDFs) → chunk-based AI structuring (10-15 Qs per chunk) → validation → taxonomy-constrained topic classification + difficulty → textHash deduplication → database insert. `examStage` field ("Prelims"/"Mains") separates stages throughout. Prelims = instant MCQ scoring; Mains = AI evaluation with structured rubric (Introduction/Body/Conclusion/ContentCoverage + strengths/improvements). Topic trends with weighted predictions (freq×0.6 + recency×0.3 + streak×0.1). "Asked Before" tags integrated in Chat, Current Affairs, and Study Planner. Controlled taxonomy: 14 topics, 80+ subtopics. Admin CRUD, bulk JSON import. Tables: `pyq_questions`, `pyq_attempts`. Routes: `server/pyq-routes.ts`. Frontend: `client/src/pages/pyq-page.tsx` at `/pyq`. Admin section in admin panel under "PYQ Bank".
    - **Content Scraping Pipeline**: 8 sources (Drishti, Vajiram, Vision, Adda247, SPM, PW, StudyIQ, NextIAS). AI rewrites with data requirements: 2 tables per article, trend analysis, comparison data, internal linking, banned AI-language list (50+ phrases). Runs every 90 minutes, max 5 per source. Module: `server/blog-scraper.ts`.
    - **AI Content Quality (YMYL-Safe)**: Prompts enforce: YMYL anti-hallucination (no fabricated statistics about aspirants/candidates, no "studies show" without named source, no invented percentages). Only verifiable data allowed (UPSC annual reports, cut-off marks, question counts from past papers, government budget figures, Constitutional provisions). Anecdotal framing required when exact data unavailable. Single search intent per article. 50+ banned AI phrases. No sales-disguised-as-analysis. English only. Voice: direct mentor, not coaching center blog.
    - **Blog Design**: Warm amber/gold theme throughout (zero blue). Source Serif 4 for headings, Inter for body. Listing page: warm dark amber hero, category tabs with arrows, right sidebar (date/month archives, tags, CTA). Article detail: amber tables with full borders, FAQ accordion, ToC sidebar, related articles. All server-rendered with inline CSS.
    - **Content Freshness Filter**: `isStaleOrIrrelevant()` function blocks generic/evergreen content (syllabus, eligibility, exam dates, old year references, Hindi titles, navigation text). Title cleaner strips dates and source branding. English-only enforcement in AI prompt.
- **PDF Export**: Client-side PDF generation for Chat, Current Affairs, and Evaluation reports, incorporating Learnpro branding (logo, watermark, footer).
- **User Profile & Settings**: Learner profile popup with avatar, name, plan, and links to settings including Billing. Notification Settings tab shows "Coming Soon" placeholder.
- **Multilingual i18n**: Full internationalization across all pages. Architecture: `client/src/i18n/languages.ts` (14 supported languages), `client/src/i18n/translations.ts` (curated translations for en/hi/bn/gu/mr, others fallback to English), `client/src/i18n/context.tsx` (LanguageProvider + useLanguage hook). Language stored in DB (`users.language`), localStorage, and context. All pages translated: Dashboard, Settings, Study Progress, Practice Quiz, Chat, Login, Notes, Study Planner, Current Affairs (both list + detail), Paper Evaluation, Landing page, and Sidebar.

### Domain Portability
All domain references use the `SITE_DOMAIN` environment variable (server-side) and `VITE_SITE_DOMAIN` (client-side), defaulting to `learnproai.in`. When transferring to a new domain:
1. Set `SITE_DOMAIN` env var to the new domain (e.g., `newdomain.com`)
2. Set `VITE_SITE_DOMAIN` to the same value for client-side references
3. Update `CUSTOM_DOMAIN` for Google OAuth callback URLs
4. All user data (accounts, progress, subscriptions, conversations, notes, quiz scores) is stored in PostgreSQL and fully preserved across domain/DNS changes
5. Sessions are cookie-based without a fixed domain — users will need to re-login on the new domain, but all their data remains intact
6. Object Storage files are domain-independent (Google Cloud Storage)

### Admin Panel
- **URL**: `/admin` — server-rendered HTML dashboard with left sidebar navigation
- **Auth**: HTTP Basic Auth using `ADMIN_USER` and `ADMIN_PASS` env vars (defaults: `admin` / `admin@learnpro2026`)
- **Sections**: Dashboard (stats + recent users), Users, Subscriptions, Conversations, Current Affairs, Quizzes, Evaluations, Notes, Articles, Backup & Import
- **Backup & Import System**: Full database export/import with upsert logic. Export downloads all data as JSON. Import uses phone-number matching for users (existing progress never lost), ID-based deduplication for all other records. Supports unlimited re-imports without data loss. API: `GET /admin/api/export`, `POST /admin/api/import`. Body limit: 200MB for large imports.
- **API Endpoints**: All under `/admin/api/*` with pagination support
- **File**: `server/admin-routes.ts`

### External Dependencies
- **Gemini 2.5 Pro**: Via Replit AI Integrations for chat (with Google Search grounding for real-time data). Gemini 2.5 Flash used for blog generation, suggestions, and lighter tasks.
- **PostgreSQL (Neon)**: Database for all application data.
- **SMSGatewayHub**: For Phone OTP authentication via Indian SMS gateway (requires API Key, Sender ID, Entity ID, DLT Template ID).
- **Google OAuth**: Direct Google login via OIDC (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET). Button only shows when credentials are configured.
- **Replit Object Storage (Google Cloud Storage)**: For file uploads and storage.
- **Razorpay**: Payment gateway for subscription management. Plans: Monthly (₹299), 6 Months (₹1,200), Yearly (₹2,000). Server-side order creation + HMAC-SHA256 signature verification. Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars. Uses Razorpay Subscriptions API for recurring auto-pay (not one-time orders).
- **Recharts**: For interactive data visualizations on the dashboard (e.g., weekly goals chart).
- **NextIAS Scraper**: For sourcing current affairs topics (primary source).