import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { dailyDigests, dailyTopics } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export function registerCurrentAffairsRoutes(app: Express): void {
  app.get("/api/current-affairs/:date", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const dateStr = req.params.date;
      const [digest] = await db.select().from(dailyDigests).where(eq(dailyDigests.date, dateStr));

      if (!digest) {
        return res.json({ digest: null, topics: [] });
      }

      const topics = await db
        .select()
        .from(dailyTopics)
        .where(eq(dailyTopics.digestId, digest.id))
        .orderBy(dailyTopics.gsCategory, dailyTopics.id);

      res.json({ digest, topics });
    } catch (error) {
      console.error("Error fetching current affairs:", error);
      res.status(500).json({ error: "Failed to fetch current affairs" });
    }
  });

  app.get("/api/current-affairs-dates", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const digests = await db
        .select({ date: dailyDigests.date, id: dailyDigests.id })
        .from(dailyDigests)
        .orderBy(desc(dailyDigests.date))
        .limit(60);

      res.json(digests);
    } catch (error) {
      console.error("Error fetching dates:", error);
      res.status(500).json({ error: "Failed to fetch dates" });
    }
  });

  app.post("/api/current-affairs/generate/:date", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const dateStr = req.params.date;

      const [existing] = await db.select().from(dailyDigests).where(eq(dailyDigests.date, dateStr));
      if (existing) {
        const topics = await db.select().from(dailyTopics).where(eq(dailyTopics.digestId, existing.id));
        return res.json({ digest: existing, topics });
      }

      const prompt = `Generate a daily current affairs digest for UPSC/State PSC exam preparation for the date ${dateStr}. 

Create exactly 8-10 important topics that are relevant for competitive exams. For each topic provide:
1. title: A concise headline
2. summary: A 3-4 sentence explanation covering key facts, significance, and exam relevance
3. category: One of "National", "International", "Economy", "Science & Tech", "Environment", "Polity & Governance", "Social Issues", "Sports & Culture"
4. gsCategory: The relevant GS Paper - one of "GS-I", "GS-II", "GS-III", "GS-IV", "Prelims"
5. relevance: A brief note on why this is important for UPSC (1 sentence)

Return ONLY a valid JSON array of objects with these exact keys: title, summary, category, gsCategory, relevance.
No markdown, no explanations, just the JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let responseText = response.text || "";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let topicsData: any[];
      try {
        topicsData = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse AI response:", responseText.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI-generated content" });
      }

      const [newDigest] = await db.insert(dailyDigests).values({ date: dateStr }).returning();

      const insertedTopics = [];
      for (const topic of topicsData) {
        const [inserted] = await db.insert(dailyTopics).values({
          digestId: newDigest.id,
          title: topic.title || "Untitled",
          summary: topic.summary || "",
          category: topic.category || "National",
          gsCategory: topic.gsCategory || "Prelims",
          relevance: topic.relevance || null,
        }).returning();
        insertedTopics.push(inserted);
      }

      res.json({ digest: newDigest, topics: insertedTopics });
    } catch (error) {
      console.error("Error generating current affairs:", error);
      res.status(500).json({ error: "Failed to generate current affairs" });
    }
  });

  app.patch("/api/current-affairs/topics/:id/revise", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id);
      const { revised } = req.body;

      const [updated] = await db
        .update(dailyTopics)
        .set({ revised: revised !== false })
        .where(eq(dailyTopics.id, topicId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Topic not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating revision status:", error);
      res.status(500).json({ error: "Failed to update revision status" });
    }
  });

  app.get("/api/current-affairs/stats/revision", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const result = await db
        .select({
          total: sql<number>`count(*)::int`,
          revised: sql<number>`count(*) filter (where ${dailyTopics.revised} = true)::int`,
        })
        .from(dailyTopics);

      const stats = result[0] || { total: 0, revised: 0 };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching revision stats:", error);
      res.status(500).json({ error: "Failed to fetch revision stats" });
    }
  });
}
