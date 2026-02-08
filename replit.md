# Learnpro AI

## Overview
Learnpro AI is an AI-powered learning platform for UPSC and State PSC exam preparation. It uses Gemini 2.5 Flash via Replit's AI Integrations for streaming chat responses.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui, port 5000
- **Backend**: Express 5 (TypeScript) with SSE streaming
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Auth**: Replit Auth (OIDC)
- **File Storage**: Replit Object Storage (Google Cloud Storage)
- **AI**: Gemini 2.5 Flash via Replit AI Integrations

## Key Features
1. **Onboarding Flow** - Multi-step wizard (name, user type, target exam) for new users after login
2. **Personalized Dashboard** - Greeting, quick actions (Chat/Current Affairs/Quiz), daily tips, suggested topics
3. **AI Chat** - Streaming chat with Gemini, conversation history, file attachments
4. **File Upload** - Upload images/PDFs/text files, stored in Object Storage, passed as context to AI
5. **Daily Current Affairs** - AI-generated daily digests with GS paper categorization, revision tracking, calendar view
6. **Practice Quiz** - AI-generated MCQs for UPSC + 15 State PSC exams with exam-specific prompts, score tracking, review mode, and performance analytics
7. **Subscription System** - Free/Pro plan tracking

## Project Structure
```
client/src/
  pages/          - onboarding-page, dashboard-page, chat-page, current-affairs-page, practice-quiz-page, landing-page, subscription-page
  components/
    chat/         - chat-input (with file upload), message-bubble (with attachment previews)
    layout/       - sidebar (with Current Affairs + Practice Quiz nav links)
    ui/           - shadcn components
  hooks/          - use-auth, use-chat, use-current-affairs, use-quiz, use-subscription

server/
  routes.ts       - Main route registration
  storage.ts      - Subscription storage
  current-affairs-routes.ts - Current affairs API
  quiz-routes.ts  - Practice quiz API (generate, submit, history, analytics)
  replit_integrations/
    auth/          - Replit Auth
    chat/          - Chat routes with Gemini streaming + attachment context
    object_storage/ - File upload/download via presigned URLs

shared/
  schema.ts       - All DB schema exports
  models/
    auth.ts        - Users table
    chat.ts        - Conversations, messages (with attachments jsonb)
    current-affairs.ts - Daily digests, daily topics
    quiz.ts        - Quiz attempts, quiz questions
```

## Database Schema
- **users** - Replit Auth users (with displayName, userType, targetExam, onboardingCompleted)
- **conversations** - Chat conversation titles
- **messages** - Chat messages with attachments (jsonb)
- **subscriptions** - User subscription plans
- **daily_digests** - One per date, stores digest generation timestamp
- **daily_topics** - Topics per digest with title, summary, category, gsCategory, relevance, revised flag
- **quiz_attempts** - Quiz attempts with userId, examType, gsCategory, difficulty, totalQuestions, score, completedAt
- **quiz_questions** - Questions per attempt with question, options (text[]), correctIndex, explanation, userAnswer, isCorrect

## API Routes
- `POST /api/onboarding` - Submit onboarding data (displayName, userType, targetExam)
- `GET/POST/DELETE /api/conversations` - Chat CRUD
- `POST /api/conversations/:id/messages` - Send message + stream AI response (SSE)
- `POST /api/uploads/request-url` - Get presigned upload URL
- `GET /objects/:path` - Serve uploaded files
- `GET /api/current-affairs/:date` - Get digest for date
- `POST /api/current-affairs/generate/:date` - Generate AI digest
- `PATCH /api/current-affairs/topics/:id/revise` - Toggle revision
- `GET /api/current-affairs/stats/revision` - Revision statistics
- `GET /api/current-affairs-dates` - List dates with digests
- `POST /api/quizzes/generate` - Generate AI quiz (body: examType, gsCategory, difficulty, numQuestions)
- `GET /api/quizzes/history` - List user's quiz attempts
- `GET /api/quizzes/analytics` - Performance analytics by GS paper
- `GET /api/quizzes/:id` - Get quiz attempt with questions
- `POST /api/quizzes/:id/submit` - Submit quiz answers

## Recent Changes
- 2026-02-08: Added multi-step onboarding flow (name, user type, target exam) and personalized dashboard with greeting, quick actions, daily tips, suggested topics
- 2026-02-08: Refined exam list to UPSC + 15 State PSCs (JPSC, BPSC, JKPSC, UPPSC, MPPSC, RPSC, OPSC, HPSC, UKPSC, HPPSC, APSC Assam, Meghalaya PSC, Sikkim PSC, Tripura PSC, Arunachal PSC). Each exam uses actual paper structure from official syllabus (exam-specific categories, not generic GS-I/II). Added state-specific current affairs filtering with 15 states supported for State PSC candidates.
- 2026-02-08: Added Practice Quiz feature with AI-generated MCQs, score tracking, review mode, performance analytics
- 2026-02-08: Added file upload support with Object Storage, attachment previews in messages, file context for AI
- 2026-02-08: Added Daily Current Affairs with AI generation, calendar view, GS categorization, revision tracking
- 2026-02-08: Updated homepage with toolkit features section matching design mockup
