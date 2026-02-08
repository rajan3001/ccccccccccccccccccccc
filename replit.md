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
7. **Answer Sheet Evaluation** - Upload answer sheets (PDF/JPG/PNG), AI evaluates per UPSC/State PSC norms, returns detailed scores, competency analysis, per-question feedback
8. **Subscription System** - Free/Pro plan tracking
9. **PDF Export** - Client-side PDF generation with Learnpro branding (logo header, watermark, footer) for Chat, Current Affairs, and Evaluation reports
10. **My Notes** - Save AI chat responses as notes with GS category, tags, folder organization, markdown editor, search/filter, PDF/markdown export, and spaced repetition review reminders
11. **Study Planner** - Weekly timetable builder, UPSC syllabus tracker (GS Paper I-IV), daily study goals, preparation dashboard with weak areas analysis

## Project Structure
```
client/src/
  pages/          - onboarding-page, dashboard-page, chat-page, current-affairs-page, practice-quiz-page, paper-evaluation-page, notes-page, landing-page, subscription-page, study-planner-page
  components/
    chat/         - chat-input (with file upload), message-bubble (with attachment previews, save as note)
    layout/       - sidebar (with Current Affairs, Practice Quiz, Answer Evaluation, My Notes, Study Planner nav links)
    ui/           - shadcn components
  hooks/          - use-auth, use-chat, use-current-affairs, use-quiz, use-subscription, use-notes, use-study-planner
  lib/
    pdf-generator.ts - Client-side PDF generation with Learnpro branding

server/
  routes.ts       - Main route registration
  storage.ts      - Subscription storage
  current-affairs-routes.ts - Current affairs API
  quiz-routes.ts  - Practice quiz API (generate, submit, history, analytics)
  evaluation-routes.ts - Paper evaluation API (create, history, results)
  notes-routes.ts - Notes CRUD, search/filter, spaced repetition API
  study-planner-routes.ts - Study planner API (timetable, syllabus tracker, daily goals, dashboard)
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
    notes.ts       - Notes with spaced repetition (title, content, gsCategory, tags, folder, reviewCount, nextReviewAt)
    study-planner.ts - Timetable slots, syllabus topics, user syllabus progress, daily study goals
```

## Database Schema
- **users** - Replit Auth users (with displayName, userType, targetExams jsonb array, onboardingCompleted)
- **conversations** - Chat conversation titles
- **messages** - Chat messages with attachments (jsonb)
- **subscriptions** - User subscription plans
- **daily_digests** - One per date, stores digest generation timestamp
- **daily_topics** - Topics per digest with title, summary, category, gsCategory, relevance, revised flag
- **quiz_attempts** - Quiz attempts with userId, examType, gsCategory, difficulty, totalQuestions, score, completedAt
- **quiz_questions** - Questions per attempt with question, options (text[]), correctIndex, explanation, userAnswer, isCorrect
- **evaluation_sessions** - Answer sheet evaluation sessions with userId, examType, paperType, fileName, fileObjectPath, totalMarks (nullable), totalQuestions (nullable), questionsAttempted (nullable), questionPaperObjectPath (nullable), status, totalScore, maxScore, overallFeedback, competencyFeedback (jsonb with 7 parameters: Contextual Understanding, Introduction Proficiency, Language, Word Limit Adherence, Conclusion, Value Addition, Presentation - each with score/10, strengths, improvements)
- **evaluation_questions** - Per-question evaluation with score, maxScore, strengths, improvements, detailedFeedback, introductionFeedback, bodyFeedback, conclusionFeedback
- **notes** - User study notes with title, content (markdown), gsCategory, tags (jsonb), folder, sourceMessageId, sourceConversationId, reviewCount, lastReviewedAt, nextReviewAt (spaced repetition)
- **timetable_slots** - Weekly study timetable (userId, dayOfWeek, startTime, endTime, gsPaper, subject, notes)
- **syllabus_topics** - Exam-specific syllabus topics (examType, gsPaper, parentTopic, topic, orderIndex) - seeded automatically for all 16 exams (UPSC + 15 State PSCs)
- **user_syllabus_progress** - Per-user topic completion tracking (userId, topicId, completed, completedAt)
- **daily_study_goals** - Daily study goals (userId, goalDate, title, completed)

## API Routes
- `POST /api/onboarding` - Submit onboarding data (displayName, userType, targetExams[])
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
- `POST /api/evaluations` - Create answer sheet evaluation (body: examType, paperType, fileName, fileObjectPath, totalMarks?, totalQuestions?, questionsAttempted?, questionPaperObjectPath?) - either question paper OR manual fields required
- `GET /api/evaluations` - List user's evaluations
- `GET /api/evaluations/:id` - Get evaluation result with per-question feedback
- `GET /api/notes` - List user's notes (query: search, gsCategory, folder, tag, dueForReview)
- `POST /api/notes` - Create note (body: title, content, gsCategory?, tags?, folder?, sourceMessageId?, sourceConversationId?)
- `GET /api/notes/folders` - List unique folders
- `GET /api/notes/tags` - List unique tags
- `GET /api/notes/due-count` - Count notes due for review
- `GET /api/notes/:id` - Get single note
- `PATCH /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/review` - Mark note as reviewed (updates spaced repetition schedule)
- `GET /api/study-planner/timetable` - Get user's weekly timetable slots
- `POST /api/study-planner/timetable` - Create timetable slot (body: dayOfWeek, startTime, endTime, gsPaper, subject)
- `DELETE /api/study-planner/timetable/:id` - Delete timetable slot
- `GET /api/study-planner/syllabus` - Get all syllabus topics with user's completion status
- `PATCH /api/study-planner/syllabus/:topicId` - Toggle topic completion
- `GET /api/study-planner/daily-goals?date=` - Get daily goals for date
- `POST /api/study-planner/daily-goals` - Create daily goal (body: title, goalDate)
- `PATCH /api/study-planner/daily-goals/:id` - Toggle goal completion
- `DELETE /api/study-planner/daily-goals/:id` - Delete daily goal
- `GET /api/study-planner/dashboard` - Dashboard with overall progress, per-paper progress, weak areas from quiz data, recommended topics, today's goals
- `POST /api/study-planner/ai-generate-timetable` - AI generates a practical weekly timetable based on user's target exams and pending syllabus topics (body: targetExams[])
- `POST /api/study-planner/ai-generate-goals` - AI generates daily study goals based on target exams, pending topics, and timetable (body: targetExams[], date)

## Recent Changes
- 2026-02-08: Added multi-step onboarding flow (name, user type, target exam) and personalized dashboard with greeting, quick actions, daily tips, suggested topics
- 2026-02-08: Refined exam list to UPSC + 15 State PSCs (JPSC, BPSC, JKPSC, UPPSC, MPPSC, RPSC, OPSC, HPSC, UKPSC, HPPSC, APSC Assam, Meghalaya PSC, Sikkim PSC, Tripura PSC, Arunachal PSC). Each exam uses actual paper structure from official syllabus (exam-specific categories, not generic GS-I/II). Added state-specific current affairs filtering with 15 states supported for State PSC candidates.
- 2026-02-08: Added Practice Quiz feature with AI-generated MCQs, score tracking, review mode, performance analytics
- 2026-02-08: Added file upload support with Object Storage, attachment previews in messages, file context for AI
- 2026-02-08: Added Daily Current Affairs with AI generation, calendar view, GS categorization, revision tracking
- 2026-02-08: Updated homepage with toolkit features section matching design mockup
- 2026-02-08: Enhanced Answer Sheet Evaluation with manual input fields (totalMarks, totalQuestions, questionsAttempted), instructions dialog, 7 evaluation parameters (Contextual Understanding, Introduction Proficiency, Language, Word Limit Adherence, Conclusion, Value Addition, Presentation), pointwise overall feedback, parameter scores out of 10, dynamic exam-specific paper types
- 2026-02-08: Added optional Question Paper upload to Answer Sheet Evaluation - students can either upload a question paper (AI extracts details) OR fill in manual fields (totalMarks, totalQuestions, questionsAttempted). Uploading question paper hides manual fields. Backend sends question paper as additional context to AI.
- 2026-02-08: Added PDF Export with Learnpro branding (logo header on every page, watermark, footer text) for Chat, Current Affairs, and Evaluation reports
- 2026-02-08: Added My Notes feature - save AI chat responses as notes with GS category, tags, folder organization, markdown editor, search/filter, PDF/markdown export, and spaced repetition review reminders
- 2026-02-08: Enhanced chat UX - action bar at end of each AI message (Save, Copy, Download as PDF with labels and icons), chat suggestions panel ("You can also ask" with contextual prompts like Create Prelims MCQs, Write Mains Answer, How to Write Answers, etc.)
- 2026-02-08: Improved markdown rendering - better heading hierarchy (h1-h6), darker/bolder text colors, stronger bold text, table support, improved list formatting
- 2026-02-08: Overhauled PDF generator - proper markdown parsing (headings, bold, numbered lists, bullet lists), darker text colors, blue accent under headings, structured evaluation reports with labeled sections
- 2026-02-08: Added Study Planner with weekly timetable builder, syllabus tracker for all 16 exams (UPSC + 15 State PSCs with exam-specific papers and state special topics), daily study goals, and preparation dashboard with weak areas analysis from quiz performance. Syllabus tab shows exam-specific content based on user's selected target exams with an exam selector dropdown.
- 2026-02-08: Added AI-powered timetable and goals generation in Study Planner - Gemini generates practical weekly timetable (25-30 slots) and daily goals (6-10) based on target exams and pending syllabus topics
- 2026-02-08: Improved Current Affairs - now sources from The Hindu, Indian Express, and state-specific newspapers (15 state newspapers mapped). Each topic shows newspaper source name. Renamed "Ask AI" to "Read in Detail" which opens comprehensive AI analysis in chat. Updated prompts to pick real news articles, not random content.
