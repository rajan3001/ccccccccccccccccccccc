import { db } from "../server/db";
import { pool } from "../server/db";
import { pyqQuestions, PYQ_TOPICS, PYQ_SUBTOPICS } from "@shared/schema";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const VALID_TOPICS = PYQ_TOPICS.filter(t => t !== "Unclassified");

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface Classification {
  id: number;
  topic: string;
  subTopic: string | null;
}

async function classifyBatch(questions: { id: number; questionText: string; options: string[] | null }[]): Promise<Classification[]> {
  const topicList = VALID_TOPICS.join(", ");
  const subtopicMap = Object.entries(PYQ_SUBTOPICS)
    .filter(([k]) => k !== "Unclassified")
    .map(([k, v]) => `${k}: [${v.join(", ")}]`)
    .join("\n");

  const questionBlock = questions.map(q => {
    let text = `ID: ${q.id}\nQuestion: ${q.questionText}`;
    if (q.options && q.options.length > 0) {
      text += `\nOptions: ${q.options.join(" | ")}`;
    }
    return text;
  }).join("\n---\n");

  const prompt = `You are a UPSC exam question classifier. Classify each question into exactly one topic and one sub-topic.

VALID TOPICS: ${topicList}

VALID SUB-TOPICS PER TOPIC:
${subtopicMap}

RULES:
- You MUST pick from the valid topics and sub-topics listed above. Never invent new ones.
- If a question spans multiple topics, pick the MOST relevant one.
- If no sub-topic fits well, use the closest match from the list.
- Return ONLY valid JSON array, no markdown fences, no explanation.

QUESTIONS:
${questionBlock}

Return a JSON array of objects with this exact format:
[{"id": <number>, "topic": "<topic>", "subTopic": "<subTopic>"}]`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { maxOutputTokens: 8192 },
  });

  const text = (response.text || "").trim();
  const jsonStr = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    const parsed: Classification[] = JSON.parse(jsonStr);
    return parsed.filter(c =>
      c.id && c.topic && VALID_TOPICS.includes(c.topic as any)
    );
  } catch (e) {
    console.error("Failed to parse AI response:", text.slice(0, 200));
    return [];
  }
}

async function main() {
  const unclassified = await db.select({
    id: pyqQuestions.id,
    questionText: pyqQuestions.questionText,
    options: pyqQuestions.options,
  }).from(pyqQuestions).where(eq(pyqQuestions.topic, "Unclassified"));

  console.log(`[Classify] Found ${unclassified.length} unclassified questions`);

  if (unclassified.length === 0) {
    console.log("[Classify] Nothing to classify. Done.");
    process.exit(0);
  }

  const BATCH_SIZE = 15;
  let classified = 0;
  let failed = 0;

  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    const batch = unclassified.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unclassified.length / BATCH_SIZE);
    console.log(`[Classify] Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);

    try {
      const results = await classifyBatch(batch);

      for (const r of results) {
        const validSubTopics = PYQ_SUBTOPICS[r.topic] || [];
        const subTopic = validSubTopics.includes(r.subTopic || "") ? r.subTopic : (validSubTopics[0] || null);

        await db.update(pyqQuestions)
          .set({ topic: r.topic, subTopic })
          .where(eq(pyqQuestions.id, r.id));
        classified++;
      }

      const missed = batch.filter(q => !results.find(r => r.id === q.id));
      if (missed.length > 0) {
        console.log(`  [Classify] ${missed.length} questions not returned by AI, will retry later`);
        failed += missed.length;
      }

      console.log(`  [Classify] Batch ${batchNum} done: ${results.length} classified`);

      if (i + BATCH_SIZE < unclassified.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e: any) {
      console.error(`  [Classify] Batch ${batchNum} failed: ${e.message}`);
      failed += batch.length;
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n[Classify] Complete: ${classified} classified, ${failed} failed`);

  const remaining = await db.select({ id: pyqQuestions.id })
    .from(pyqQuestions).where(eq(pyqQuestions.topic, "Unclassified"));
  
  if (remaining.length > 0) {
    console.log(`[Classify] ${remaining.length} questions still unclassified, running retry pass...`);
    
    const retryQuestions = await db.select({
      id: pyqQuestions.id,
      questionText: pyqQuestions.questionText,
      options: pyqQuestions.options,
    }).from(pyqQuestions).where(eq(pyqQuestions.topic, "Unclassified"));

    for (let i = 0; i < retryQuestions.length; i += BATCH_SIZE) {
      const batch = retryQuestions.slice(i, i + BATCH_SIZE);
      try {
        const results = await classifyBatch(batch);
        for (const r of results) {
          const validSubTopics = PYQ_SUBTOPICS[r.topic] || [];
          const subTopic = validSubTopics.includes(r.subTopic || "") ? r.subTopic : (validSubTopics[0] || null);
          await db.update(pyqQuestions)
            .set({ topic: r.topic, subTopic })
            .where(eq(pyqQuestions.id, r.id));
        }
        console.log(`  [Retry] ${results.length} more classified`);
        await new Promise(r => setTimeout(r, 1500));
      } catch (e: any) {
        console.error(`  [Retry] Failed: ${e.message}`);
      }
    }
  }

  const finalRemaining = await db.select({ id: pyqQuestions.id })
    .from(pyqQuestions).where(eq(pyqQuestions.topic, "Unclassified"));
  console.log(`\n[Classify] Final: ${finalRemaining.length} questions still unclassified`);

  await pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error("[Classify] Fatal:", e);
  process.exit(1);
});
