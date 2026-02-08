import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { chatStorage } from "./storage";
import { isAuthenticated } from "../auth";
import { ObjectStorageService } from "../object_storage";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const objectStorage = new ObjectStorageService();

async function readFileContent(objectPath: string, fileType: string): Promise<string | null> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();

    if (fileType.startsWith("text/") || fileType === "text/plain" || fileType === "text/csv" || fileType === "text/markdown") {
      const [content] = await file.download();
      return content.toString("utf-8");
    }

    if (fileType === "application/pdf") {
      const [content] = await file.download();
      const textContent = content.toString("utf-8");
      const cleanText = textContent.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      if (cleanText.length > 100) {
        return cleanText.substring(0, 5000);
      }
      return "[PDF file attached - content could not be extracted as text]";
    }

    return null;
  } catch (error) {
    console.error("Error reading file content:", error);
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
      const conversations = await chatStorage.getAllConversations();
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
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  const FREE_DAILY_LIMIT = 2;
  const ADMIN_EMAILS = ["rajan.kumar3001@gmail.com"];

  function isAdmin(req: any): boolean {
    const email = req.user?.claims?.email;
    return ADMIN_EMAILS.includes(email);
  }

  app.get("/api/chat/query-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (isAdmin(req)) {
        return res.json({ used: 0, limit: 999, remaining: 999, isAdmin: true });
      }
      const used = await chatStorage.getTodayUserMessageCount();
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

      if (!isAdmin(req)) {
        const todayCount = await chatStorage.getTodayUserMessageCount();
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
            if (att.type?.startsWith("image/") && att.objectPath) {
              try {
                const file = await objectStorage.getObjectEntityFile(att.objectPath);
                const [imageData] = await file.download();
                const base64 = imageData.toString("base64");
                parts.push({
                  inlineData: {
                    mimeType: att.type,
                    data: base64,
                  }
                });
              } catch (e) {
                parts.push({ text: `[Image attached: ${att.name}]` });
              }
            } else if (att.objectPath) {
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
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: chatMessages,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.text || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
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
}
