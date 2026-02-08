import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { quizAttempts, quizQuestions, dailyTopics, dailyDigests } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const generateQuizSchema = z.object({
  gsCategory: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  numQuestions: z.number().int().min(3).max(20),
  sourceDate: z.string().optional(),
});

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

export function registerQuizRoutes(app: Express): void {
  app.post("/api/quizzes/generate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parsed = generateQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { gsCategory, difficulty, numQuestions, sourceDate } = parsed.data;
      const userId = (req as any).user.claims.sub;

      let topicContext = "";
      if (sourceDate) {
        const [digest] = await db.select().from(dailyDigests).where(eq(dailyDigests.date, sourceDate));
        if (digest) {
          const topics = await db.select().from(dailyTopics)
            .where(and(eq(dailyTopics.digestId, digest.id), eq(dailyTopics.gsCategory, gsCategory)));
          if (topics.length > 0) {
            topicContext = `\n\nBase the questions on these current affairs topics:\n${topics.map(t => `- ${t.title}: ${t.summary}`).join("\n")}`;
          }
        }
      }

      const difficultyDesc = {
        easy: "straightforward factual recall questions suitable for beginners",
        medium: "analytical questions requiring understanding of concepts and their applications",
        hard: "complex questions involving critical analysis, comparison of concepts, and application to scenarios",
      };

      const prompt = `Generate exactly ${numQuestions} UPSC-style multiple choice questions for ${gsCategory} preparation.

Difficulty level: ${difficulty} - ${difficultyDesc[difficulty]}

Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- Questions should be exam-relevant and test conceptual understanding
- Include a detailed explanation for the correct answer (2-3 sentences)
- Cover diverse sub-topics within ${gsCategory}
${topicContext}

Return ONLY a valid JSON array of objects with these exact keys:
- "question": the question text
- "options": array of exactly 4 option strings
- "correctIndex": index of correct option (0-3)
- "explanation": detailed explanation of why the correct answer is right

No markdown, no explanations outside the JSON, just the JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let responseText = response.text || "";
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let questionsData: any[];
      try {
        questionsData = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse quiz AI response:", responseText.substring(0, 500));
        return res.status(500).json({ error: "Failed to generate quiz questions" });
      }

      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        return res.status(500).json({ error: "AI returned invalid question format" });
      }

      const [attempt] = await db.insert(quizAttempts).values({
        userId,
        gsCategory,
        difficulty,
        totalQuestions: questionsData.length,
      }).returning();

      const insertedQuestions = [];
      for (const q of questionsData) {
        const options = Array.isArray(q.options) ? q.options.slice(0, 4) : ["A", "B", "C", "D"];
        while (options.length < 4) options.push(`Option ${options.length + 1}`);

        const [inserted] = await db.insert(quizQuestions).values({
          attemptId: attempt.id,
          question: q.question || "Question",
          options,
          correctIndex: typeof q.correctIndex === "number" ? Math.min(Math.max(q.correctIndex, 0), 3) : 0,
          explanation: q.explanation || "No explanation provided.",
        }).returning();
        insertedQuestions.push(inserted);
      }

      res.json({ attempt, questions: insertedQuestions.map(q => ({
        ...q,
        correctIndex: undefined,
        explanation: undefined,
      })) });
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  app.get("/api/quizzes/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;

      const attempts = await db.select().from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(50);

      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      res.status(500).json({ error: "Failed to fetch quiz history" });
    }
  });

  app.get("/api/quizzes/analytics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;

      const analytics = await db
        .select({
          gsCategory: quizAttempts.gsCategory,
          totalAttempts: sql<number>`count(*)::int`,
          totalQuestions: sql<number>`sum(${quizAttempts.totalQuestions})::int`,
          totalCorrect: sql<number>`sum(${quizAttempts.score})::int`,
          avgScore: sql<number>`round((avg(${quizAttempts.score}::numeric / ${quizAttempts.totalQuestions}::numeric * 100))::numeric, 1)`,
        })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          sql`${quizAttempts.score} is not null`
        ))
        .groupBy(quizAttempts.gsCategory);

      const recentTrend = await db
        .select({
          gsCategory: quizAttempts.gsCategory,
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions,
          createdAt: quizAttempts.createdAt,
        })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          sql`${quizAttempts.score} is not null`,
          sql`${quizAttempts.createdAt} > now() - interval '30 days'`
        ))
        .orderBy(quizAttempts.createdAt)
        .limit(50);

      res.json({ analytics, recentTrend });
    } catch (error) {
      console.error("Error fetching quiz analytics:", error);
      res.status(500).json({ error: "Failed to fetch quiz analytics" });
    }
  });

  app.get("/api/quizzes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const attemptId = parseInt(req.params.id as string);
      const userId = (req as any).user.claims.sub;

      const [attempt] = await db.select().from(quizAttempts)
        .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)));

      if (!attempt) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const questions = await db.select().from(quizQuestions)
        .where(eq(quizQuestions.attemptId, attemptId))
        .orderBy(quizQuestions.id);

      const isCompleted = attempt.score !== null;

      res.json({
        attempt,
        questions: questions.map(q => ({
          ...q,
          correctIndex: isCompleted ? q.correctIndex : undefined,
          explanation: isCompleted ? q.explanation : undefined,
        })),
      });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  app.post("/api/quizzes/:id/submit", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const attemptId = parseInt(req.params.id as string);
      const userId = (req as any).user.claims.sub;

      const parsed = submitQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid answers format" });
      }

      const [attempt] = await db.select().from(quizAttempts)
        .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)));

      if (!attempt) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (attempt.score !== null) {
        return res.status(400).json({ error: "Quiz already submitted" });
      }

      const questions = await db.select().from(quizQuestions)
        .where(eq(quizQuestions.attemptId, attemptId));

      let score = 0;
      const { answers } = parsed.data;

      for (const question of questions) {
        const userAnswer = answers[String(question.id)];
        const isCorrect = userAnswer !== undefined && userAnswer === question.correctIndex;
        if (isCorrect) score++;

        await db.update(quizQuestions)
          .set({
            userAnswer: userAnswer !== undefined ? userAnswer : null,
            isCorrect: userAnswer !== undefined ? isCorrect : false,
          })
          .where(eq(quizQuestions.id, question.id));
      }

      const [updatedAttempt] = await db.update(quizAttempts)
        .set({ score, completedAt: new Date() })
        .where(eq(quizAttempts.id, attemptId))
        .returning();

      const updatedQuestions = await db.select().from(quizQuestions)
        .where(eq(quizQuestions.attemptId, attemptId))
        .orderBy(quizQuestions.id);

      res.json({ attempt: updatedAttempt, questions: updatedQuestions });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Failed to submit quiz" });
    }
  });
}
