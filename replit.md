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
- **File Storage**: Replit Object Storage (leveraging Google Cloud Storage) for user uploads like answer sheets and attachments.
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
    - **SEO Blog System**: Automated blog generation using Gemini AI for UPSC content. Server-rendered HTML for optimal SEO (no SPA routing). Features: AI content generation with 80+ UPSC topic templates, AI cover image generation via Gemini 2.5 Flash Image, Object Storage for images, server-rendered `/blog` and `/blog/:slug` with full SEO meta tags (OG, Twitter Cards, JSON-LD Article schema), auto-generated `sitemap.xml` and `robots.txt`, daily scheduled generation (5 posts/day at 4 AM), manual generation trigger via `/api/blog/generate`, blog cards on landing page. Routes in `server/blog-routes.ts`, schema in `shared/models/blog.ts`.
- **PDF Export**: Client-side PDF generation for Chat, Current Affairs, and Evaluation reports, incorporating Learnpro branding (logo, watermark, footer).
- **User Profile & Settings**: Learner profile popup with avatar, name, plan, and links to settings including Billing. Notification Settings tab shows "Coming Soon" placeholder.
- **Multilingual i18n**: Full internationalization across all pages. Architecture: `client/src/i18n/languages.ts` (14 supported languages), `client/src/i18n/translations.ts` (curated translations for en/hi/bn/gu/mr, others fallback to English), `client/src/i18n/context.tsx` (LanguageProvider + useLanguage hook). Language stored in DB (`users.language`), localStorage, and context. All pages translated: Dashboard, Settings, Study Progress, Practice Quiz, Chat, Login, Notes, Study Planner, Current Affairs (both list + detail), Paper Evaluation, Landing page, and Sidebar.

### External Dependencies
- **Gemini 2.5 Flash**: Via Replit AI Integrations for all AI functionalities.
- **PostgreSQL (Neon)**: Database for all application data.
- **SMSGatewayHub**: For Phone OTP authentication via Indian SMS gateway (requires API Key, Sender ID, Entity ID, DLT Template ID).
- **Google OAuth**: Direct Google login via OIDC (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET). Button only shows when credentials are configured.
- **Replit Object Storage (Google Cloud Storage)**: For file uploads and storage.
- **Razorpay**: Payment gateway for subscription management. Plans: Monthly (₹299), 6 Months (₹1,200), Yearly (₹2,000). Server-side order creation + HMAC-SHA256 signature verification. Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars. Uses Razorpay Subscriptions API for recurring auto-pay (not one-time orders).
- **Recharts**: For interactive data visualizations on the dashboard (e.g., weekly goals chart).
- **NextIAS Scraper**: For sourcing current affairs topics (primary source).