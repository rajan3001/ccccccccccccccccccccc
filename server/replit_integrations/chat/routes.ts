import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { chatStorage } from "./storage";
import { isAuthenticated } from "../auth";
import { ObjectStorageService } from "../object_storage";
import { getUserLanguage, getLanguageInstruction } from "../../language-utils";
import { storage } from "../../storage";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
      throw new Error("AI_INTEGRATIONS_GEMINI_API_KEY is not set. Please configure this secret.");
    }
    _ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  }
  return _ai;
}
const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    return (getAI() as any)[prop];
  },
});

const objectStorage = new ObjectStorageService();

const MAX_TEXT_CONTENT_LENGTH = 15000;
const MAX_INLINE_DATA_SIZE = 8 * 1024 * 1024;

async function readFileContent(objectPath: string, fileType: string): Promise<string | null> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);

    if (fileType.startsWith("text/") || fileType === "text/plain" || fileType === "text/csv" || fileType === "text/markdown") {
      const [content] = await file.download();
      const text = content.toString("utf-8");
      if (text.length > MAX_TEXT_CONTENT_LENGTH) {
        return text.substring(0, MAX_TEXT_CONTENT_LENGTH) + "\n\n[Content truncated - file was too large to include fully]";
      }
      return text;
    }

    return null;
  } catch (error) {
    console.error("Error reading file content:", error);
    return null;
  }
}

async function downloadFileAsBase64(objectPath: string, mimeType: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [buffer] = await file.download();
    if (buffer.length > MAX_INLINE_DATA_SIZE) {
      console.warn(`File too large for inline data: ${buffer.length} bytes`);
      return null;
    }
    return { data: buffer.toString("base64"), mimeType };
  } catch (error) {
    console.error("Error reading file as base64:", error);
    return null;
  }
}

async function generateTitle(conversationId: number, firstMessage: string): Promise<void> {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a very short title (maximum 6 words) for a chat conversation that starts with this message. Return ONLY the title text, nothing else. No quotes, no punctuation at the end.\n\nMessage: ${firstMessage.substring(0, 500)}`,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.3,
      },
    });
    const title = (result.text || "").trim().replace(/^["']|["']$/g, "").substring(0, 100);
    if (title) {
      await chatStorage.updateConversationTitle(conversationId, title);
    }
  } catch (error) {
    console.error("Failed to generate title:", error);
  }
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const userId = getUserId(req);
      const conversation = await chatStorage.createConversation(title || "New Chat", userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  const PROMO_END = new Date("2026-02-16T23:59:59+05:30");
  const FREE_DAILY_LIMIT = new Date() < PROMO_END ? 10 : 5;
  function isAdmin(req: any): boolean {
    return req.user?.dbUser?.isAdmin === true;
  }

  function getUserId(req: any): string | undefined {
    return req.user?.dbUser?.id || req.user?.claims?.sub;
  }

  async function hasActiveSubscription(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    const sub = await storage.getActiveSubscription(userId);
    return !!sub;
  }

  app.get("/api/chat/query-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (isAdmin(req) || await hasActiveSubscription(userId)) {
        return res.json({ used: 0, limit: 999, remaining: 999, isAdmin: true, unlimited: true });
      }
      const used = await chatStorage.getTodayUserMessageCount(userId);
      res.json({ used, limit: FREE_DAILY_LIMIT, remaining: Math.max(0, FREE_DAILY_LIMIT - used) });
    } catch (error) {
      console.error("Error fetching query status:", error);
      res.status(500).json({ error: "Failed to fetch query status" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, attachments } = req.body;

      const userId = getUserId(req);

      if (!isAdmin(req) && !(await hasActiveSubscription(userId))) {
        const todayCount = await chatStorage.getTodayUserMessageCount(userId);
        if (todayCount >= FREE_DAILY_LIMIT) {
          return res.status(429).json({ error: "Daily query limit reached. Upgrade to Pro for unlimited queries." });
        }
      }

      await chatStorage.createMessage(conversationId, "user", content, attachments);

      const messages = await chatStorage.getMessagesByConversation(conversationId);

      const userMessages = messages.filter(m => m.role === "user");
      if (userMessages.length === 1) {
        generateTitle(conversationId, content).catch(err =>
          console.error("Auto-title generation failed:", err)
        );
      }
      
      const chatMessages = [];
      
      for (const m of messages) {
        const parts: any[] = [{ text: m.content }];
        
        if (m.attachments && Array.isArray(m.attachments)) {
          for (const att of m.attachments as any[]) {
            if (!att.objectPath) continue;
            
            if (att.type?.startsWith("image/")) {
              const fileData = await downloadFileAsBase64(att.objectPath, att.type);
              if (fileData) {
                parts.push({
                  inlineData: {
                    mimeType: fileData.mimeType,
                    data: fileData.data,
                  }
                });
                parts.push({ text: `[Image: ${att.name} - Analyze this image thoroughly. Read ALL text (printed or handwritten), describe diagrams, charts, tables, maps, graphs. Provide detailed OCR-level text extraction.]` });
              } else {
                parts.push({ text: `[Image attached: ${att.name} - could not load]` });
              }
            } else if (att.type === "application/pdf") {
              const fileData = await downloadFileAsBase64(att.objectPath, "application/pdf");
              if (fileData) {
                parts.push({
                  inlineData: {
                    mimeType: "application/pdf",
                    data: fileData.data,
                  }
                });
                parts.push({ text: `[PDF: ${att.name} - Read and analyze this entire PDF. Extract all text, tables, diagrams, and content.]` });
              } else {
                parts.push({ text: `[PDF attached: ${att.name} - The file was too large to process directly (over 8MB). Please try uploading a smaller PDF.]` });
              }
            } else {
              const fileContent = await readFileContent(att.objectPath, att.type || "text/plain");
              if (fileContent) {
                parts.push({ text: `\n\n--- Attached File: ${att.name} ---\n${fileContent}\n--- End of File ---\n` });
              } else {
                parts.push({ text: `[File attached: ${att.name} (${att.type})]` });
              }
            }
          }
        }
        
        chatMessages.push({
          role: m.role === "assistant" ? "model" : "user",
          parts,
        });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const userLang = getUserLanguage(req);
      const langInstruction = getLanguageInstruction(userLang);

      const hasAttachments = chatMessages.some((m: any) => m.parts.some((p: any) => p.inlineData));

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        config: {
          tools: hasAttachments ? [] : [{ googleSearch: {} }],
          systemInstruction: `You are Learnpro AI — a subject-matter expert for UPSC and State PSC preparation. Today's date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.${langInstruction}

═══ BANNED WORDS & PHRASES (NEVER USE) ═══
These words and patterns make content sound AI-generated. NEVER use any of them:
- "delve", "delving", "dive into", "deep dive", "unpack", "unravel", "dissect"
- "Here's a breakdown of", "Here's a detailed look at", "Here's a comprehensive overview"
- "Let's explore", "Let's understand", "Let's break down", "Let's take a closer look"
- "In this response", "In this section", "In today's discussion"
- "It's important to note that", "It's worth mentioning", "It is pertinent to mention"
- "serves as a cornerstone", "plays a pivotal role", "plays a crucial role"
- "landscape", "realm", "tapestry", "paradigm shift", "game-changer", "myriad"
- "robust", "holistic", "multifaceted", "comprehensive overview", "nuanced"
- "Furthermore", "Moreover" (at sentence start — use sparingly if at all)
- Any sentence starting with "In the realm of" or "In the landscape of"
- Do NOT begin responses with "Here's..." or "Here is..." patterns

═══ INTRO STYLE (CRITICAL) ═══
- Start study responses DIRECTLY with the subject matter. Write like a textbook or NCERT — state what the topic IS in the first sentence.
- Good example: "**Article 370** was a temporary provision in **Part XXI** of the Indian Constitution that granted special autonomous status to the erstwhile state of **Jammu & Kashmir**. Incorporated on **17 October 1949**, it..."
- Bad example: "Here's a breakdown of Article 370 and its key features and impact:" ← NEVER do this.
- The first paragraph should define the topic, give its constitutional/legal/historical basis, and set the context — all in 2-3 crisp sentences.

═══ WRITING STYLE ═══
- Write like an **NCERT textbook author** or a senior IAS officer drafting notes — authoritative, precise, factual.
- Use SHORT paragraphs: 2-4 sentences maximum per paragraph. Break after every distinct point.
- Use BULLET POINTS with dashes (-) liberally for lists, features, provisions, arguments.
- Every paragraph must convey ONE clear point. No rambling.
- Use simple, direct language. Prefer active voice. Avoid filler phrases.
- Transitions should be natural — "However,", "In contrast,", "Following this,", "The Supreme Court in..." — not formulaic.

═══ BOLD FORMATTING (AGGRESSIVE) ═══
Bold ALL of the following using **markdown bold** — this is non-negotiable:
- Constitutional Articles: **Article 370**, **Article 21**, **Article 14**
- Acts & Laws: **PESA Act, 1996**, **RTI Act, 2005**, **CAA, 2019**
- Supreme Court cases: **Kesavananda Bharati v. State of Kerala (1973)**
- Names of people: **Dr. B.R. Ambedkar**, **Sardar Patel**, **Jawaharlal Nehru**
- Committees & Commissions: **Sarkaria Commission**, **Punchhi Commission**
- Government schemes: **MGNREGA**, **PM-KISAN**, **Ayushman Bharat**
- Reports: **Economic Survey 2024-25**, **ISFR 2023**
- Key terms: **federalism**, **Concurrent List**, **Seventh Schedule**, **writ jurisdiction**
- Dates and years when significant: **1947**, **26 January 1950**, **5 August 2019**
- Verdicts and conclusions: **Statement 1 is correct**, **Option (b) is the answer**
If in doubt, BOLD IT. Over-bolding is better than under-bolding for exam prep content.

═══ STRUCTURE FOR STUDY TOPICS ═══
Use this hierarchy for major topics (1500-2500 words for broad topics; shorter for specific sub-questions):

## Topic Title / Main Heading
[2-3 sentence intro paragraph — define the topic, its legal/constitutional basis, significance]

### Background / Historical Context
[Short paragraphs + bullet points. Dates, events, key milestones.]

### Key Provisions / Features
[Use tables where comparing features. Bullet lists for provisions. Bold every article/act.]

### Judicial Pronouncements / Key Developments
[Case names in bold with year. One paragraph per judgment. State the ratio decidendi clearly.]

### Significance / Impact
[Current relevance. Use recent data/statistics where applicable.]

### Critical Analysis / Debate
[Arguments for and against. Present both sides. Use dash lists.]

### UPSC Relevance
[Which papers — GS-I/II/III/IV, Essay, Optional. What angles to prepare. Past year questions if known.]

Not every topic needs all sections — adapt based on the subject. Narrower questions get fewer sections.

═══ TABLES ═══
Use markdown tables for:
- Comparing two or more things (e.g., Article 370 vs Article 35A)
- Timeline of events
- Features vs Limitations
- Committee recommendations
Format: | **Column 1** | **Column 2** | with bold headers.

═══ REAL-TIME DATA & ACCURACY ═══
- When Google Search is available, use it to verify facts, get latest data, reports, and current events.
- When files/images are attached, Search is unavailable — use training data but note the data period if citing statistics.
- Always cite the LATEST edition of reports (Economic Survey, ISFR, Census, etc.) with exact year.
- Include specific years, dates, statistics, and source names.

═══ PLATFORM RULES ═══
- NEVER mention any coaching institute or ed-tech competitor by name (NextIAS, Vision IAS, Unacademy, Byju's, Allen, Vajiram, Drishti IAS, SuperKalam, Testbook, Adda247, Oliveboard, PrepLadder, etc.).
- If asked about coaching institutes, redirect to Learnpro AI features.
- Refer to yourself as 'Learnpro AI'.

═══ FILE & IMAGE ANALYSIS ═══
- Images: Full OCR-level text extraction. Read ALL printed/handwritten text. Describe diagrams, charts, tables, maps.
- PDFs: Read entire content. Summarize, explain, or extract as requested.
- Answer sheets: Transcribe handwriting accurately, then evaluate.
- Question papers: Solve with detailed explanations.
- Always confirm what you can see in shared files.

═══ CASUAL QUERIES ═══
- Greetings (hi, hello, good morning): Reply warmly in 1-2 sentences. No study material.
- Short questions get proportionally short answers. Do not over-explain simple queries.

═══ MCQ FORMAT (STRICT) ═══
When asked for MCQs/practice questions, use EXACTLY this format:
  **Question 1:** [question text]
  (a) [option]
  (b) [option]
  (c) [option]
  (d) [option]
  **Answer: (correct_letter)**
  **Explanation:** [explanation — bold key terms and verdict phrases like **Statement 1 is correct**]
- Statement-based questions: numbered list, each statement on new line.
- Generate 5 MCQs unless user specifies otherwise.
- Only generate MCQs when explicitly asked.
- One-line intro before MCQs: "5 MCQs on [topic]:" — nothing more.

═══ NOTE GENERATION FORMATS ═══
When the user's message starts with "Generate Short Notes on:", "Generate Detailed Academic Notes on:", "Generate Class Notes on:", or "Generate Quick Revision Cards on:", follow these specific formats:

**"Generate Short Notes on: [topic]"**
- Output 300-500 words maximum
- Use bullet points with dashes (-) throughout
- Start with a 1-2 sentence definition/overview
- Group points under 2-3 bold sub-headings (### level)
- Focus on key facts, dates, provisions, and verdicts
- End with a "UPSC Relevance" one-liner
- No lengthy explanations — every point should be 1 line

**"Generate Detailed Academic Notes on: [topic]"**
- Output 2000-3000 words
- Follow the full STRUCTURE FOR STUDY TOPICS hierarchy (Background, Key Provisions, Judicial Pronouncements, Significance, Critical Analysis, UPSC Relevance)
- Include markdown tables for comparisons
- Include specific data, case names with years, article numbers
- Add a "Key Terms" glossary section at the end with bold terms and one-line definitions
- This is the most comprehensive format — cover every angle

**"Generate Class Notes on: [topic]"**
- Output exactly 1000-1200 words
- Structure like a classroom lecture: Introduction → Main Content (3-4 sections) → Summary
- Use ### headings for each section
- Mix paragraphs (2-3 sentences each) with bullet points
- Include 1-2 real-world examples or case studies
- Add a "Key Takeaways" box at the end with 5-6 bullet points
- Tone: conversational yet authoritative, like a teacher explaining

**"Generate Quick Revision Cards on: [topic]"**
- Output as a series of numbered revision cards (8-12 cards)
- Each card format:
  **Card [N]: [Sub-topic/Concept]**
  - **Key Point:** [1-2 sentence core fact]
  - **Remember:** [Mnemonic, trick, or association to recall]
  - **Exam Tip:** [How this appears in UPSC — Prelims/Mains/both]
- After all cards, add a "Quick Recall Test" section with 3-4 one-line questions (with answers in bold)
- Keep each card concise — max 4-5 lines per card`
        },
        contents: chatMessages,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.text || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  function getDefaultSuggestions(messages: any[]): string[] {
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const topic = lastUser?.content?.slice(0, 40) || "this topic";
    return [
      `Explain ${topic} in more detail`,
      `What are the key points to remember?`,
      `How is this relevant for UPSC Mains?`,
      `Create MCQs on ${topic}`
    ].map(s => s.length > 60 ? s.slice(0, 57) + "..." : s);
  }

  app.get("/api/conversations/:id/suggestions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation || conversation.userId !== (req as any).user.claims.sub) {
        return res.json({ suggestions: [] });
      }

      const messages = await chatStorage.getMessagesByConversation(conversationId);
      if (!messages || messages.length === 0) {
        return res.json({ suggestions: [] });
      }

      const recentMessages = messages.slice(-6);
      const context = recentMessages
        .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${(m.content || "").slice(0, 300)}`)
        .join("\n");

      const userLang = getUserLanguage(req);
      const langNote = userLang !== "en" ? `\nIMPORTANT: Write all suggestions in the user's language (${userLang}). Transliterate fully into native script.` : "";

      const lastAssistantMsg = recentMessages.filter((m: any) => m.role === "assistant").pop();
      const lastContent = (lastAssistantMsg?.content || "").toLowerCase();
      const hasMCQs = lastContent.includes("mcq") || lastContent.includes("quiz") || lastContent.includes("correct answer") || /\(a\).*\(b\).*\(c\)/i.test(lastContent);

      const mcqRule = hasMCQs
        ? `- The last response already contains MCQs/quiz questions, so do NOT suggest creating more MCQs. Instead, the 4th suggestion should be about a related but different subtopic to study next (e.g. "Explain Gupta Empire next" or "Move to Mughal administration").`
        : `- The 4th suggestion MUST ALWAYS be exactly in the format "Create MCQs on [specific topic]" - this triggers our quiz feature. Replace [specific topic] with the actual topic from the conversation.`;

      const prompt = `Based on this UPSC/PSC study conversation, generate exactly 4 smart follow-up questions the student would likely want to ask next.

CONVERSATION:
${context}

RULES:
- Questions must be specific to the actual topic being discussed, NOT generic
${mcqRule}
- The other 3 questions should explore different angles: deeper explanation, comparison, and application/relevance
- Keep each question under 60 characters
- Make questions feel natural and conversational
- If the conversation mentions a specific topic (e.g. Article 21, Mauryan Empire, Indian Economy), reference it directly
- Do NOT use generic phrases like "this topic" or "the above" - name the specific subject${langNote}

Respond ONLY with a JSON array of exactly 4 strings. No markdown, no explanation.
Example: ["How does Article 21 differ from Article 19?","What are landmark cases on Right to Life?","Compare Article 14 and Article 21","Create MCQs on Fundamental Rights"]`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.7,
        },
      });

      const text = (result.text || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(text);
        if (!Array.isArray(suggestions)) suggestions = [];
        suggestions = suggestions.slice(0, 4).map(s => String(s).trim()).filter(Boolean);
      } catch {
        suggestions = [];
      }

      if (suggestions.length === 0) {
        suggestions = getDefaultSuggestions(recentMessages);
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      const fallback = [
        "Explain this topic in more detail",
        "Create practice MCQs on this",
        "What are the key points to remember?",
        "How is this relevant for UPSC Mains?"
      ];
      res.json({ suggestions: fallback });
    }
  });
}
