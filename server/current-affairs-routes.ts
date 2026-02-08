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

      const stateNewspaperMap: Record<string, { newspaper: string; context: string }> = {
        "Jharkhand": { newspaper: "Prabhat Khabar", context: "Include 2-3 topics specifically about Jharkhand state from Prabhat Khabar - government policies, development projects, tribal welfare, mining/industry, education, or local governance issues relevant to JPSC exam." },
        "Bihar": { newspaper: "Dainik Jagran / Hindustan", context: "Include 2-3 topics specifically about Bihar state from Dainik Jagran or Hindustan - government schemes, flood management, educational initiatives, industrial development, or local governance issues relevant to BPSC exam." },
        "Jammu & Kashmir": { newspaper: "Greater Kashmir / Daily Excelsior", context: "Include 2-3 topics specifically about J&K from Greater Kashmir or Daily Excelsior - UT governance, tourism, security issues, infrastructure development, or cultural events relevant to JKPSC exam." },
        "Uttar Pradesh": { newspaper: "Dainik Jagran / Amar Ujala", context: "Include 2-3 topics specifically about UP from Dainik Jagran or Amar Ujala - state government policies, industrial corridors, law & order, education, infrastructure, or welfare schemes relevant to UPPSC exam." },
        "Madhya Pradesh": { newspaper: "Dainik Bhaskar / Nai Dunia", context: "Include 2-3 topics specifically about MP from Dainik Bhaskar or Nai Dunia - state schemes, tribal development, tourism, agriculture, forest conservation, or governance issues relevant to MPPSC exam." },
        "Rajasthan": { newspaper: "Rajasthan Patrika / Dainik Bhaskar", context: "Include 2-3 topics specifically about Rajasthan from Rajasthan Patrika or Dainik Bhaskar - desert development, water management, tourism, renewable energy, cultural heritage, or governance issues relevant to RPSC RAS exam." },
        "Odisha": { newspaper: "Dharitri / The Sambad", context: "Include 2-3 topics specifically about Odisha from Dharitri or The Sambad - cyclone preparedness, tribal welfare, mining, industrial development, or temple/heritage conservation relevant to OPSC exam." },
        "Haryana": { newspaper: "Dainik Jagran / Dainik Bhaskar", context: "Include 2-3 topics specifically about Haryana from Dainik Jagran or Dainik Bhaskar - agricultural economy, industrial development, sports achievements, education policy, or governance issues relevant to HPSC HCS exam." },
        "Uttarakhand": { newspaper: "Amar Ujala / Dainik Jagran", context: "Include 2-3 topics specifically about Uttarakhand from Amar Ujala or Dainik Jagran - disaster management, pilgrimage tourism, hydropower, forest conservation, migration issues, or state governance relevant to UKPSC exam." },
        "Himachal Pradesh": { newspaper: "Divya Himachal / Dainik Jagran", context: "Include 2-3 topics specifically about HP from Divya Himachal or Dainik Jagran - apple economy, hydropower projects, tourism, tribal areas, education, or governance issues relevant to HPPSC exam." },
        "Assam": { newspaper: "The Assam Tribune / Pratidin Time", context: "Include 2-3 topics specifically about Assam from The Assam Tribune or Pratidin Time - tea industry, flood management, NRC/immigration issues, oil & gas, wildlife conservation, or NE governance relevant to APSC exam." },
        "Meghalaya": { newspaper: "The Shillong Times / Meghalaya Guardian", context: "Include 2-3 topics specifically about Meghalaya from The Shillong Times - mining issues, autonomous councils, tribal governance, rainfall/climate, border issues, or NE development relevant to Meghalaya PSC exam." },
        "Sikkim": { newspaper: "Sikkim Express / Now!", context: "Include 2-3 topics specifically about Sikkim from Sikkim Express - organic farming, tourism, Buddhist heritage, border issues, renewable energy, or state governance relevant to Sikkim PSC exam." },
        "Tripura": { newspaper: "Tripura Times / Dainik Sambad", context: "Include 2-3 topics specifically about Tripura from Tripura Times or Dainik Sambad - rubber/tea industry, tribal welfare, connectivity projects, border trade, or NE development relevant to Tripura PSC exam." },
        "Arunachal Pradesh": { newspaper: "The Arunachal Times / Echo of Arunachal", context: "Include 2-3 topics specifically about Arunachal Pradesh from The Arunachal Times - border issues, tribal development, hydropower, biodiversity, infrastructure, or NE governance relevant to Arunachal Pradesh PSC exam." },
      };

      const stateInfo = stateFilter && stateNewspaperMap[stateFilter] ? stateNewspaperMap[stateFilter] : null;
      const stateContext = stateInfo
        ? `\n\nIMPORTANT: ${stateInfo.context} For state-specific topics, use "${stateInfo.newspaper}" as the source. Mark these state-specific topics with category "State" and tag them with the state name in the title or summary.`
        : "";

      const prompt = `You are a Current Affairs compiler for UPSC and State PSC exam preparation. Your job is to pick the most important and exam-relevant news articles published on or around ${dateStr} from premium Indian newspapers.

PRIMARY SOURCES (you MUST attribute each topic to one of these):
- The Hindu
- The Indian Express
${stateInfo ? `- ${stateInfo.newspaper} (for state-specific news)` : ""}

IMPORTANT RULES:
- ONLY pick news that was actually reported/published in The Hindu or The Indian Express (or the state newspaper for state topics).
- Do NOT invent or fabricate news stories. Pick real, significant news events.
- Focus on news that is important for UPSC/State PSC exam preparation.
- Each topic must be a real news article that an exam aspirant would find in these newspapers.

Create exactly ${stateFilter ? "10-12" : "8-10"} important topics. For each topic provide:
1. title: A concise headline as it would appear in the newspaper
2. summary: A 3-4 sentence explanation covering key facts, significance, and how it connects to the UPSC/State PSC syllabus. Write it in an analytical style suitable for exam preparation.
3. category: One of "National", "International", "Economy", "Science & Tech", "Environment", "Polity & Governance", "Social Issues", "Sports & Culture"${stateFilter ? ', "State"' : ""}
4. gsCategory: The relevant GS Paper - one of "GS-I", "GS-II", "GS-III", "GS-IV", "Prelims"
5. relevance: A brief note on why this is important for UPSC/State PSC exams (1 sentence)
6. source: The exact newspaper name from which this topic is sourced (e.g., "The Hindu", "The Indian Express"${stateInfo ? `, "${stateInfo.newspaper}"` : ""})
${stateContext}

Return ONLY a valid JSON array of objects with these exact keys: title, summary, category, gsCategory, relevance, source.
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
          source: topic.source || null,
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
      const topicId = parseInt(req.params.id as string);
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

  app.get("/api/current-affairs/topics/:id/detail", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id as string);
      const [topic] = await db.select().from(dailyTopics).where(eq(dailyTopics.id, topicId));

      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const sourceInfo = topic.source ? ` (Source: ${topic.source})` : "";
      const prompt = `You are an expert UPSC/State PSC exam mentor. A student wants to read in detail about this current affairs topic:

**${topic.title}**${sourceInfo}

${topic.summary}

Provide a comprehensive analysis covering:

## Background & Context
Explain the complete background - what led to this news, historical context, and why it matters now.

## Key Facts & Details
List all important facts, data points, statistics, dates, and specific details that an exam aspirant must know.

## Constitutional/Legal/Policy Framework
Explain any relevant constitutional provisions, laws, acts, government policies, or institutional mechanisms involved.

## UPSC Mains Relevance
- Which GS Paper(s) this connects to
- Specific syllabus topics it links to
- How it can be used in essay/ethics/case study papers

## Prelims Angle
- Potential MCQ areas from this topic
- Important terms, organizations, or facts to remember
- Previous year question connections if any

## Connected Topics
- Related static topics from NCERT or standard reference books
- How this connects to other current affairs themes

## Multiple Perspectives
- Different viewpoints and dimensions on this issue
- Government's position vs. critics' arguments
- International comparisons if relevant

## Possible UPSC Questions
Write 2-3 possible Mains-style questions that could be framed from this topic. For each question, provide a brief outline of how to approach the answer.

Keep the analysis exam-focused, analytical, and factual. Use markdown formatting for readability.`;

      let clientClosed = false;
      req.on("close", () => {
        clientClosed = true;
      });

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      for await (const chunk of stream) {
        if (clientClosed) break;
        const text = chunk.text || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      if (!clientClosed) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
      res.end();
    } catch (error) {
      if (!res.writableEnded) {
        console.error("Error generating topic detail:", error);
        res.write(`data: ${JSON.stringify({ error: "Failed to generate detail" })}\n\n`);
        res.end();
      }
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
