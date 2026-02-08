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
1. **AI Chat** - Streaming chat with Gemini, conversation history, file attachments
2. **File Upload** - Upload images/PDFs/text files, stored in Object Storage, passed as context to AI
3. **Daily Current Affairs** - AI-generated daily digests with GS paper categorization, revision tracking, calendar view
4. **Subscription System** - Free/Pro plan tracking

## Project Structure
```
client/src/
  pages/          - chat-page, current-affairs-page, landing-page, subscription-page
  components/
    chat/         - chat-input (with file upload), message-bubble (with attachment previews)
    layout/       - sidebar (with Current Affairs nav link)
    ui/           - shadcn components
  hooks/          - use-auth, use-chat, use-current-affairs, use-subscription

server/
  routes.ts       - Main route registration
  storage.ts      - Subscription storage
  current-affairs-routes.ts - Current affairs API
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
```

## Database Schema
- **users** - Replit Auth users
- **conversations** - Chat conversation titles
- **messages** - Chat messages with attachments (jsonb)
- **subscriptions** - User subscription plans
- **daily_digests** - One per date, stores digest generation timestamp
- **daily_topics** - Topics per digest with title, summary, category, gsCategory, relevance, revised flag

## API Routes
- `GET/POST/DELETE /api/conversations` - Chat CRUD
- `POST /api/conversations/:id/messages` - Send message + stream AI response (SSE)
- `POST /api/uploads/request-url` - Get presigned upload URL
- `GET /objects/:path` - Serve uploaded files
- `GET /api/current-affairs/:date` - Get digest for date
- `POST /api/current-affairs/generate/:date` - Generate AI digest
- `PATCH /api/current-affairs/topics/:id/revise` - Toggle revision
- `GET /api/current-affairs/stats/revision` - Revision statistics
- `GET /api/current-affairs-dates` - List dates with digests

## Recent Changes
- 2026-02-08: Added file upload support with Object Storage, attachment previews in messages, file context for AI
- 2026-02-08: Added Daily Current Affairs with AI generation, calendar view, GS categorization, revision tracking
- 2026-02-08: Updated homepage with toolkit features section matching design mockup
