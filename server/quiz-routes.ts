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
  examType: z.string().min(1).default("UPSC"),
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

      const { examType, gsCategory, difficulty, numQuestions, sourceDate } = parsed.data;
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

      const examContextMap: Record<string, string> = {
        "UPSC": "UPSC Civil Services Examination. Prelims has 2 papers (GS + CSAT). Mains has 4 GS papers: GS-I (History, Geography, Society), GS-II (Polity, Governance, IR), GS-III (Economy, Science, Environment), GS-IV (Ethics). Focus on national-level governance, Indian Constitution, national policies, pan-India geography, and national history.",
        "JPSC": "Jharkhand Public Service Commission (JPSC) exam. Prelims has GS + CSAT. Mains has 3 GS papers + Jharkhand-specific paper. Include questions on Jharkhand's tribal culture (Munda, Santhal, Oraon), Chota Nagpur plateau, mineral resources, Jharkhand Movement, Birsa Munda, state governance, and Ranchi/Jamshedpur industrial corridor.",
        "BPSC": "Bihar Public Service Commission (BPSC) exam. Prelims is a single General Studies paper (no separate CSAT). Mains has GS-I, GS-II + Bihar-specific paper. Include questions on Bihar's ancient history (Magadha, Nalanda, Vikramshila), Champaran Satyagraha, JP Movement, Bihar's geography (Gangetic plains, floods), state economy, and governance.",
        "JKPSC": "Jammu & Kashmir Public Service Commission (JKPSC) exam. UPSC-like structure with Prelims (GS + CSAT) and Mains (4 GS papers + J&K special). Include questions on J&K's unique governance history, Article 370 abrogation, Himalayan geography, Dal Lake, Ladakh, Dogra dynasty, state reorganization, and security challenges.",
        "UPPSC": "Uttar Pradesh Public Service Commission (UPPSC) exam. Prelims (GS + CSAT). Mains has 4 GS papers + 2 UP-specific GS papers (no optionals). Include questions on UP's Mughal heritage, Gangetic plains, 1857 revolt in UP, Lucknow Pact, UP's demographic challenges, industrial corridors, and state-specific governance policies.",
        "MPPSC": "Madhya Pradesh Public Service Commission (MPPSC) exam. Prelims (GS + CSAT, no negative marking). Mains has 3 GS papers (300 marks each) + Ethics (200 marks) + Hindi papers. Include questions on MP's tribal areas, Narmada basin, Sanchi-Bhimbetka heritage, MP's mineral resources, Bhopal gas tragedy, and state governance.",
        "RPSC": "Rajasthan Public Service Commission (RPSC) RAS exam. Prelims is a single paper (GK & General Science, 150 questions). Mains has 4 papers: Paper I (History, Economics, Sociology), Paper II (Science, Tech, Ethics), Paper III (Polity, Public Admin, Current Affairs), Paper IV (Hindi + English). Include questions on Rajput dynasties, Thar Desert, Rajasthan's arts/crafts, water management, state governance.",
        "OPSC": "Odisha Public Service Commission (OPSC) OAS exam. UPSC-like Prelims (GS + CSAT) and Mains (4 GS papers + optional). Include questions on Kalinga War, Konark Sun Temple, Jagannath Puri, Odisha's cyclone management, Hirakud Dam, tribal welfare (62 tribes), Odia literature, and state governance.",
        "HPSC": "Haryana Public Service Commission (HPSC) HCS exam. Prelims (GS + CSAT, 5 options per question). Mains has 4 GS papers (no optionals from 2026). Include questions on Haryana's agricultural economy, Kurukshetra, Harappa civilization sites, Bhagat Phool Singh, industrial development (Gurugram/Faridabad), Green Revolution impact, and state governance.",
        "UKPSC": "Uttarakhand Public Service Commission (UKPSC) exam. Prelims (GS + CSAT, 1/3 from Uttarakhand topics). Mains has 4 GS papers + 2 Uttarakhand-specific papers. Include questions on Uttarakhand's Himalayan geography, Chipko Movement, pilgrimage sites (Char Dham), glaciers, disaster management, Katyuri/Parmar/Chand dynasties, hydroelectric projects, and migration issues.",
        "HPPSC": "Himachal Pradesh Public Service Commission (HPPSC) HPAS exam. Prelims (GS + Aptitude). Mains has 3 GS papers + optional subject + HP special. Include questions on HP's history (Shimla Agreement, hill states), Himalayan geography, Kullu-Manali tourism, apple economy, hydropower, tribal areas (Lahaul-Spiti), and state governance.",
        "APSC_Assam": "Assam Public Service Commission (APSC) CCE exam. UPSC-like structure with Prelims (GS + CSAT) and Mains (4 GS papers + optional). Include questions on Ahom dynasty, Brahmaputra valley, tea industry, Kaziranga/Manas, Bodo/Karbi tribal culture, Assam Accord, NRC, flood management, and state governance.",
        "MeghalayaPSC": "Meghalaya Public Service Commission (MPSC) MCS exam. UPSC-like Prelims (GS + CSAT) and Mains (4 GS papers + optional). Include questions on Khasi, Garo & Jaintia tribal systems, living root bridges, Mawsynram/Cherrapunji rainfall, Shillong, uranium mining debate, state's autonomous councils, and NE governance issues.",
        "SikkimPSC": "Sikkim Public Service Commission (SPSC) CRE exam. Prelims has GS + Aptitude/Reasoning. Mains has Current Affairs & Analytical Ability paper + 2 optional subjects (no GS papers in mains). Include questions on Sikkim's merger with India, Buddhist monasteries, Kanchenjunga, organic farming policy, Lepcha/Bhutia customs, cardamom trade, and state governance.",
        "TripuraPSC": "Tripura Public Service Commission (TPSC) CCE exam. Prelims is a single paper (200 MCQs). Mains has GS papers on GK/History, Constitution & Polity, Economic Development + Tripura-specific content. Include questions on Tripura's tribal history (1857-1949), Kokborok language, Tripura Sundari temple, rubber/tea plantations, NE connectivity, and state governance.",
        "ArunachalPSC": "Arunachal Pradesh Public Service Commission (APPSC) CCE exam. UPSC-like Prelims (GS + CSAT) and Mains (4 GS papers + optional). 2025 revised syllabus includes environmental and digital governance. Include questions on Arunachal's tribal diversity (26 major tribes), Tawang monastery, McMahon Line, NE administrative evolution, bamboo resources, and state governance.",
      };

      const examContext = examContextMap[examType] || `${examType} examination. Tailor questions to the specific syllabus and regional context of this exam.`;

      const prompt = `Generate exactly ${numQuestions} multiple choice questions for ${examType} - ${gsCategory} preparation.

Exam context: ${examContext}

Difficulty level: ${difficulty} - ${difficultyDesc[difficulty]}

Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- Questions should be exam-relevant and test conceptual understanding
- Include a detailed explanation for the correct answer (2-3 sentences)
- Cover diverse sub-topics within ${gsCategory}
- Questions should reflect the actual exam pattern and syllabus of ${examType}
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
        examType,
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
          examType: quizAttempts.examType,
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
        .groupBy(quizAttempts.examType, quizAttempts.gsCategory);

      const recentTrend = await db
        .select({
          examType: quizAttempts.examType,
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
