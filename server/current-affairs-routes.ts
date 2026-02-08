import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { dailyDigests, dailyTopics } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

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
      const [digest] = await db.select().from(dailyDigests).where(sql`${dailyDigests.date} = ${dateStr}`);

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
      const stateFilter = req.body?.stateFilter || null;

      const [existing] = await db.select().from(dailyDigests).where(sql`${dailyDigests.date} = ${dateStr}`);
      if (existing) {
        const topics = await db.select().from(dailyTopics).where(eq(dailyTopics.digestId, existing.id));
        return res.json({ digest: existing, topics });
      }

      const stateContextMap: Record<string, string> = {
        "Jharkhand": "Include 2-3 topics specifically about Jharkhand state - government policies, development projects, tribal welfare, mining/industry, education, or local governance issues relevant to JPSC exam.",
        "Bihar": "Include 2-3 topics specifically about Bihar state - government schemes, flood management, educational initiatives, industrial development, or local governance issues relevant to BPSC exam.",
        "Jammu & Kashmir": "Include 2-3 topics specifically about J&K - UT governance, tourism, security issues, infrastructure development, or cultural events relevant to JKPSC exam.",
        "Uttar Pradesh": "Include 2-3 topics specifically about UP - state government policies, industrial corridors, law & order, education, infrastructure, or welfare schemes relevant to UPPSC exam.",
        "Madhya Pradesh": "Include 2-3 topics specifically about MP - state schemes, tribal development, tourism, agriculture, forest conservation, or governance issues relevant to MPPSC exam.",
        "Rajasthan": "Include 2-3 topics specifically about Rajasthan - desert development, water management, tourism, renewable energy, cultural heritage, or governance issues relevant to RPSC RAS exam.",
        "Odisha": "Include 2-3 topics specifically about Odisha - cyclone preparedness, tribal welfare, mining, industrial development, or temple/heritage conservation relevant to OPSC exam.",
        "Haryana": "Include 2-3 topics specifically about Haryana - agricultural economy, industrial development, sports achievements, education policy, or governance issues relevant to HPSC HCS exam.",
        "Uttarakhand": "Include 2-3 topics specifically about Uttarakhand - disaster management, pilgrimage tourism, hydropower, forest conservation, migration issues, or state governance relevant to UKPSC exam.",
        "Himachal Pradesh": "Include 2-3 topics specifically about HP - apple economy, hydropower projects, tourism, tribal areas, education, or governance issues relevant to HPPSC exam.",
        "Assam": "Include 2-3 topics specifically about Assam - tea industry, flood management, NRC/immigration issues, oil & gas, wildlife conservation, or NE governance relevant to APSC exam.",
        "Meghalaya": "Include 2-3 topics specifically about Meghalaya - mining issues, autonomous councils, tribal governance, rainfall/climate, border issues, or NE development relevant to Meghalaya PSC exam.",
        "Sikkim": "Include 2-3 topics specifically about Sikkim - organic farming, tourism, Buddhist heritage, border issues, renewable energy, or state governance relevant to Sikkim PSC exam.",
        "Tripura": "Include 2-3 topics specifically about Tripura - rubber/tea industry, tribal welfare, connectivity projects, border trade, or NE development relevant to Tripura PSC exam.",
        "Arunachal Pradesh": "Include 2-3 topics specifically about Arunachal Pradesh - border issues, tribal development, hydropower, biodiversity, infrastructure, or NE governance relevant to Arunachal Pradesh PSC exam.",
      };

      const stateContext = stateFilter && stateContextMap[stateFilter]
        ? `\n\nIMPORTANT: ${stateContextMap[stateFilter]} Mark these state-specific topics with category "State" and tag them with the state name in the title or summary.`
        : "";

      const prompt = `Generate a daily current affairs digest for UPSC/State PSC exam preparation for the date ${dateStr}. 

Create exactly ${stateFilter ? "10-12" : "8-10"} important topics that are relevant for competitive exams. For each topic provide:
1. title: A concise headline
2. summary: A 3-4 sentence explanation covering key facts, significance, and exam relevance
3. category: One of "National", "International", "Economy", "Science & Tech", "Environment", "Polity & Governance", "Social Issues", "Sports & Culture"${stateFilter ? ', "State"' : ""}
4. gsCategory: The relevant GS Paper - one of "GS-I", "GS-II", "GS-III", "GS-IV", "Prelims"
5. relevance: A brief note on why this is important for UPSC/State PSC exams (1 sentence)
${stateContext}

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

      const [newDigest] = await db.insert(dailyDigests).values({ date: dateStr as string }).returning();

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
