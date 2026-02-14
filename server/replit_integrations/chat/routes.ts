import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { chatStorage } from "./storage";
import { isAuthenticated } from "../auth";
import { ObjectStorageService } from "../object_storage";
import { getUserLanguage, getLanguageInstruction } from "../../language-utils";
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
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

  app.get("/api/chat/query-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (isAdmin(req)) {
        return res.json({ used: 0, limit: 999, remaining: 999, isAdmin: true });
      }
      const userId = getUserId(req);
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

      if (!isAdmin(req)) {
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

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: `You are Learnpro AI, an expert UPSC and State PSC exam preparation assistant.${langInstruction}

CRITICAL RULES:
- NEVER mention, recommend, or reference any coaching institute, ed-tech company, or competitor by name (such as NextIAS, Vision IAS, Unacademy, Byju's, Allen, Vajiram, Drishti IAS, SuperKalam, Testbook, Adda247, Oliveboard, PrepLadder, or any others).
- If asked about coaching institutes, politely redirect to Learnpro's own features.
- Always refer to yourself and this platform as 'Learnpro AI'.

FILE & IMAGE ANALYSIS:
- When the user shares an image, analyze it thoroughly like an expert OCR system. Extract ALL visible text (printed or handwritten), describe diagrams, charts, maps, tables, graphs, and any visual content in detail.
- For handwritten notes or answer sheets: read and transcribe all handwriting accurately, then provide feedback or analysis as requested.
- For PDFs: read the entire content carefully. Summarize, explain, answer questions about it, or extract specific information as the user requests.
- For screenshots of questions, textbook pages, or study material: extract the content and provide relevant explanations, answers, or analysis.
- When an image contains a question paper or exam questions, solve them with detailed explanations.
- Always acknowledge what files/images were shared and confirm what you can see in them.

RESPONSE STYLE:
- For casual greetings (hello, hi, hey, good morning, etc.): Respond warmly and naturally in 1-2 sentences. Do NOT add educational content, MCQ suggestions, or study material to greeting responses. Simply greet back and ask how you can help with their preparation.
- For study-related questions: Provide accurate, helpful, and detailed answers. Include relevant examples, explanations, and exam-oriented insights.
- Match the tone and depth of your response to the user's query. Short casual messages get short casual responses. Detailed questions get detailed answers.
- Do NOT end every response with unsolicited study suggestions or MCQ prompts unless the user is asking about a specific topic.
- ALWAYS use markdown **bold** for important terms, key concepts, article names, act names, constitutional provisions, historical events, scientific terms, and any other significant phrases. For example: **Fundamental Rights**, **Article 21**, **Great Bath**, **Mohenjo-Daro**, **Statement 1 is correct**, etc. This makes responses scannable and highlights critical information for exam preparation.

MCQ GENERATION RULES:
- When the user asks for MCQs, practice questions, or quiz questions, generate them using EXACTLY this format. This is critical for the interactive quiz panel to work:
  **Question 1:** [question text]
  (a) [option]
  (b) [option]
  (c) [option]
  (d) [option]
  **Answer: (correct_letter)**
  **Explanation:** [explanation text]
- Always use **Question N:**, lowercase (a)(b)(c)(d) options, **Answer: (letter)**, and **Explanation:**
- In explanations, ALWAYS bold important terms and verdict phrases using markdown **bold**. For example: "**Statement 1 is correct:** ...", "**Statement 2 is incorrect:** ...", key terms like **Article 370**, **Fundamental Rights**, **Great Bath**, etc. This makes explanations scannable and professional.
- For statement-based questions, format statements as a numbered list with each statement on a new line, for example:
  **Question 1:** Consider the following statements about the Indus Valley Civilization:
  1. They were the earliest people to produce cotton.
  2. They used baked bricks extensively for construction.
  3. The Indus script has been fully deciphered.
  Which of the statements given above is/are correct?
  (a) 1 only
  (b) 1 and 2 only
  (c) 2 and 3 only
  (d) 1, 2 and 3
  **Answer: (b)**
  **Explanation:** ...
- Generate 5 MCQs at a time unless the user specifies a different number.
- Do NOT generate MCQs unless the user specifically asks for them. For general study questions, provide notes and explanations instead.
- Before the MCQs, write a short one-line intro like "Here are 5 MCQs on [topic]:" — this helps users understand what the quiz is about.`
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
