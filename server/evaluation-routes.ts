import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { ObjectStorageService } from "./replit_integrations/object_storage";
import { db } from "./db";
import { evaluationSessions, evaluationQuestions, createEvaluationSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { CompetencyFeedback } from "@shared/models/evaluation";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const objectStorage = new ObjectStorageService();

const EVALUATION_PROMPT = `You are an expert UPSC/State PSC Mains answer evaluator. You evaluate answer sheets strictly as per UPSC Mains evaluation norms.

Analyze the uploaded answer sheet image(s) carefully. Identify each question and the student's handwritten/typed answer.

For each question you can identify, evaluate based on these competencies:
1. **Content Competence** - Factual accuracy, depth of knowledge, relevant examples, data/statistics
2. **Contextual Competence** - Understanding of the question directive (discuss/analyze/examine/critically evaluate), addressing all parts
3. **Introduction Competence** - Quality of opening, setting context, defining key terms
4. **Structured Presentation** - Use of headings, subheadings, diagrams, flowcharts, logical flow
5. **Language Competence** - Clarity, precision, formal tone, grammar
6. **Conclusion Competence** - Forward-looking synthesis, policy recommendations, not just restating

Score each question out of the maximum marks (typically 10 for short answers, 15 or 20 for long answers). Use 0.5 increments.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "totalScore": <number>,
  "maxScore": <number>,
  "overallFeedback": "<comprehensive overall feedback paragraph covering all competencies>",
  "competencyFeedback": [
    {
      "name": "Content Competence",
      "strengths": ["strength1", "strength2"],
      "improvements": ["improvement1", "improvement2"]
    },
    {
      "name": "Contextual Competence",
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Introduction Competence",
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Structured Presentation",
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Language Competence",
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Conclusion Competence",
      "strengths": ["..."],
      "improvements": ["..."]
    }
  ],
  "questions": [
    {
      "questionNumber": "Q1.A",
      "questionText": "<the question text as you read it>",
      "score": <number>,
      "maxScore": <number>,
      "strengths": ["strength1", "strength2", "strength3"],
      "improvements": ["improvement1 with specific suggestion", "improvement2 with example"],
      "detailedFeedback": "<2-3 paragraph detailed analysis>",
      "introductionFeedback": "<specific feedback on the introduction>",
      "bodyFeedback": "<specific feedback on the body/content>",
      "conclusionFeedback": "<specific feedback on the conclusion>"
    }
  ]
}

IMPORTANT RULES:
- Be strict but fair, like a real UPSC examiner
- Give specific, actionable suggestions with examples of what should have been included
- Reference specific government schemes, constitutional provisions, court judgments, or data that the student missed
- If a question has sub-parts (a, b, c), evaluate each sub-part separately
- For the exam type "EXAM_TYPE_PLACEHOLDER", use the evaluation standards specific to that examination
- Respond with ONLY the JSON object, no other text`;

export function registerEvaluationRoutes(app: Express): void {
  app.post("/api/evaluations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = createEvaluationSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { examType, paperType, fileName, fileObjectPath } = parsed.data;

      const [session] = await db.insert(evaluationSessions).values({
        userId,
        examType,
        paperType,
        fileName,
        fileObjectPath,
        status: "processing",
      }).returning();

      res.json({ sessionId: session.id, status: "processing" });

      processEvaluation(session.id, fileObjectPath, fileName, examType, paperType).catch(err => {
        console.error("Evaluation processing failed:", err);
        db.update(evaluationSessions)
          .set({ status: "failed", overallFeedback: "Evaluation failed. Please try again." })
          .where(eq(evaluationSessions.id, session.id))
          .execute();
      });
    } catch (error) {
      console.error("Error creating evaluation:", error);
      res.status(500).json({ error: "Failed to create evaluation" });
    }
  });

  app.get("/api/evaluations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await db.select().from(evaluationSessions)
        .where(eq(evaluationSessions.userId, userId))
        .orderBy(desc(evaluationSessions.createdAt));
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      res.status(500).json({ error: "Failed to fetch evaluations" });
    }
  });

  app.get("/api/evaluations/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const [session] = await db.select().from(evaluationSessions)
        .where(eq(evaluationSessions.id, id));

      if (!session) {
        return res.status(404).json({ error: "Evaluation not found" });
      }

      if (session.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const questions = await db.select().from(evaluationQuestions)
        .where(eq(evaluationQuestions.sessionId, id));

      res.json({ ...session, questions });
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      res.status(500).json({ error: "Failed to fetch evaluation" });
    }
  });
}

async function processEvaluation(
  sessionId: number,
  fileObjectPath: string,
  fileName: string,
  examType: string,
  paperType: string
): Promise<void> {
  const file = await objectStorage.getObjectEntityFile(fileObjectPath);
  const [fileData] = await file.download();
  const [metadata] = await file.getMetadata();

  const contentType = metadata.contentType || guessContentType(fileName);
  const prompt = EVALUATION_PROMPT.replace("EXAM_TYPE_PLACEHOLDER", `${examType} ${paperType}`);

  const parts: any[] = [{ text: prompt }];

  if (contentType.startsWith("image/")) {
    parts.push({
      inlineData: {
        mimeType: contentType,
        data: fileData.toString("base64"),
      },
    });
  } else if (contentType === "application/pdf") {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: fileData.toString("base64"),
      },
    });
  } else {
    const textContent = fileData.toString("utf-8").substring(0, 50000);
    parts.push({ text: `\n\n--- Answer Sheet Content ---\n${textContent}\n--- End ---` });
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });

  const responseText = (result.text || "").trim();

  let evaluationData: any;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    evaluationData = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    console.error("Raw response:", responseText.substring(0, 500));
    await db.update(evaluationSessions)
      .set({ status: "failed", overallFeedback: "Failed to parse evaluation results. Please try again with a clearer image." })
      .where(eq(evaluationSessions.id, sessionId));
    return;
  }

  if (evaluationData.questions && Array.isArray(evaluationData.questions)) {
    for (const q of evaluationData.questions) {
      await db.insert(evaluationQuestions).values({
        sessionId,
        questionNumber: q.questionNumber || "Q?",
        questionText: q.questionText || "",
        score: q.score || 0,
        maxScore: q.maxScore || 10,
        strengths: q.strengths || [],
        improvements: q.improvements || [],
        detailedFeedback: q.detailedFeedback || "",
        introductionFeedback: q.introductionFeedback || null,
        bodyFeedback: q.bodyFeedback || null,
        conclusionFeedback: q.conclusionFeedback || null,
      });
    }
  }

  await db.update(evaluationSessions)
    .set({
      status: "completed",
      totalScore: evaluationData.totalScore || 0,
      maxScore: evaluationData.maxScore || 250,
      overallFeedback: evaluationData.overallFeedback || "",
      competencyFeedback: (evaluationData.competencyFeedback || []) as CompetencyFeedback[],
    })
    .where(eq(evaluationSessions.id, sessionId));
}

function guessContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext || ""] || "application/octet-stream";
}
