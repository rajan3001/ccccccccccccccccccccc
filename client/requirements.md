## Packages
react-markdown | For rendering formatted AI responses
framer-motion | For smooth interface transitions and animations
date-fns | For timestamp formatting
clsx | Utility for conditional classes (if not already present)
tailwind-merge | Utility for class merging (if not already present)

## Notes
- App uses Replit Auth (`useAuth` hook)
- Chat streaming uses SSE (Server-Sent Events) at POST /api/conversations/:id/messages
- Primary color theme: Gold/Brown to match "Learnpro AI" branding (UPSC/Education theme)
- Logo image available at @assets/favicon_final_1770477519331.png
