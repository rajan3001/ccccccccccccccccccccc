import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { dailyDigests, dailyTopics } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { scrapeNextIAS, type NextIASArticle } from "./nextias-scraper";
import { getUserLanguage, getLanguageInstruction, getLanguageName } from "./language-utils";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
      throw new Error("AI_INTEGRATIONS_GEMINI_API_KEY is not set.");
    }
    _ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
    });
  }
  return _ai;
}
const ai = new Proxy({} as GoogleGenAI, { get(_t, p) { return (getAI() as any)[p]; } });

type TopicForTranslation = {
  id: number;
  title: string;
  summary: string;
  translations?: Record<string, { title: string; summary: string }> | null;
};

async function translateTopicsBatch(topics: TopicForTranslation[], langCode: string): Promise<void> {
  const langName = getLanguageName(langCode);
  const topicEntries = topics.map((t, i) => `[${i}] Title: ${t.title}\nSummary: ${t.summary}`).join("\n\n");

  const prompt = `Translate the following ${topics.length} current affairs topic titles and summaries fully into ${langName} using the ${langName} script.

CRITICAL TRANSLATION RULES:
- ALL words must be in ${langName} script — including country names, common English words, technical terms, and general vocabulary.
- Transliterate everything into ${langName} script. For example in Hindi: "India" → "भारत", "Malaysia" → "मलेशिया", "defence" → "रक्षा", "energy" → "ऊर्जा", "semiconductor" → "सेमीकंडक्टर", "manufacturing" → "विनिर्माण", "trade" → "व्यापार".
- ONLY keep specific abbreviations/acronyms in English (e.g., UPSC, GDP, NATO, PM, UN) and names of specific acts/bills/schemes.
- Do NOT leave any common English words as-is. Every noun, verb, adjective must be in ${langName}.

Return ONLY a valid JSON array with objects in the same order. Each object must have "title" and "summary" keys with the translated text. No markdown, no explanation.

Topics to translate:
${topicEntries}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.3,
    },
  });

  const responseText = result.text?.trim() || "";
  const jsonStr = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(jsonStr) as Array<{ title: string; summary: string }>;

  if (!Array.isArray(parsed) || parsed.length !== topics.length) {
    throw new Error(`Translation returned ${parsed?.length} items, expected ${topics.length}`);
  }

  const updatePromises = topics.map((topic, i) => {
    const translated = parsed[i];
    if (translated?.title && translated?.summary) {
      const existing = (topic.translations as Record<string, { title: string; summary: string }>) || {};
      const updated = { ...existing, [langCode]: { title: translated.title, summary: translated.summary } };
      return db.update(dailyTopics)
        .set({ translations: updated })
        .where(eq(dailyTopics.id, topic.id));
    }
    return Promise.resolve();
  });
  await Promise.all(updatePromises);
}

function buildDetailPrompt(topic: { title: string; summary: string; source: string | null }, langKey: string): string {
  const sourceInfo = topic.source ? ` (Source: ${topic.source})` : "";
  const caLangInst = getLanguageInstruction(langKey);
  return `You are an expert UPSC/State PSC current affairs analyst. Write a concise, exam-focused analysis of this topic:

**${topic.title}**${sourceInfo}

${topic.summary}

STRICT RULES:
- TOTAL output must be between 800-1200 words MAXIMUM. Do NOT exceed this.
- Be crisp and to-the-point like a professional current affairs digest.
- Use bullet points extensively for easy scanning.
- No filler text, no verbose explanations, no repetition.
- Never mention any coaching institute names.

FORMAT (follow this exact structure):

### In Summary
Write 3-4 concise bullet points capturing the essence of the news (2-3 lines each max).

### Key Highlights
Use bullet points with **bold sub-headings** to cover the main aspects of the news. Group related points under logical sub-headings. Each bullet should be 1-2 lines max. Cover:
- What happened and key decisions/outcomes
- Important facts, figures, dates, names
- Any agreements, policies, or frameworks involved
- Strategic/economic/social significance

### Background
2-3 short bullet points on relevant context (keep under 100 words total).

### UPSC Relevance
A brief box/table format:
- **GS Paper**: Which paper(s) this maps to
- **Syllabus Topic**: Specific syllabus connection
- **Key Terms**: Important terms for prelims (comma separated)

Write in a professional, analytical tone. Prioritize facts over opinions. Use markdown formatting.${caLangInst}`;
}

async function preGenerateTopicDetail(topicId: number, title: string, summary: string, source: string | null): Promise<void> {
  try {
    const prompt = buildDetailPrompt({ title, summary, source }, "en");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.4,
      },
    });
    const content = result.text || "";
    if (content) {
      await db.update(dailyTopics)
        .set({ detailContent: content })
        .where(eq(dailyTopics.id, topicId));
    }
  } catch (err: any) {
    console.error(`[Pre-gen] Failed for topic ${topicId}:`, err.message);
  }
}

async function preGenerateAllTopicDetails(topics: Array<{ id: number; title: string; summary: string; source: string | null }>): Promise<void> {
  console.log(`[Pre-gen] Starting background generation for ${topics.length} topics...`);
  const CONCURRENCY = 3;
  for (let i = 0; i < topics.length; i += CONCURRENCY) {
    const batch = topics.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(t => preGenerateTopicDetail(t.id, t.title, t.summary, t.source)));
    console.log(`[Pre-gen] Completed ${Math.min(i + CONCURRENCY, topics.length)}/${topics.length} topics`);
  }
  console.log(`[Pre-gen] All ${topics.length} topic details generated.`);
}

export function registerCurrentAffairsRoutes(app: Express): void {
  app.get("/api/current-affairs/latest", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const [latest] = await db
        .select({ date: dailyDigests.date, id: dailyDigests.id })
        .from(dailyDigests)
        .orderBy(desc(dailyDigests.date))
        .limit(1);

      if (!latest) {
        return res.json({ date: null });
      }
      res.json({ date: latest.date });
    } catch (error) {
      console.error("Error fetching latest date:", error);
      res.status(500).json({ error: "Failed to fetch latest date" });
    }
  });

  app.get("/api/current-affairs-dates", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const digests = await db
        .select({ date: dailyDigests.date, id: dailyDigests.id })
        .from(dailyDigests)
        .orderBy(desc(dailyDigests.date))
        .limit(400);

      res.json(digests);
    } catch (error) {
      console.error("Error fetching dates:", error);
      res.status(500).json({ error: "Failed to fetch dates" });
    }
  });

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

      const langCode = getUserLanguage(req);
      if (langCode && langCode !== "en" && topics.length > 0) {
        const untranslated = topics.filter(t => {
          const translations = (t.translations as Record<string, { title: string; summary: string }>) || {};
          return !translations[langCode];
        });

        if (untranslated.length > 0) {
          try {
            await translateTopicsBatch(untranslated, langCode);
            const refreshed = await db
              .select()
              .from(dailyTopics)
              .where(eq(dailyTopics.digestId, digest.id))
              .orderBy(dailyTopics.gsCategory, dailyTopics.id);
            const translatedTopics = refreshed.map(t => {
              const translations = (t.translations as Record<string, { title: string; summary: string }>) || {};
              const tr = translations[langCode];
              if (tr) {
                return { ...t, title: tr.title, summary: tr.summary };
              }
              return t;
            });
            return res.json({ digest, topics: translatedTopics });
          } catch (translateErr) {
            console.error("Translation failed, returning English:", translateErr);
          }
        } else {
          const translatedTopics = topics.map(t => {
            const translations = (t.translations as Record<string, { title: string; summary: string }>) || {};
            const tr = translations[langCode];
            if (tr) {
              return { ...t, title: tr.title, summary: tr.summary };
            }
            return t;
          });
          return res.json({ digest, topics: translatedTopics });
        }
      }

      res.json({ digest, topics });

      const missingDetails = topics.filter(t => !t.detailContent);
      if (missingDetails.length > 0) {
        preGenerateAllTopicDetails(missingDetails.map(t => ({
          id: t.id, title: t.title, summary: t.summary, source: t.source,
        }))).catch(err => console.error("[Pre-gen] Background fill failed:", err));
      }
    } catch (error) {
      console.error("Error fetching current affairs:", error);
      res.status(500).json({ error: "Failed to fetch current affairs" });
    }
  });

  app.post("/api/current-affairs/generate/:date", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const dateStr = req.params.date as string;
      const stateFilter = req.body?.stateFilter || null;

      const [existing] = await db.select().from(dailyDigests).where(sql`${dailyDigests.date} = ${dateStr}`);
      let existingTopics: any[] = [];
      if (existing) {
        existingTopics = await db.select().from(dailyTopics).where(eq(dailyTopics.digestId, existing.id));
        if (existingTopics.length > 0 && existing.source === "nextias") {
          return res.json({ digest: existing, topics: existingTopics });
        }
        if (existingTopics.length > 0 && existing.source === "ai") {
          console.log(`[Current Affairs] Existing digest for ${dateStr} is AI-only, checking if NextIAS content is now available...`);
        }
      }

      console.log(`[Current Affairs] Scraping NextIAS for ${dateStr}...`);
      let scrapedArticles: NextIASArticle[] = [];
      let scrapeSuccess = false;
      try {
        scrapedArticles = await scrapeNextIAS(dateStr);
        scrapeSuccess = scrapedArticles.length > 0;
        console.log(`[Current Affairs] Scraped ${scrapedArticles.length} articles from NextIAS`);
      } catch (scrapeErr: any) {
        console.warn("[Current Affairs] NextIAS scraping failed, falling back to AI-only:", scrapeErr.message);
      }

      const stateNewspaperMap: Record<string, { newspaper: string; context: string }> = {
        "Jharkhand": { newspaper: "Prabhat Khabar", context: "Include 2-3 topics specifically about Jharkhand state relevant to JPSC exam." },
        "Bihar": { newspaper: "Dainik Jagran / Hindustan", context: "Include 2-3 topics specifically about Bihar state relevant to BPSC exam." },
        "Jammu & Kashmir": { newspaper: "Greater Kashmir / Daily Excelsior", context: "Include 2-3 topics specifically about J&K relevant to JKPSC exam." },
        "Uttar Pradesh": { newspaper: "Dainik Jagran / Amar Ujala", context: "Include 2-3 topics specifically about UP relevant to UPPSC exam." },
        "Madhya Pradesh": { newspaper: "Dainik Bhaskar / Nai Dunia", context: "Include 2-3 topics specifically about MP relevant to MPPSC exam." },
        "Rajasthan": { newspaper: "Rajasthan Patrika / Dainik Bhaskar", context: "Include 2-3 topics specifically about Rajasthan relevant to RPSC RAS exam." },
        "Odisha": { newspaper: "Dharitri / The Sambad", context: "Include 2-3 topics specifically about Odisha relevant to OPSC exam." },
        "Haryana": { newspaper: "Dainik Jagran / Dainik Bhaskar", context: "Include 2-3 topics specifically about Haryana relevant to HPSC HCS exam." },
        "Uttarakhand": { newspaper: "Amar Ujala / Dainik Jagran", context: "Include 2-3 topics specifically about Uttarakhand relevant to UKPSC exam." },
        "Himachal Pradesh": { newspaper: "Divya Himachal / Dainik Jagran", context: "Include 2-3 topics specifically about HP relevant to HPPSC exam." },
        "Assam": { newspaper: "The Assam Tribune / Pratidin Time", context: "Include 2-3 topics specifically about Assam relevant to APSC exam." },
        "Meghalaya": { newspaper: "The Shillong Times / Meghalaya Guardian", context: "Include 2-3 topics specifically about Meghalaya relevant to Meghalaya PSC exam." },
        "Sikkim": { newspaper: "Sikkim Express / Now!", context: "Include 2-3 topics specifically about Sikkim relevant to Sikkim PSC exam." },
        "Tripura": { newspaper: "Tripura Times / Dainik Sambad", context: "Include 2-3 topics specifically about Tripura relevant to Tripura PSC exam." },
        "Arunachal Pradesh": { newspaper: "The Arunachal Times / Echo of Arunachal", context: "Include 2-3 topics specifically about Arunachal Pradesh relevant to Arunachal Pradesh PSC exam." },
      };

      const stateInfo = stateFilter && stateNewspaperMap[stateFilter] ? stateNewspaperMap[stateFilter] : null;

      let topicsToInsert: Array<{
        title: string;
        summary: string;
        category: string;
        gsCategory: string;
        relevance: string | null;
        source: string;
        pageNumber: number | null;
      }> = [];

      if (!scrapeSuccess && existing && existingTopics.length > 0 && existing.source === "ai") {
        console.log(`[Current Affairs] NextIAS still not available for ${dateStr}, keeping existing AI content`);
        return res.json({ digest: existing, topics: existingTopics });
      }

      if (existing) {
        await db.delete(dailyTopics).where(eq(dailyTopics.digestId, existing.id));
        await db.delete(dailyDigests).where(eq(dailyDigests.id, existing.id));
      }

      if (scrapeSuccess && scrapedArticles.length > 0) {
        for (const article of scrapedArticles) {
          topicsToInsert.push({
            title: article.title,
            summary: article.summary,
            category: article.category,
            gsCategory: article.gsCategory,
            relevance: `Important for UPSC ${article.gsCategory} preparation.`,
            source: article.source,
            pageNumber: article.pageNumber,
          });
        }

        if (stateInfo) {
          try {
            const statePrompt = `Generate 2-3 current affairs topics specifically about ${stateFilter} state for State PSC exam preparation for ${dateStr}.
For each topic provide: title, summary (3-4 sentences with key facts and exam significance), category (use "State"), gsCategory (one of GS-I, GS-II, GS-III, GS-IV, Prelims), relevance (1 sentence), source ("${stateInfo.newspaper}"), pageNumber (null).
Return ONLY a valid JSON array. No markdown.`;

            const stateResponse = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: statePrompt }] }],
              config: {
                thinkingConfig: { thinkingBudget: 0 },
                temperature: 0.5,
              },
            });

            let stateText = stateResponse.text || "";
            stateText = stateText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const stateTopics = JSON.parse(stateText);

            for (const topic of stateTopics) {
              topicsToInsert.push({
                title: topic.title || "Untitled",
                summary: topic.summary || "",
                category: "State",
                gsCategory: topic.gsCategory || "Prelims",
                relevance: topic.relevance || null,
                source: topic.source || stateInfo.newspaper,
                pageNumber: null,
              });
            }
          } catch (stateErr: any) {
            console.warn("[Current Affairs] Failed to generate state topics:", stateErr.message);
          }
        }
      } else {
        const todayIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, "0")}-${String(todayIST.getDate()).padStart(2, "0")}`;

        if (dateStr > todayStr) {
          return res.status(404).json({
            error: "not_available_yet",
            message: "This date is in the future. Current affairs are not available yet."
          });
        }

        const stateContext = stateInfo
          ? `\n\nADDITIONALLY: ${stateInfo.context} For state-specific topics, use "${stateInfo.newspaper}" as the source. Mark these state-specific topics with category "State".`
          : "";

        const prompt = `You are a Current Affairs compiler for UPSC and State PSC exam preparation. Find and compile the most important and exam-relevant current affairs topics that were actually published on ${dateStr} in Indian newspapers.

CRITICAL RULES:
- You MUST use Google Search to find REAL news articles from The Hindu, Indian Express that were published on or around ${dateStr}.
- Every topic MUST be based on a real, verifiable news event. Do NOT invent or fabricate any news.
- Search for "The Hindu ${dateStr} UPSC current affairs" and "Indian Express ${dateStr} current affairs" to find actual articles.
${stateContext}

Compile exactly ${stateFilter ? "10-12" : "8-10"} important topics. For each topic provide:
1. title: The actual headline from the newspaper
2. summary: A 3-4 sentence explanation covering key facts, significance, and UPSC syllabus connection.
3. category: One of "National", "International", "Economy", "Science & Tech", "Environment", "Polity & Governance", "Social Issues", "Sports & Culture"${stateFilter ? ', "State"' : ""}
4. gsCategory: One of "GS-I", "GS-II", "GS-III", "GS-IV", "Prelims"
5. relevance: Why this is important for UPSC/State PSC exams (1 sentence)
6. source: "The Hindu" or "Indian Express"${stateInfo ? ` or "${stateInfo.newspaper}" for state topics` : ""}
7. pageNumber: null

Return ONLY a valid JSON array of objects with these exact keys: title, summary, category, gsCategory, relevance, source, pageNumber.
No markdown, no explanations, just the JSON array.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
            temperature: 0.5,
          },
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

        for (const topic of topicsData) {
          topicsToInsert.push({
            title: topic.title || "Untitled",
            summary: topic.summary || "",
            category: topic.category || "National",
            gsCategory: topic.gsCategory || "Prelims",
            relevance: topic.relevance || null,
            source: topic.source || "The Hindu",
            pageNumber: typeof topic.pageNumber === "number" ? topic.pageNumber : null,
          });
        }
      }

      if (topicsToInsert.length === 0) {
        return res.status(500).json({ error: "No topics could be generated" });
      }

      const digestSource = scrapeSuccess ? "nextias" : "ai";
      const [newDigest] = await db.insert(dailyDigests).values({ date: dateStr as string, source: digestSource }).returning();

      const insertedTopics = await db.insert(dailyTopics).values(
        topicsToInsert.map(topic => ({ digestId: newDigest.id, ...topic }))
      ).returning();

      res.json({ digest: newDigest, topics: insertedTopics });

      preGenerateAllTopicDetails(insertedTopics.map(t => ({
        id: t.id, title: t.title, summary: t.summary, source: t.source,
      }))).catch(err => console.error("[Pre-gen] Background generation failed:", err));
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

      const langCode = getUserLanguage(req);
      const langKey = langCode || "en";
      const langContentMap = (topic.detailContentLangs as Record<string, string>) || {};

      if (langContentMap[langKey]) {
        const cached = langContentMap[langKey];
        const chunkSize = 80;
        for (let i = 0; i < cached.length; i += chunkSize) {
          const text = cached.slice(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      if (langKey === "en" && topic.detailContent) {
        const chunkSize = 80;
        for (let i = 0; i < topic.detailContent.length; i += chunkSize) {
          const text = topic.detailContent.slice(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      const sourceInfo = topic.source ? ` (Source: ${topic.source})` : "";
      const caLangInst = getLanguageInstruction(langKey);
      const prompt = `You are an expert UPSC/State PSC current affairs analyst. Write a concise, exam-focused analysis of this topic:

**${topic.title}**${sourceInfo}

${topic.summary}

STRICT RULES:
- TOTAL output must be between 800-1200 words MAXIMUM. Do NOT exceed this.
- Be crisp and to-the-point like a professional current affairs digest.
- Use bullet points extensively for easy scanning.
- No filler text, no verbose explanations, no repetition.
- Never mention any coaching institute names.

FORMAT (follow this exact structure):

### In Summary
Write 3-4 concise bullet points capturing the essence of the news (2-3 lines each max).

### Key Highlights
Use bullet points with **bold sub-headings** to cover the main aspects of the news. Group related points under logical sub-headings. Each bullet should be 1-2 lines max. Cover:
- What happened and key decisions/outcomes
- Important facts, figures, dates, names
- Any agreements, policies, or frameworks involved
- Strategic/economic/social significance

### Background
2-3 short bullet points on relevant context (keep under 100 words total).

### UPSC Relevance
A brief box/table format:
- **GS Paper**: Which paper(s) this maps to
- **Syllabus Topic**: Specific syllabus connection
- **Key Terms**: Important terms for prelims (comma separated)

Write in a professional, analytical tone. Prioritize facts over opinions. Use markdown formatting.${caLangInst}`;

      let clientClosed = false;
      req.on("close", () => {
        clientClosed = true;
      });

      let fullContent = "";

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.4,
        },
      });

      for await (const chunk of stream) {
        if (clientClosed) break;
        const text = chunk.text || "";
        if (text) {
          fullContent += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      if (fullContent && !clientClosed) {
        try {
          if (langKey === "en") {
            await db.update(dailyTopics)
              .set({ detailContent: fullContent })
              .where(eq(dailyTopics.id, topicId));
          } else {
            const updatedLangs = { ...langContentMap, [langKey]: fullContent };
            await db.update(dailyTopics)
              .set({ detailContentLangs: updatedLangs })
              .where(eq(dailyTopics.id, topicId));
          }
        } catch (saveErr) {
          console.error("Error saving detail content:", saveErr);
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

  app.get("/api/current-affairs/topic/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id as string);
      const [topic] = await db.select().from(dailyTopics).where(eq(dailyTopics.id, topicId));
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      const [digest] = await db.select().from(dailyDigests).where(eq(dailyDigests.id, topic.digestId));

      const allSiblings = await db
        .select()
        .from(dailyTopics)
        .where(eq(dailyTopics.digestId, topic.digestId))
        .orderBy(dailyTopics.gsCategory, dailyTopics.id);

      const langCode = getUserLanguage(req);

      const applyTranslation = (t: typeof topic) => {
        if (langCode && langCode !== "en") {
          const translations = (t.translations as Record<string, { title: string; summary: string }>) || {};
          const tr = translations[langCode];
          if (tr) {
            return { ...t, title: tr.title, summary: tr.summary };
          }
        }
        return t;
      };

      const currentIndex = allSiblings.findIndex(t => t.id === topicId);
      const prevSibling = currentIndex > 0 ? allSiblings[currentIndex - 1] : null;
      const nextSibling = currentIndex < allSiblings.length - 1 ? allSiblings[currentIndex + 1] : null;

      const translatedTopic = applyTranslation(topic);

      let cachedDetail: string | null = null;
      if (langCode && langCode !== "en") {
        const langContentMap = (topic.detailContentLangs as Record<string, string>) || {};
        cachedDetail = langContentMap[langCode] || null;
      } else {
        cachedDetail = topic.detailContent || null;
      }

      const prevTopic = prevSibling ? { id: prevSibling.id, title: applyTranslation(prevSibling).title } : null;
      const nextTopic = nextSibling ? { id: nextSibling.id, title: applyTranslation(nextSibling).title } : null;

      res.json({
        topic: translatedTopic,
        date: digest?.date || null,
        cachedDetail,
        prevTopic,
        nextTopic,
        topicIndex: currentIndex + 1,
        totalTopics: allSiblings.length,
      });
    } catch (error) {
      console.error("Error fetching topic:", error);
      res.status(500).json({ error: "Failed to fetch topic" });
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
