import type { Express } from "express";
import { db } from "./db";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { users, otpVerifications, subscriptions } from "@shared/schema";
import { conversations, messages, quizAttempts, quizQuestions, dailyTopics, dailyDigests, notes, blogPosts, evaluationSessions, evaluationQuestions, studySessions } from "@shared/schema";
import { timetableSlots, syllabusTopics, userSyllabusProgress, dailyStudyGoals } from "@shared/schema";
import { pyqQuestions, pyqAttempts, PYQ_TOPICS, PYQ_SUBTOPICS, pyqIngestionJobs } from "@shared/schema";
import { pyqIngestCore, pyqAI, parseAIJson } from "./pyq-routes";
import { cancelJob } from "./pyq-worker";
import { eq, sql, desc, asc, count, inArray, and, gte, lte } from "drizzle-orm";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin@learnpro2026";

function basicAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Authentication required");
  }
  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = decoded.split(":");
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");
function ensureUploadsDir() {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

export function registerAdminRoutes(app: Express) {
  app.post("/admin/api/upload", basicAuth, (req: any, res: any) => {
    ensureUploadsDir();
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const fileData = Buffer.concat(chunks);
        const ext = ".pdf";
        const fileName = `${randomUUID()}${ext}`;
        const filePath = path.join(LOCAL_UPLOADS_DIR, fileName);
        fs.writeFileSync(filePath, fileData);
        const objectPath = `/objects/uploads/${fileName}`;
        res.json({ objectPath, fileName, size: fileData.length });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });
    req.on("error", (e: any) => res.status(500).json({ error: e.message }));
  });

  app.post("/admin/api/pyq/ingest", basicAuth, async (req: any, res: any) => {
    try {
      const result = await pyqIngestCore(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ error: e.message });
    }
  });

  app.post("/admin/api/pyq/queue", basicAuth, async (req: any, res: any) => {
    try {
      const { fileName, originalName, examType, examStage, year, paperType } = req.body;
      if (!fileName || !originalName || !examType || !examStage || !year || !paperType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const [job] = await db.insert(pyqIngestionJobs).values({
        fileName, originalName, examType, examStage,
        year: Number(year), paperType,
        status: "queued", progress: "Waiting in queue...",
      }).returning();
      res.json({ success: true, job });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/admin/api/pyq/jobs", basicAuth, async (_req: any, res: any) => {
    try {
      const jobs = await db.select().from(pyqIngestionJobs)
        .orderBy(desc(pyqIngestionJobs.createdAt))
        .limit(50);
      res.json({ jobs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/admin/api/pyq/jobs/:id/cancel", basicAuth, async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      const [job] = await db.select().from(pyqIngestionJobs).where(eq(pyqIngestionJobs.id, id)).limit(1);
      if (!job) return res.status(404).json({ error: "Job not found" });
      if (job.status === "processing") {
        cancelJob(id);
        await db.update(pyqIngestionJobs)
          .set({ status: "cancelled", progress: "Cancelled by user", updatedAt: new Date() })
          .where(eq(pyqIngestionJobs.id, id));
      } else if (job.status === "queued") {
        await db.update(pyqIngestionJobs)
          .set({ status: "cancelled", progress: "Cancelled before processing", updatedAt: new Date() })
          .where(eq(pyqIngestionJobs.id, id));
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/admin/api/pyq/jobs/:id", basicAuth, async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      const [job] = await db.select().from(pyqIngestionJobs).where(eq(pyqIngestionJobs.id, id)).limit(1);
      if (job && job.status === "processing") {
        cancelJob(id);
        await db.update(pyqIngestionJobs)
          .set({ status: "cancelled", progress: "Stopped and removed", updatedAt: new Date() })
          .where(eq(pyqIngestionJobs.id, id));
      }
      await db.delete(pyqIngestionJobs).where(eq(pyqIngestionJobs.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/admin/api/pyq/jobs/clear-finished", basicAuth, async (_req: any, res: any) => {
    try {
      const result = await db.delete(pyqIngestionJobs)
        .where(inArray(pyqIngestionJobs.status, ["completed", "failed", "cancelled"]));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/admin/api/pyq/fix-structure", basicAuth, async (_req: any, res: any) => {
    try {
      const allQ = await db.select().from(pyqQuestions).where(eq(pyqQuestions.questionType, "mcq"));
      const needsFix = allQ.filter(q => {
        const t = q.questionText || "";
        if (/[a-z]\n[a-z]/i.test(t)) return true;
        if (/\n\(?[a-d]\)/i.test(t) && q.options && q.options.length >= 2) return true;
        if (q.options?.some((o: string) => /\n/.test(o))) return true;
        return false;
      });
      res.json({ success: true, message: `Processing ${needsFix.length} of ${allQ.length} questions in background...` });

      const batchSize = 20;
      let fixedCount = 0;
      const errors: string[] = [];

      for (let b = 0; b < needsFix.length; b += batchSize) {
        const batch = needsFix.slice(b, b + batchSize);

        const fixPrompt = `You are a formatting quality-checker for UPSC exam questions extracted from PDF. Fix structural issues WITHOUT changing any content or meaning.

CRITICAL RULES:
1. MERGE BROKEN LINES: PDF extraction often breaks sentences across multiple lines. Merge any line that is a continuation of a sentence into the previous line. A line is a continuation if:
   - The previous line does NOT end with a period, question mark, colon, or closing bracket
   - The current line does NOT start with a numbered list item (1. 2. 3.) or option letter ((a) (b) etc.)
   Example: "The roads and river-routes\\nwere completely immune from robbery." → "The roads and river-routes were completely immune from robbery."

2. QUESTION TEXT: The questionText should be one clean flowing paragraph (or multiple paragraphs for list-type questions). Remove ALL unnecessary \\n within sentences. Keep \\n ONLY before:
   - Numbered list items: "1. ", "2. ", "3. "
   - "Select the correct answer", "Which of the above", "How many of the above"
   - "Consider the following"

3. MATCH-THE-COLUMN / PAIR QUESTIONS: If the question is about matching pairs (e.g. "correctly matched", "Match List-I with List-II"), the question text should contain the stem question followed by the list items. Each option in the options array should be a complete pair or combination on a single line.

4. OPTIONS: Each option must be a single complete string on one line. Merge any option text that was split across lines. Remove leading "(a)" "(b)" "(c)" "(d)" from option text since the UI adds these.

5. If options contain "(option not available)" placeholder text and the real options exist in questionText, extract them.

6. Do NOT change content, meaning, or correct answers.

Return ONLY a raw JSON array: [{ "id": number, "questionText": string, "options": [string,string,string,string] }]

Questions:
${JSON.stringify(batch.map(q => ({ id: q.id, questionText: q.questionText, options: q.options })))}`;

        try {
          const result = await pyqAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: fixPrompt }] }],
            config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0 },
          });
          const fixed = parseAIJson(result.text || "");
          const fixedArr = Array.isArray(fixed) ? fixed : [fixed];

          for (const fix of fixedArr) {
            if (!fix.id || !fix.questionText) continue;
            const orig = batch.find(q => q.id === fix.id);
            if (!orig) continue;

            const textChanged = fix.questionText !== orig.questionText;
            const optsChanged = JSON.stringify(fix.options) !== JSON.stringify(orig.options);

            if (textChanged || optsChanged) {
              await db.update(pyqQuestions)
                .set({
                  questionText: fix.questionText,
                  options: fix.options && Array.isArray(fix.options) && fix.options.length >= 2 ? fix.options : orig.options,
                })
                .where(eq(pyqQuestions.id, fix.id));
              fixedCount++;
            }
          }
        } catch (e: any) {
          errors.push(`Batch ${Math.floor(b / batchSize) + 1} failed: ${e.message}`);
        }

        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`[Structure Fix] Done: ${fixedCount} of ${needsFix.length} fixed. Errors: ${errors.length}`);
    } catch (e: any) {
      console.error(`[Structure Fix] Error: ${e.message}`);
    }
  });

  app.post("/admin/api/pyq/jobs/:id/retry", basicAuth, async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(pyqIngestionJobs)
        .set({ status: "queued", progress: "Re-queued for retry...", updatedAt: new Date(), totalExtracted: 0, validated: 0, inserted: 0, skipped: 0, rejected: 0, errorDetails: null })
        .where(eq(pyqIngestionJobs.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/admin/api/stats", basicAuth, async (_req, res) => {
    try {
      const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const [subCount] = await db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.status, "active"));
      const [chatCount] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);
      const [quizCount] = await db.select({ count: sql<number>`count(*)::int` }).from(quizAttempts);
      const [noteCount] = await db.select({ count: sql<number>`count(*)::int` }).from(notes);
      const [evalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(evaluationSessions);
      const [blogCount] = await db.select({ count: sql<number>`count(*)::int` }).from(blogPosts);
      const [digestCount] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyDigests);
      const [topicCount] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyTopics);
      const [msgCount] = await db.select({ count: sql<number>`count(*)::int` }).from(messages);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [todayUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(gte(users.createdAt, today));

      res.json({
        totalUsers: userCount?.count || 0,
        activeSubscriptions: subCount?.count || 0,
        totalChats: chatCount?.count || 0,
        totalQuizAttempts: quizCount?.count || 0,
        totalNotes: noteCount?.count || 0,
        totalEvaluations: evalCount?.count || 0,
        totalBlogPosts: blogCount?.count || 0,
        totalDigests: digestCount?.count || 0,
        totalTopics: topicCount?.count || 0,
        totalMessages: msgCount?.count || 0,
        todayNewUsers: todayUsers?.count || 0,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/admin/api/users", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = (req.query.search as string) || "";
      const offset = (page - 1) * limit;

      let whereClause = sql`1=1`;
      if (search) {
        whereClause = sql`(${users.phone} ILIKE ${"%" + search + "%"} OR ${users.displayName} ILIKE ${"%" + search + "%"} OR ${users.email} ILIKE ${"%" + search + "%"})`;
      }

      const allUsers = await db
        .select({
          id: users.id,
          phone: users.phone,
          email: users.email,
          displayName: users.displayName,
          isAdmin: users.isAdmin,
          onboardingCompleted: users.onboardingCompleted,
          language: users.language,
          targetExams: users.targetExams,
          userType: users.userType,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause);

      const userIds = allUsers.map((u) => u.id);

      const chatCounts = userIds.length > 0
        ? await db.select({ userId: conversations.userId, count: sql<number>`count(*)::int` }).from(conversations).where(inArray(conversations.userId, userIds)).groupBy(conversations.userId)
        : [];

      const quizCounts = userIds.length > 0
        ? await db.select({ userId: quizAttempts.userId, attempts: sql<number>`count(*)::int`, totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`, totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int` }).from(quizAttempts).where(inArray(quizAttempts.userId, userIds)).groupBy(quizAttempts.userId)
        : [];

      const noteCounts = userIds.length > 0
        ? await db.select({ userId: notes.userId, count: sql<number>`count(*)::int` }).from(notes).where(inArray(notes.userId, userIds)).groupBy(notes.userId)
        : [];

      const subData = userIds.length > 0
        ? await db.select({ userId: subscriptions.userId, status: subscriptions.status, plan: subscriptions.plan, currentPeriodEnd: subscriptions.currentPeriodEnd, amount: subscriptions.amount }).from(subscriptions).where(and(inArray(subscriptions.userId, userIds), eq(subscriptions.status, "active")))
        : [];

      const chatMap = Object.fromEntries(chatCounts.map((c) => [c.userId, c.count]));
      const quizMap = Object.fromEntries(quizCounts.map((q) => [q.userId, q]));
      const noteMap = Object.fromEntries(noteCounts.map((n) => [n.userId, n.count]));
      const subMap = Object.fromEntries(subData.map((s) => [s.userId, s]));

      const enrichedUsers = allUsers.map((u) => ({
        ...u,
        chats: chatMap[u.id] || 0,
        quizAttempts: quizMap[u.id]?.attempts || 0,
        quizQuestions: quizMap[u.id]?.totalQuestions || 0,
        quizCorrect: quizMap[u.id]?.totalCorrect || 0,
        notes: noteMap[u.id] || 0,
        subscription: subMap[u.id] || null,
      }));

      res.json({
        users: enrichedUsers,
        total: totalResult?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
      });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/admin/api/subscriptions", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allSubs = await db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          status: subscriptions.status,
          plan: subscriptions.plan,
          amount: subscriptions.amount,
          currency: subscriptions.currency,
          razorpayPaymentId: subscriptions.razorpayPaymentId,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          createdAt: subscriptions.createdAt,
        })
        .from(subscriptions)
        .orderBy(desc(subscriptions.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(subscriptions);

      const userIds = [...new Set(allSubs.map(s => s.userId))];
      const userList = userIds.length > 0
        ? await db.select({ id: users.id, displayName: users.displayName, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = Object.fromEntries(userList.map(u => [u.id, u]));

      const enriched = allSubs.map(s => ({ ...s, user: userMap[s.userId] || null }));

      res.json({ subscriptions: enriched, total: totalResult?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin subscriptions error:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.get("/admin/api/conversations", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allConvos = await db
        .select({
          id: conversations.id,
          userId: conversations.userId,
          title: conversations.title,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .orderBy(desc(conversations.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);

      const convoIds = allConvos.map(c => c.id);
      const msgCounts = convoIds.length > 0
        ? await db.select({ conversationId: messages.conversationId, count: sql<number>`count(*)::int` }).from(messages).where(inArray(messages.conversationId, convoIds)).groupBy(messages.conversationId)
        : [];
      const msgMap = Object.fromEntries(msgCounts.map(m => [m.conversationId, m.count]));

      const userIds = [...new Set(allConvos.map(c => c.userId))];
      const userList = userIds.length > 0
        ? await db.select({ id: users.id, displayName: users.displayName, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = Object.fromEntries(userList.map(u => [u.id, u]));

      const enriched = allConvos.map(c => ({ ...c, messageCount: msgMap[c.id] || 0, user: userMap[c.userId] || null }));

      res.json({ conversations: enriched, total: totalResult?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/admin/api/quizzes", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allQuizzes = await db
        .select({
          id: quizAttempts.id,
          userId: quizAttempts.userId,
          examType: quizAttempts.examType,
          gsCategory: quizAttempts.gsCategory,
          totalQuestions: quizAttempts.totalQuestions,
          score: quizAttempts.score,
          createdAt: quizAttempts.createdAt,
        })
        .from(quizAttempts)
        .orderBy(desc(quizAttempts.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(quizAttempts);

      const userIds = [...new Set(allQuizzes.map(q => q.userId))];
      const userList = userIds.length > 0
        ? await db.select({ id: users.id, displayName: users.displayName, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = Object.fromEntries(userList.map(u => [u.id, u]));

      const enriched = allQuizzes.map(q => ({ ...q, user: userMap[q.userId] || null }));

      res.json({ quizzes: enriched, total: totalResult?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin quizzes error:", error);
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  app.get("/admin/api/evaluations", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allEvals = await db
        .select({
          id: evaluationSessions.id,
          userId: evaluationSessions.userId,
          examType: evaluationSessions.examType,
          paperType: evaluationSessions.paperType,
          totalScore: evaluationSessions.totalScore,
          maxScore: evaluationSessions.maxScore,
          status: evaluationSessions.status,
          createdAt: evaluationSessions.createdAt,
        })
        .from(evaluationSessions)
        .orderBy(desc(evaluationSessions.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(evaluationSessions);

      const userIds = [...new Set(allEvals.map(e => e.userId))];
      const userList = userIds.length > 0
        ? await db.select({ id: users.id, displayName: users.displayName, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = Object.fromEntries(userList.map(u => [u.id, u]));

      const enriched = allEvals.map(e => ({ ...e, user: userMap[e.userId] || null }));

      res.json({ evaluations: enriched, total: totalResult?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin evaluations error:", error);
      res.status(500).json({ error: "Failed to fetch evaluations" });
    }
  });

  app.get("/admin/api/current-affairs", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allDigests = await db
        .select({
          id: dailyDigests.id,
          date: dailyDigests.date,
          source: dailyDigests.source,
          generatedAt: dailyDigests.generatedAt,
        })
        .from(dailyDigests)
        .orderBy(desc(dailyDigests.date))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyDigests);

      const digestIds = allDigests.map(d => d.id);
      const topicCounts = digestIds.length > 0
        ? await db.select({ digestId: dailyTopics.digestId, count: sql<number>`count(*)::int` }).from(dailyTopics).where(inArray(dailyTopics.digestId, digestIds)).groupBy(dailyTopics.digestId)
        : [];
      const topicMap = Object.fromEntries(topicCounts.map(t => [t.digestId, t.count]));

      const enriched = allDigests.map(d => ({ ...d, topicCount: topicMap[d.id] || 0 }));

      res.json({ digests: enriched, total: totalResult?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin current affairs error:", error);
      res.status(500).json({ error: "Failed to fetch current affairs" });
    }
  });

  app.get("/admin/api/articles", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allPosts = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          category: blogPosts.category,
          published: blogPosts.published,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
          createdAt: blogPosts.createdAt,
          publishedAt: blogPosts.publishedAt,
        })
        .from(blogPosts)
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(blogPosts);
      const [publishedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(blogPosts).where(eq(blogPosts.published, true));

      res.json({ articles: allPosts, total: totalResult?.count || 0, publishedTotal: publishedCount?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin articles error:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/admin/api/notes", basicAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allNotes = await db
        .select({
          id: notes.id,
          userId: notes.userId,
          title: notes.title,
          folder: notes.folder,
          tags: notes.tags,
          createdAt: notes.createdAt,
        })
        .from(notes)
        .orderBy(desc(notes.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(notes);

      const userIds = [...new Set(allNotes.map(n => n.userId))];
      const userList = userIds.length > 0
        ? await db.select({ id: users.id, displayName: users.displayName, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = Object.fromEntries(userList.map(u => [u.id, u]));

      const enriched = allNotes.map(n => ({ ...n, user: userMap[n.userId] || null }));

      res.json({ notes: enriched, total: totalResult?.count || 0, page, limit, totalPages: Math.ceil((totalResult?.count || 0) / limit) });
    } catch (error) {
      console.error("Admin notes error:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.get("/admin/api/export", basicAuth, async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allSubscriptions = await db.select().from(subscriptions);
      const allConversations = await db.select().from(conversations);
      const allMessages = await db.select().from(messages);
      const allQuizAttempts = await db.select().from(quizAttempts);
      const allQuizQuestions = await db.select().from(quizQuestions);
      const allNotes = await db.select().from(notes);
      const allEvalSessions = await db.select().from(evaluationSessions);
      const allEvalQuestions = await db.select().from(evaluationQuestions);
      const allStudySessions = await db.select().from(studySessions);
      const allDailyDigests = await db.select().from(dailyDigests);
      const allDailyTopics = await db.select().from(dailyTopics);
      const allBlogPosts = await db.select().from(blogPosts);
      const allTimetableSlots = await db.select().from(timetableSlots);
      const allUserSyllabusProgress = await db.select().from(userSyllabusProgress);
      const allDailyStudyGoals = await db.select().from(dailyStudyGoals);
      const allPyqQuestions = await db.select().from(pyqQuestions);
      const allPyqAttempts = await db.select().from(pyqAttempts);

      const exportData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        data: {
          users: allUsers,
          subscriptions: allSubscriptions,
          conversations: allConversations,
          messages: allMessages,
          quizAttempts: allQuizAttempts,
          quizQuestions: allQuizQuestions,
          notes: allNotes,
          evaluationSessions: allEvalSessions,
          evaluationQuestions: allEvalQuestions,
          studySessions: allStudySessions,
          dailyDigests: allDailyDigests,
          dailyTopics: allDailyTopics,
          blogPosts: allBlogPosts,
          timetableSlots: allTimetableSlots,
          userSyllabusProgress: allUserSyllabusProgress,
          dailyStudyGoals: allDailyStudyGoals,
          pyqQuestions: allPyqQuestions,
          pyqAttempts: allPyqAttempts,
        }
      };

      res.setHeader("Content-Disposition", `attachment; filename=learnpro_backup_${new Date().toISOString().slice(0, 10)}.json`);
      res.setHeader("Content-Type", "application/json");
      res.json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/admin/api/save-seed", basicAuth, async (_req, res) => {
    try {
      const seedDir = path.resolve(process.cwd(), "server", "seed-data");
      if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });

      const allUsers = await db.select().from(users);
      const allSubs = await db.select().from(subscriptions);
      const allSyllabus = await db.select().from(syllabusTopics);
      const allPyq = await db.select().from(pyqQuestions);
      const allBlog = await db.select().from(blogPosts);
      const allDigests = await db.select().from(dailyDigests);
      const allTopics = await db.select().from(dailyTopics);

      fs.writeFileSync(path.join(seedDir, "users.json"), JSON.stringify(allUsers, null, 2));
      fs.writeFileSync(path.join(seedDir, "subscriptions.json"), JSON.stringify(allSubs, null, 2));
      fs.writeFileSync(path.join(seedDir, "syllabus.json"), JSON.stringify(allSyllabus, null, 2));
      fs.writeFileSync(path.join(seedDir, "pyq-questions.json"), JSON.stringify(allPyq, null, 2));
      fs.writeFileSync(path.join(seedDir, "blog-posts.json"), JSON.stringify(allBlog, null, 2));
      fs.writeFileSync(path.join(seedDir, "daily-digests.json"), JSON.stringify(allDigests, null, 2));
      fs.writeFileSync(path.join(seedDir, "daily-topics.json"), JSON.stringify(allTopics, null, 2));

      res.json({
        success: true,
        saved: {
          users: allUsers.length,
          subscriptions: allSubs.length,
          syllabus: allSyllabus.length,
          pyqQuestions: allPyq.length,
          blogPosts: allBlog.length,
          dailyDigests: allDigests.length,
          dailyTopics: allTopics.length,
        }
      });
    } catch (error) {
      console.error("Save seed error:", error);
      res.status(500).json({ error: "Failed to save seed data" });
    }
  });

  app.post("/admin/api/import", basicAuth, async (req: any, res) => {
    try {
      const importData = req.body;

      if (!importData?.data) {
        return res.status(400).json({ error: "Invalid import format. Expected { data: { ... } }" });
      }

      const d = importData.data;
      const results: Record<string, { inserted: number; updated: number; skipped: number }> = {};
      const userIdMap: Record<string, string> = {};

      await db.transaction(async (tx) => {
        if (d.users?.length) {
          let inserted = 0, updated = 0, skipped = 0;
          for (const u of d.users) {
            const phone = u.phone;
            if (!phone) { skipped++; continue; }
            const importedId = u.id;

            const existing = await tx.select().from(users).where(eq(users.phone, phone)).limit(1);
            if (existing.length > 0) {
              userIdMap[importedId] = existing[0].id;
              await tx.update(users).set({
                displayName: (u.displayName || u.display_name) || existing[0].displayName,
                firstName: (u.firstName || u.first_name) || existing[0].firstName,
                lastName: (u.lastName || u.last_name) || existing[0].lastName,
                email: u.email || existing[0].email,
                profileImageUrl: (u.profileImageUrl || u.profile_image_url) || existing[0].profileImageUrl,
                userType: (u.userType || u.user_type) || existing[0].userType,
                targetExams: (u.targetExams || u.target_exams) || existing[0].targetExams,
                isAdmin: existing[0].isAdmin,
                onboardingCompleted: existing[0].onboardingCompleted || (u.onboardingCompleted ?? u.onboarding_completed ?? false),
                notificationPrefs: existing[0].notificationPrefs || (u.notificationPrefs || u.notification_prefs || {}),
                language: existing[0].language || u.language || "en",
                updatedAt: new Date(),
              }).where(eq(users.id, existing[0].id));
              updated++;
            } else {
              const newId = importedId || crypto.randomUUID();
              userIdMap[importedId] = newId;
              await tx.insert(users).values({
                id: newId,
                phone,
                email: u.email,
                firstName: u.firstName || u.first_name,
                lastName: u.lastName || u.last_name,
                profileImageUrl: u.profileImageUrl || u.profile_image_url,
                displayName: u.displayName || u.display_name,
                userType: u.userType || u.user_type,
                targetExams: u.targetExams || u.target_exams || [],
                isAdmin: u.isAdmin ?? u.is_admin ?? false,
                onboardingCompleted: u.onboardingCompleted ?? u.onboarding_completed ?? false,
                notificationPrefs: u.notificationPrefs || u.notification_prefs || {},
                language: u.language || "en",
                createdAt: (u.createdAt || u.created_at) ? new Date(u.createdAt || u.created_at) : new Date(),
                updatedAt: new Date(),
              });
              inserted++;
            }
          }
          results.users = { inserted, updated, skipped };
        }

        function remapUserId(record: any): string | null {
          const uid = record.userId || record.user_id;
          if (!uid) return null;
          return userIdMap[uid] || uid;
        }

        if (d.subscriptions?.length) {
          let inserted = 0, updated = 0, skipped = 0;
          for (const s of d.subscriptions) {
            const mappedUserId = remapUserId(s);
            if (!mappedUserId) { skipped++; continue; }

            const userExists = await tx.select({ id: users.id }).from(users).where(eq(users.id, mappedUserId)).limit(1);
            if (!userExists.length) { skipped++; continue; }

            const plan = s.plan || "monthly";
            const existingSub = await tx.select().from(subscriptions)
              .where(and(eq(subscriptions.userId, mappedUserId), eq(subscriptions.plan, plan)))
              .limit(1);

            if (existingSub.length > 0) {
              const importEnd = (s.currentPeriodEnd || s.current_period_end) ? new Date(s.currentPeriodEnd || s.current_period_end) : null;
              const existEnd = existingSub[0].currentPeriodEnd;
              const shouldUpdate = importEnd && (!existEnd || importEnd > existEnd);
              if (shouldUpdate) {
                await tx.update(subscriptions).set({
                  status: s.status || existingSub[0].status,
                  currentPeriodEnd: importEnd,
                  updatedAt: new Date(),
                }).where(eq(subscriptions.id, existingSub[0].id));
              }
              updated++;
            } else {
              await tx.insert(subscriptions).values({
                userId: mappedUserId,
                status: s.status || "active",
                plan,
                amount: s.amount,
                currency: s.currency || "INR",
                razorpayOrderId: s.razorpayOrderId || s.razorpay_order_id,
                razorpayPaymentId: s.razorpayPaymentId || s.razorpay_payment_id,
                razorpaySignature: s.razorpaySignature || s.razorpay_signature,
                currentPeriodEnd: (s.currentPeriodEnd || s.current_period_end) ? new Date(s.currentPeriodEnd || s.current_period_end) : null,
                createdAt: (s.createdAt || s.created_at) ? new Date(s.createdAt || s.created_at) : new Date(),
                updatedAt: new Date(),
              });
              inserted++;
            }
          }
          results.subscriptions = { inserted, updated, skipped };
        }

        const upsertRecords = async (table: any, records: any[], tableName: string, hasUserId = true) => {
          if (!records?.length) return;
          let inserted = 0, updated = 0, skipped = 0;
          for (const record of records) {
            try {
              const rec = { ...record };
              if (hasUserId) {
                const mappedId = remapUserId(rec);
                if (!mappedId) { skipped++; continue; }
                const userExists = await tx.select({ id: users.id }).from(users).where(eq(users.id, mappedId)).limit(1);
                if (!userExists.length) { skipped++; continue; }
                if (rec.userId || rec.user_id) {
                  rec.userId = mappedId;
                  if (rec.user_id) rec.user_id = mappedId;
                }
              }

              const existing = await tx.select().from(table).where(eq(table.id, rec.id)).limit(1);
              if (existing.length > 0) {
                updated++;
              } else {
                await tx.insert(table).values(rec);
                inserted++;
              }
            } catch (e: any) {
              console.error(`Import ${tableName} record error:`, e.message);
              skipped++;
            }
          }
          results[tableName] = { inserted, updated, skipped };
        };

        await upsertRecords(conversations, d.conversations, "conversations");
        await upsertRecords(messages, d.messages, "messages");
        await upsertRecords(quizAttempts, d.quizAttempts, "quizAttempts");
        await upsertRecords(quizQuestions, d.quizQuestions, "quizQuestions");
        await upsertRecords(notes, d.notes, "notes");
        await upsertRecords(evaluationSessions, d.evaluationSessions, "evaluationSessions");
        await upsertRecords(evaluationQuestions, d.evaluationQuestions, "evaluationQuestions");
        await upsertRecords(studySessions, d.studySessions, "studySessions");
        await upsertRecords(dailyDigests, d.dailyDigests, "dailyDigests", false);
        await upsertRecords(dailyTopics, d.dailyTopics, "dailyTopics");
        await upsertRecords(blogPosts, d.blogPosts, "blogPosts", false);
        await upsertRecords(timetableSlots, d.timetableSlots, "timetableSlots");
        await upsertRecords(userSyllabusProgress, d.userSyllabusProgress, "userSyllabusProgress");
        await upsertRecords(dailyStudyGoals, d.dailyStudyGoals, "dailyStudyGoals");

        if (d.pyqQuestions?.length) {
          let inserted = 0, updated = 0, skipped = 0;
          for (const q of d.pyqQuestions) {
            try {
              const existing = await tx.select({ id: pyqQuestions.id }).from(pyqQuestions).where(eq(pyqQuestions.id, q.id)).limit(1);
              if (existing.length > 0) {
                updated++;
                continue;
              }
              if (q.textHash) {
                const byHash = await tx.select({ id: pyqQuestions.id }).from(pyqQuestions).where(eq(pyqQuestions.textHash, q.textHash)).limit(1);
                if (byHash.length > 0) { skipped++; continue; }
              }
              await tx.insert(pyqQuestions).values(q);
              inserted++;
            } catch (e: any) {
              if (e.code === "23505") skipped++;
              else { console.error("Import pyqQuestion error:", e.message); skipped++; }
            }
          }
          results.pyqQuestions = { inserted, updated, skipped };
        }

        await upsertRecords(pyqAttempts, d.pyqAttempts, "pyqAttempts");
      });

      res.json({ success: true, message: "Import completed successfully. All user progress preserved.", results });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Import failed (no data was changed): " + error.message });
    }
  });

  app.get("/admin/api/pyq/questions", basicAuth, async (req, res) => {
    try {
      const { examType, examStage, year, paperType, topic, page = "1", limit = "20" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [];
      if (examType) conditions.push(eq(pyqQuestions.examType, examType as string));
      if (examStage) conditions.push(eq(pyqQuestions.examStage, examStage as string));
      if (year) conditions.push(eq(pyqQuestions.year, Number(year)));
      if (paperType) conditions.push(eq(pyqQuestions.paperType, paperType as string));
      if (topic) conditions.push(eq(pyqQuestions.topic, topic as string));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
        .from(pyqQuestions)
        .where(where as any);

      const questions = await db.select()
        .from(pyqQuestions)
        .where(where as any)
        .orderBy(desc(pyqQuestions.year), pyqQuestions.questionNumber)
        .limit(limitNum)
        .offset(offset);

      res.json({ questions, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
      console.error("Admin PYQ list error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/admin/api/pyq/questions/:id", basicAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = { ...req.body };
      delete updates.id;
      delete updates.createdAt;

      if (updates.questionText) {
        const { createHash } = await import("crypto");
        const normalized = updates.questionText.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
        updates.textHash = createHash("sha256").update(normalized).digest("hex").substring(0, 64);
      }

      const [updated] = await db.update(pyqQuestions)
        .set(updates)
        .where(eq(pyqQuestions.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Question not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Admin PYQ update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/admin/api/pyq/questions/:id", basicAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [deleted] = await db.delete(pyqQuestions)
        .where(eq(pyqQuestions.id, id))
        .returning({ id: pyqQuestions.id });

      if (!deleted) return res.status(404).json({ error: "Question not found" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin PYQ delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/admin/api/pyq/bulk-import", basicAuth, async (req: any, res) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Provide a non-empty 'questions' array" });
      }

      const { createHash } = await import("crypto");
      let inserted = 0, skipped = 0;
      const errors: string[] = [];

      for (const q of questions) {
        if (!q.examType || !q.examStage || !q.year || !q.paperType || !q.questionNumber || !q.questionText || !q.questionType) {
          errors.push("Q" + (q.questionNumber || "?") + ": Missing required fields");
          continue;
        }
        const normalized = q.questionText.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
        const tHash = createHash("sha256").update(normalized).digest("hex").substring(0, 64);

        const existing = await db.select({ id: pyqQuestions.id })
          .from(pyqQuestions)
          .where(eq(pyqQuestions.textHash, tHash))
          .limit(1);
        if (existing.length > 0) { skipped++; continue; }

        try {
          await db.insert(pyqQuestions).values({
            examType: q.examType,
            examStage: q.examStage,
            year: Number(q.year),
            paperType: q.paperType,
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || null,
            correctIndex: q.correctIndex ?? null,
            marks: q.marks || (q.examStage === "Prelims" ? 2 : 10),
            topic: q.topic || "Unclassified",
            subTopic: q.subTopic || null,
            difficulty: q.difficulty || null,
            explanation: q.explanation || null,
            textHash: tHash,
          });
          inserted++;
        } catch (e: any) {
          if (e.code === "23505") skipped++;
          else errors.push("Q" + q.questionNumber + ": " + e.message);
        }
      }

      res.json({ total: questions.length, inserted, skipped, errors });
    } catch (error: any) {
      console.error("Admin PYQ bulk import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/admin/api/pyq-stats", basicAuth, async (_req, res) => {
    try {
      const [totalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pyqQuestions);
      const [prelimsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pyqQuestions).where(eq(pyqQuestions.examStage, "Prelims"));
      const [mainsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pyqQuestions).where(eq(pyqQuestions.examStage, "Mains"));
      const [attemptsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pyqAttempts);

      const byExamType = await db.select({
        examType: pyqQuestions.examType,
        count: sql<number>`count(*)::int`,
      }).from(pyqQuestions).groupBy(pyqQuestions.examType);

      const byTopic = await db.select({
        topic: pyqQuestions.topic,
        count: sql<number>`count(*)::int`,
      }).from(pyqQuestions).groupBy(pyqQuestions.topic).orderBy(desc(sql`count(*)`));

      res.json({
        total: totalCount?.count || 0,
        prelims: prelimsCount?.count || 0,
        mains: mainsCount?.count || 0,
        attempts: attemptsCount?.count || 0,
        byExamType: byExamType || [],
        byTopic: byTopic || [],
      });
    } catch (error) {
      console.error("Admin PYQ stats error:", error);
      res.status(500).json({ error: "Failed to fetch PYQ stats" });
    }
  });

  app.get("/admin", basicAuth, (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.send(getAdminHtml());
  });

  app.get("/admin/{*path}", basicAuth, (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.send(getAdminHtml());
  });
}

function getAdminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learnpro AI - Admin Panel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; min-height: 100vh; }

    .sidebar { width: 250px; background: #fff; border-right: 1px solid #e2e8f0; position: fixed; top: 0; left: 0; bottom: 0; z-index: 20; display: flex; flex-direction: column; transition: transform 0.2s; }
    .sidebar-header { padding: 20px; border-bottom: 1px solid #e2e8f0; }
    .sidebar-header h1 { font-size: 18px; font-weight: 700; }
    .sidebar-header h1 .brand-ai { color: #d97706; }
    .sidebar-header .subtitle { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .sidebar-nav { flex: 1; overflow-y: auto; padding: 12px 0; }
    .nav-section { padding: 0 12px; margin-bottom: 8px; }
    .nav-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; padding: 8px 12px 4px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; color: #475569; transition: all 0.15s; text-decoration: none; margin-bottom: 2px; }
    .nav-item:hover { background: #f8fafc; color: #1e293b; }
    .nav-item.active { background: #fff7ed; color: #d97706; font-weight: 600; }
    .nav-item .icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .nav-item .nav-badge { margin-left: auto; background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 10px; }
    .sidebar-footer { padding: 16px 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }

    .main { margin-left: 250px; flex: 1; min-height: 100vh; }
    .topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .topbar h2 { font-size: 18px; font-weight: 600; }
    .topbar-actions { display: flex; gap: 8px; align-items: center; }
    .badge { background: #fff7ed; color: #d97706; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }

    .content { padding: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #fff; border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0; }
    .stat-card .label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .stat-card .sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }

    .card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .card-header h3 { font-size: 15px; font-weight: 600; }
    .card-body { padding: 0; }

    .search-bar { display: flex; gap: 12px; margin-bottom: 20px; }
    .search-bar input { flex: 1; padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; background: #fff; }
    .search-bar input:focus { border-color: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,0.1); }
    .btn { padding: 9px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .btn-primary { background: #d97706; color: #fff; }
    .btn-primary:hover { background: #b45309; }
    .btn-secondary { background: #f1f5f9; color: #475569; }
    .btn-secondary:hover { background: #e2e8f0; }

    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 700px; }
    th { background: #fafafa; padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
    td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
    tr:hover td { background: #fafafa; }
    .user-name { font-weight: 600; color: #1e293b; font-size: 13px; }
    .user-phone { color: #94a3b8; font-size: 12px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-active { background: #dcfce7; color: #16a34a; }
    .tag-pending { background: #fef3c7; color: #d97706; }
    .tag-free { background: #f1f5f9; color: #94a3b8; }
    .tag-admin { background: #fef3c7; color: #d97706; }
    .tag-plan { background: #fff7ed; color: #d97706; }
    .tag-published { background: #dcfce7; color: #16a34a; }
    .tag-draft { background: #f1f5f9; color: #94a3b8; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 16px; }
    .pagination button { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { font-size: 13px; color: #94a3b8; }

    .loading { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
    .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .empty-state .icon { font-size: 40px; margin-bottom: 12px; }
    .empty-state p { font-size: 14px; }

    .section { display: none; }
    .section.active { display: block; }

    .hamburger { display: none; background: none; border: none; font-size: 22px; cursor: pointer; padding: 4px 8px; }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); box-shadow: 4px 0 20px rgba(0,0,0,0.1); }
      .main { margin-left: 0; }
      .hamburger { display: block; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .stat-card { padding: 14px; }
      .stat-card .value { font-size: 22px; }
      .content { padding: 16px; }
    }
  </style>
</head>
<body>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>Learnpro <span class="brand-ai">AI</span> <span style="font-size:9px;font-weight:500;opacity:0.5;margin-left:3px;vertical-align:baseline;">v1.1</span></h1>
      <div class="subtitle">Admin Panel</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-label">Overview</div>
        <div class="nav-item active" data-section="dashboard" onclick="switchSection('dashboard')">
          <span class="icon">&#x1f4ca;</span> Dashboard
        </div>
      </div>
      <div class="nav-section">
        <div class="nav-section-label">Management</div>
        <div class="nav-item" data-section="users" onclick="switchSection('users')">
          <span class="icon">&#x1f465;</span> Users
        </div>
        <div class="nav-item" data-section="subscriptions" onclick="switchSection('subscriptions')">
          <span class="icon">&#x1f4b3;</span> Subscriptions
        </div>
        <div class="nav-item" data-section="conversations" onclick="switchSection('conversations')">
          <span class="icon">&#x1f4ac;</span> Conversations
        </div>
      </div>
      <div class="nav-section">
        <div class="nav-section-label">Content</div>
        <div class="nav-item" data-section="current-affairs" onclick="switchSection('current-affairs')">
          <span class="icon">&#x1f4f0;</span> Current Affairs
        </div>
        <div class="nav-item" data-section="quizzes" onclick="switchSection('quizzes')">
          <span class="icon">&#x2753;</span> Quizzes
        </div>
        <div class="nav-item" data-section="evaluations" onclick="switchSection('evaluations')">
          <span class="icon">&#x1f4dd;</span> Evaluations
        </div>
        <div class="nav-item" data-section="notes" onclick="switchSection('notes')">
          <span class="icon">&#x1f4d3;</span> Notes
        </div>
        <div class="nav-item" data-section="articles" onclick="switchSection('articles')">
          <span class="icon">&#x1f4f0;</span> Articles
        </div>
        <div class="nav-item" data-section="pyq-bank" onclick="switchSection('pyq-bank')">
          <span class="icon">&#x1f4d6;</span> PYQ Bank
        </div>
      </div>
      <div class="nav-section">
        <div class="nav-section-label">System</div>
        <div class="nav-item" data-section="backup" onclick="switchSection('backup')">
          <span class="icon">&#x1f4be;</span> Backup & Import
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">Learnpro AI &copy; 2026</div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="hamburger" onclick="toggleSidebar()">&#9776;</button>
        <h2 id="topbar-title">Dashboard</h2>
      </div>
      <div class="topbar-actions">
        <span class="badge">Secure Access</span>
      </div>
    </div>

    <div class="content">
      <!-- Dashboard Section -->
      <div class="section active" id="section-dashboard">
        <div class="stats-grid" id="stats-grid"></div>
        <div class="card">
          <div class="card-header"><h3>Recent Users</h3></div>
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>User</th><th>Type</th><th>Exams</th><th>Subscription</th><th>Joined</th></tr></thead>
                <tbody id="recent-users-tbody"><tr><td colspan="5" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Section -->
      <div class="section" id="section-users">
        <div class="search-bar">
          <input type="text" id="user-search" placeholder="Search by phone, name, or email..." />
          <button class="btn btn-primary" onclick="searchUsers()">Search</button>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Type</th><th>Exams</th><th>Chats</th><th>Quizzes</th><th>Notes</th><th>Subscription</th><th>Joined</th></tr></thead>
                <tbody id="users-tbody"><tr><td colspan="9" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="users-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Subscriptions Section -->
      <div class="section" id="section-subscriptions">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Plan</th><th>Status</th><th>Amount</th><th>Payment ID</th><th>Expires</th><th>Created</th></tr></thead>
                <tbody id="subs-tbody"><tr><td colspan="8" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="subs-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Conversations Section -->
      <div class="section" id="section-conversations">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Title</th><th>Messages</th><th>Created</th></tr></thead>
                <tbody id="convos-tbody"><tr><td colspan="5" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="convos-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Current Affairs Section -->
      <div class="section" id="section-current-affairs">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Date</th><th>Source</th><th>Topics</th><th>Generated</th></tr></thead>
                <tbody id="ca-tbody"><tr><td colspan="5" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="ca-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Quizzes Section -->
      <div class="section" id="section-quizzes">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Exam</th><th>Category</th><th>Questions</th><th>Score</th><th>Accuracy</th><th>Date</th></tr></thead>
                <tbody id="quizzes-tbody"><tr><td colspan="8" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="quizzes-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Evaluations Section -->
      <div class="section" id="section-evaluations">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Exam</th><th>Paper</th><th>Score</th><th>Status</th><th>Date</th></tr></thead>
                <tbody id="evals-tbody"><tr><td colspan="7" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="evals-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Notes Section -->
      <div class="section" id="section-notes">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Title</th><th>Folder</th><th>Tags</th><th>Created</th></tr></thead>
                <tbody id="notes-tbody"><tr><td colspan="6" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="notes-pagination"></div>
          </div>
        </div>
      </div>

      <!-- Articles Section -->
      <div class="section" id="section-articles">
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Status</th><th>Read Time</th><th>Published</th></tr></thead>
                <tbody id="articles-tbody"><tr><td colspan="6" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="articles-pagination"></div>
          </div>
        </div>
      </div>

      <!-- PYQ Bank Section -->
      <div class="section" id="section-pyq-bank">
        <div class="stats-grid" id="pyq-stats-grid"></div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>PDF Ingestion</h3></div>
          <div class="card-body" style="padding:20px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
              <div style="flex:1;min-width:180px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">PDF File</label>
                <input type="file" id="pyq-pdf-file" accept=".pdf" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;" />
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Exam Type</label>
                <select id="pyq-exam-type" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                  <option value="UPSC">UPSC</option>
                  <option value="JPSC">JPSC</option>
                  <option value="BPSC">BPSC</option>
                  <option value="MPSC">MPSC</option>
                  <option value="UPPSC">UPPSC</option>
                </select>
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Stage</label>
                <select id="pyq-exam-stage" onchange="updatePyqPaperTypes()" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                  <option value="Prelims">Prelims</option>
                  <option value="Mains">Mains</option>
                </select>
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Paper Type</label>
                <select id="pyq-paper-type" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                  <option value="GS">GS</option>
                </select>
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Year</label>
                <select id="pyq-year" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                </select>
              </div>
              <button class="btn btn-primary" onclick="uploadPyqPdf()" id="pyq-upload-btn">Upload & Queue</button>
            </div>
            <div id="pyq-upload-progress" style="display:none;padding:12px;background:#fffbeb;border-radius:8px;font-size:13px;color:#92400e;"></div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <h3>Ingestion Queue</h3>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary" onclick="clearFinishedJobs()" style="font-size:12px;padding:5px 12px;">Clear Finished</button>
              <button class="btn btn-secondary" onclick="loadPyqJobs()" style="font-size:12px;padding:5px 12px;">Refresh</button>
            </div>
          </div>
          <div class="card-body" id="pyq-jobs-container" style="padding:20px;">
            <div class="loading">Loading jobs...</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>Bulk JSON Import</h3></div>
          <div class="card-body" style="padding:20px;">
            <div style="display:flex;gap:12px;align-items:center;">
              <input type="file" id="pyq-json-file" accept=".json" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;flex:1;" />
              <button class="btn btn-primary" onclick="importPyqJson()" id="pyq-json-btn">Import JSON</button>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#94a3b8;">JSON format: { "questions": [{ examType, examStage, year, paperType, questionNumber, questionText, questionType, options, correctIndex, marks, topic, difficulty }] }</div>
            <div id="pyq-json-results" style="display:none;margin-top:12px;"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:8px;">
            <h3>Questions</h3>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-secondary pyq-stage-tab" data-stage="" onclick="filterPyqStage('')" style="font-size:12px;padding:5px 12px;">All</button>
              <button class="btn btn-secondary pyq-stage-tab" data-stage="Prelims" onclick="filterPyqStage('Prelims')" style="font-size:12px;padding:5px 12px;">Prelims</button>
              <button class="btn btn-secondary pyq-stage-tab" data-stage="Mains" onclick="filterPyqStage('Mains')" style="font-size:12px;padding:5px 12px;">Mains</button>
            </div>
          </div>
          <div style="padding:12px 20px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">
            <select id="pyq-filter-exam" onchange="loadPyqQuestions(1)" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">
              <option value="">All Exams</option>
              <option value="UPSC">UPSC</option>
              <option value="JPSC">JPSC</option>
              <option value="BPSC">BPSC</option>
            </select>
            <select id="pyq-filter-year" onchange="loadPyqQuestions(1)" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">
              <option value="">All Years</option>
            </select>
            <select id="pyq-filter-paper" onchange="loadPyqQuestions(1)" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">
              <option value="">All Papers</option>
              <option value="GS">GS</option>
              <option value="GS-I">GS-I</option>
              <option value="GS-II">GS-II</option>
              <option value="GS-III">GS-III</option>
              <option value="GS-IV">GS-IV</option>
              <option value="Essay">Essay</option>
            </select>
            <select id="pyq-filter-topic" onchange="loadPyqQuestions(1)" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">
              <option value="">All Topics</option>
            </select>
          </div>
          <div class="card-body">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Exam</th><th>Stage</th><th>Year</th><th>Paper</th><th>Topic</th><th>Difficulty</th><th>Type</th><th>Text</th><th>Actions</th></tr></thead>
                <tbody id="pyq-tbody"><tr><td colspan="10" class="loading">Loading...</td></tr></tbody>
              </table>
            </div>
            <div class="pagination" id="pyq-pagination"></div>
          </div>
        </div>
      </div>

      <!-- PYQ Edit Modal -->
      <div id="pyq-edit-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:100;overflow-y:auto;">
        <div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;padding:24px;position:relative;">
          <h3 style="margin-bottom:16px;font-size:16px;font-weight:600;">Edit Question</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Exam Type</label>
              <input id="pyq-edit-examType" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Stage</label>
              <select id="pyq-edit-examStage" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
                <option value="Prelims">Prelims</option>
                <option value="Mains">Mains</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Year</label>
              <input type="number" id="pyq-edit-year" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Paper Type</label>
              <input id="pyq-edit-paperType" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Question Number</label>
              <input type="number" id="pyq-edit-questionNumber" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Question Type</label>
              <select id="pyq-edit-questionType" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
                <option value="mcq">MCQ</option>
                <option value="mains">Mains</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Marks</label>
              <input type="number" id="pyq-edit-marks" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Correct Index (0-3)</label>
              <input type="number" id="pyq-edit-correctIndex" min="0" max="3" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Topic</label>
              <select id="pyq-edit-topic" onchange="updatePyqEditSubTopics()" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Sub Topic</label>
              <select id="pyq-edit-subTopic" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
                <option value="">None</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Difficulty</label>
              <select id="pyq-edit-difficulty" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
                <option value="">Unset</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Question Text</label>
            <textarea id="pyq-edit-questionText" rows="4" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;resize:vertical;"></textarea>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Options (JSON array, e.g. ["A","B","C","D"])</label>
            <input id="pyq-edit-options" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" />
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Explanation</label>
            <textarea id="pyq-edit-explanation" rows="3" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;resize:vertical;"></textarea>
          </div>
          <input type="hidden" id="pyq-edit-id" />
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
            <button class="btn btn-secondary" onclick="closePyqEditModal()">Cancel</button>
            <button class="btn btn-primary" onclick="savePyqEdit()" id="pyq-save-btn">Save Changes</button>
          </div>
        </div>
      </div>

      <div class="section" id="section-backup">
        <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="stat-card">
            <div class="stat-label">Export Backup</div>
            <div style="margin: 16px 0; font-size: 14px; color: #64748b;">Download a complete backup of all data including users, subscriptions, conversations, quizzes, notes, articles, and all progress. Use this to migrate or restore data.</div>
            <button onclick="exportBackup()" id="export-btn" style="background: #d97706; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">&#x2B07; Download Full Backup</button>
          </div>
          <div class="stat-card">
            <div class="stat-label">Import Data</div>
            <div style="margin: 16px 0; font-size: 14px; color: #64748b;">Upload a backup file to restore data. Existing users are matched by phone number — their progress is <strong>never overwritten or lost</strong>. New users and records are added safely.</div>
            <input type="file" id="import-file" accept=".json" style="display:none" onchange="importBackup(this)">
            <button onclick="document.getElementById('import-file').click()" id="import-btn" style="background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">&#x2B06; Upload & Import Backup</button>
          </div>
        </div>
        <div class="stats-grid" style="grid-template-columns: 1fr; margin-top: 16px;">
          <div class="stat-card">
            <div class="stat-label">Save to Seed Files</div>
            <div style="margin: 16px 0; font-size: 14px; color: #64748b;">Save current database data (users, PYQ questions, blog posts, syllabus, current affairs) to seed files. This ensures data is automatically restored on fresh deployments or clones.</div>
            <button onclick="saveSeedData()" id="save-seed-btn" style="background: #7c3aed; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">&#x1F4BE; Save Current Data to Seed Files</button>
            <div id="save-seed-result" style="display:none; margin-top: 12px; padding: 12px; border-radius: 8px; font-size: 13px;"></div>
          </div>
        </div>
        <div class="card" id="import-results" style="display:none;">
          <div class="card-header"><h3>Import Results</h3></div>
          <div class="card-body" id="import-results-body"></div>
        </div>
        <div class="card" style="margin-top: 16px;">
          <div class="card-header"><h3>How It Works</h3></div>
          <div class="card-body" style="font-size: 14px; color: #475569; line-height: 1.8;">
            <p><strong>&#x2705; Safe Import (Upsert Logic):</strong> Users are matched by phone number. If a user already exists, only missing profile fields are filled in — no existing data is overwritten.</p>
            <p><strong>&#x2705; Progress Preserved:</strong> Quiz attempts, conversations, notes, evaluations, and study sessions are never deleted or replaced during import.</p>
            <p><strong>&#x2705; Deduplication:</strong> Records with matching IDs are skipped, so importing the same backup twice won't create duplicates.</p>
            <p><strong>&#x2705; Cross-Project Migration:</strong> Export from one project, import into another. All user progress travels with them.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentSection = "dashboard";

    function esc(s) { if (!s) return "—"; const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
    function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "—"; }
    function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : "—"; }

    function toggleSidebar() {
      document.getElementById("sidebar").classList.toggle("open");
    }

    function switchSection(name) {
      currentSection = name;
      window.location.hash = name;
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      document.getElementById("section-" + name).classList.add("active");
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      document.querySelector('.nav-item[data-section="' + name + '"]').classList.add("active");

      const titles = {
        dashboard: "Dashboard", users: "Users", subscriptions: "Subscriptions",
        conversations: "Conversations", "current-affairs": "Current Affairs",
        quizzes: "Quizzes", evaluations: "Evaluations", notes: "Notes", articles: "Articles",
        "pyq-bank": "PYQ Bank", backup: "Backup & Import"
      };
      document.getElementById("topbar-title").textContent = titles[name] || name;

      document.getElementById("sidebar").classList.remove("open");

      const loaders = {
        dashboard: loadDashboard,
        users: () => loadUsers(1),
        subscriptions: () => loadSubscriptions(1),
        conversations: () => loadConversations(1),
        "current-affairs": () => loadCurrentAffairs(1),
        quizzes: () => loadQuizzes(1),
        evaluations: () => loadEvaluations(1),
        notes: () => loadNotes(1),
        articles: () => loadArticles(1),
        "pyq-bank": loadPyqBank,
      };
      if (loaders[name]) loaders[name]();
    }

    function renderPagination(containerId, currentPage, totalPages, total, loadFn) {
      const c = document.getElementById(containerId);
      if (totalPages <= 1) { c.innerHTML = '<span>Total: ' + total + '</span>'; return; }
      let h = '';
      h += '<button onclick="' + loadFn + '(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>&laquo; Prev</button>';
      h += '<span>Page ' + currentPage + ' of ' + totalPages + ' (' + total + ' total)</span>';
      h += '<button onclick="' + loadFn + '(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next &raquo;</button>';
      c.innerHTML = h;
    }

    function userCell(user) {
      if (!user) return '<span style="color:#94a3b8">—</span>';
      return '<div class="user-name">' + esc(user.displayName) + '</div><div class="user-phone">' + esc(user.phone) + '</div>';
    }

    function subTag(sub, isAdmin) {
      if (isAdmin) return '<span class="tag tag-admin">Admin</span>';
      if (!sub) return '<span class="tag tag-free">Free</span>';
      const exp = sub.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : '';
      return '<span class="tag tag-plan">' + esc(sub.plan || 'active') + '</span>' + (exp ? ' <span style="font-size:11px;color:#94a3b8;">till ' + exp + '</span>' : '');
    }

    async function loadDashboard() {
      try {
        const res = await fetch("/admin/api/stats");
        const d = await res.json();
        const grid = document.getElementById("stats-grid");
        grid.innerHTML = [
          { label: "Total Users", value: d.totalUsers, sub: "+" + d.todayNewUsers + " today" },
          { label: "Active Subscriptions", value: d.activeSubscriptions },
          { label: "Conversations", value: d.totalChats, sub: d.totalMessages + " messages" },
          { label: "Quiz Attempts", value: d.totalQuizAttempts },
          { label: "Notes Created", value: d.totalNotes },
          { label: "Evaluations", value: d.totalEvaluations },
          { label: "Current Affairs", value: d.totalDigests, sub: d.totalTopics + " topics" },
          { label: "Blog Articles", value: d.totalBlogPosts },
        ].map(s => '<div class="stat-card"><div class="label">' + s.label + '</div><div class="value">' + s.value + '</div>' + (s.sub ? '<div class="sub">' + s.sub + '</div>' : '') + '</div>').join('');

        const ures = await fetch("/admin/api/users?limit=5");
        const ud = await ures.json();
        const tbody = document.getElementById("recent-users-tbody");
        if (!ud.users || !ud.users.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="loading">No users yet</td></tr>';
          return;
        }
        tbody.innerHTML = ud.users.map(u => {
          const type = u.userType ? u.userType.replace(/_/g, " ") : "—";
          const exams = (u.targetExams && u.targetExams.length) ? u.targetExams.join(", ") : "—";
          return '<tr><td>' + userCell(u) + '</td><td>' + esc(type) + '</td><td>' + esc(exams) + '</td><td>' + subTag(u.subscription, u.isAdmin) + '</td><td>' + fmtDate(u.createdAt) + '</td></tr>';
        }).join('');
      } catch (e) { console.error(e); }
    }

    async function loadUsers(page) {
      const tbody = document.getElementById("users-tbody");
      tbody.innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';
      try {
        const search = document.getElementById("user-search").value.trim();
        const q = new URLSearchParams({ page, limit: 50, search });
        const res = await fetch("/admin/api/users?" + q);
        const d = await res.json();
        if (!d.users || !d.users.length) {
          tbody.innerHTML = '<tr><td colspan="9" class="loading">No users found</td></tr>';
          document.getElementById("users-pagination").innerHTML = "";
          return;
        }
        tbody.innerHTML = d.users.map((u, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          const type = u.userType ? u.userType.replace(/_/g, " ") : "—";
          const exams = (u.targetExams && u.targetExams.length) ? u.targetExams.join(", ") : "—";
          const accuracy = u.quizQuestions > 0 ? Math.round((u.quizCorrect / u.quizQuestions) * 100) : 0;
          const quizInfo = u.quizAttempts > 0 ? u.quizAttempts + " (" + accuracy + "%)" : "0";
          return '<tr><td>' + idx + '</td><td>' + userCell(u) + '</td><td>' + esc(type) + '</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;">' + esc(exams) + '</td><td>' + u.chats + '</td><td>' + quizInfo + '</td><td>' + u.notes + '</td><td>' + subTag(u.subscription, u.isAdmin) + '</td><td>' + fmtDate(u.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("users-pagination", d.page, d.totalPages, d.total, "loadUsers");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Error loading users</td></tr>';
      }
    }
    function searchUsers() { loadUsers(1); }

    async function loadSubscriptions(page) {
      const tbody = document.getElementById("subs-tbody");
      tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/subscriptions?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.subscriptions || !d.subscriptions.length) {
          tbody.innerHTML = '<tr><td colspan="8" class="loading">No subscriptions yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.subscriptions.map((s, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          const statusClass = s.status === "active" ? "tag-active" : s.status === "pending" ? "tag-pending" : "tag-free";
          return '<tr><td>' + idx + '</td><td>' + userCell(s.user) + '</td><td><span class="tag tag-plan">' + esc(s.plan) + '</span></td><td><span class="tag ' + statusClass + '">' + esc(s.status) + '</span></td><td>' + (s.amount ? "\\u20B9" + s.amount : "Free") + '</td><td style="font-size:12px;">' + esc(s.razorpayPaymentId) + '</td><td>' + fmtDate(s.currentPeriodEnd) + '</td><td>' + fmtDate(s.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("subs-pagination", d.page, d.totalPages, d.total, "loadSubscriptions");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Error loading subscriptions</td></tr>';
      }
    }

    async function loadConversations(page) {
      const tbody = document.getElementById("convos-tbody");
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/conversations?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.conversations || !d.conversations.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="loading">No conversations yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.conversations.map((c, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          return '<tr><td>' + idx + '</td><td>' + userCell(c.user) + '</td><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + esc(c.title) + '</td><td>' + c.messageCount + '</td><td>' + fmtDateTime(c.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("convos-pagination", d.page, d.totalPages, d.total, "loadConversations");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Error loading conversations</td></tr>';
      }
    }

    async function loadCurrentAffairs(page) {
      const tbody = document.getElementById("ca-tbody");
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/current-affairs?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.digests || !d.digests.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="loading">No current affairs digests yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.digests.map((dig, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          return '<tr><td>' + idx + '</td><td><strong>' + esc(dig.date) + '</strong></td><td>' + esc(dig.source) + '</td><td>' + dig.topicCount + ' topics</td><td>' + fmtDateTime(dig.generatedAt) + '</td></tr>';
        }).join('');
        renderPagination("ca-pagination", d.page, d.totalPages, d.total, "loadCurrentAffairs");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Error loading current affairs</td></tr>';
      }
    }

    async function loadQuizzes(page) {
      const tbody = document.getElementById("quizzes-tbody");
      tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/quizzes?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.quizzes || !d.quizzes.length) {
          tbody.innerHTML = '<tr><td colspan="8" class="loading">No quiz attempts yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.quizzes.map((q, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          const accuracy = q.totalQuestions > 0 ? Math.round((q.score / q.totalQuestions) * 100) + "%" : "—";
          return '<tr><td>' + idx + '</td><td>' + userCell(q.user) + '</td><td>' + esc(q.examType) + '</td><td>' + esc(q.gsCategory) + '</td><td>' + q.totalQuestions + '</td><td>' + q.score + '/' + q.totalQuestions + '</td><td>' + accuracy + '</td><td>' + fmtDateTime(q.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("quizzes-pagination", d.page, d.totalPages, d.total, "loadQuizzes");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Error loading quizzes</td></tr>';
      }
    }

    async function loadEvaluations(page) {
      const tbody = document.getElementById("evals-tbody");
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/evaluations?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.evaluations || !d.evaluations.length) {
          tbody.innerHTML = '<tr><td colspan="7" class="loading">No evaluations yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.evaluations.map((e, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          const scoreText = e.totalScore != null ? e.totalScore + '/' + (e.maxScore || 65) : '—';
          const statusClass = e.status === "completed" ? "tag-active" : "tag-pending";
          return '<tr><td>' + idx + '</td><td>' + userCell(e.user) + '</td><td>' + esc(e.examType) + '</td><td>' + esc(e.paperType) + '</td><td>' + scoreText + '</td><td><span class="tag ' + statusClass + '">' + esc(e.status) + '</span></td><td>' + fmtDateTime(e.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("evals-pagination", d.page, d.totalPages, d.total, "loadEvaluations");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading evaluations</td></tr>';
      }
    }

    async function loadNotes(page) {
      const tbody = document.getElementById("notes-tbody");
      tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/notes?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.notes || !d.notes.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="loading">No notes yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.notes.map((n, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          const tags = (n.tags && n.tags.length) ? n.tags.map(t => '<span class="tag tag-plan" style="margin-right:3px;">' + esc(t) + '</span>').join('') : '—';
          return '<tr><td>' + idx + '</td><td>' + userCell(n.user) + '</td><td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">' + esc(n.title) + '</td><td>' + esc(n.folder) + '</td><td>' + tags + '</td><td>' + fmtDateTime(n.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("notes-pagination", d.page, d.totalPages, d.total, "loadNotes");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Error loading notes</td></tr>';
      }
    }

    async function loadArticles(page) {
      const tbody = document.getElementById("articles-tbody");
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';
      try {
        const res = await fetch("/admin/api/articles?page=" + page + "&limit=50");
        const d = await res.json();
        if (!d.articles || !d.articles.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="loading">No articles yet</td></tr>';
          return;
        }
        tbody.innerHTML = d.articles.map((a, i) => {
          const idx = (d.page - 1) * d.limit + i + 1;
          const statusClass = a.published ? "tag-published" : "tag-draft";
          const statusText = a.published ? "Published" : "Draft";
          return '<tr><td>' + idx + '</td><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + esc(a.title) + '</td><td>' + esc(a.category) + '</td><td><span class="tag ' + statusClass + '">' + statusText + '</span></td><td>' + (a.readingTimeMinutes || '—') + ' min</td><td>' + fmtDate(a.publishedAt || a.createdAt) + '</td></tr>';
        }).join('');
        renderPagination("articles-pagination", d.page, d.totalPages, d.total, "loadArticles");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Error loading articles</td></tr>';
      }
    }

    document.getElementById("user-search").addEventListener("keydown", function(e) {
      if (e.key === "Enter") searchUsers();
    });

    async function exportBackup() {
      const btn = document.getElementById("export-btn");
      btn.textContent = "Exporting...";
      btn.disabled = true;
      try {
        const resp = await fetch("/admin/api/export");
        if (!resp.ok) throw new Error("Export failed");
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "learnpro_backup_" + new Date().toISOString().slice(0, 10) + ".json";
        a.click();
        URL.revokeObjectURL(url);
        btn.innerHTML = "&#x2705; Downloaded!";
        setTimeout(() => { btn.innerHTML = "&#x2B07; Download Full Backup"; btn.disabled = false; }, 3000);
      } catch (e) {
        btn.innerHTML = "&#x274C; Failed";
        setTimeout(() => { btn.innerHTML = "&#x2B07; Download Full Backup"; btn.disabled = false; }, 3000);
      }
    }

    async function importBackup(input) {
      const file = input.files[0];
      if (!file) return;
      const btn = document.getElementById("import-btn");
      btn.textContent = "Importing...";
      btn.disabled = true;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const resp = await fetch("/admin/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || "Import failed");

        const resultsDiv = document.getElementById("import-results");
        const body = document.getElementById("import-results-body");
        resultsDiv.style.display = "block";

        let html = '<table><thead><tr><th>Table</th><th>Inserted</th><th>Updated</th><th>Skipped</th></tr></thead><tbody>';
        for (const [table, counts] of Object.entries(result.results || {})) {
          html += "<tr><td><strong>" + esc(table) + "</strong></td><td style='color:#059669'>" + (counts.inserted || 0) + "</td><td style='color:#d97706'>" + (counts.updated || 0) + "</td><td style='color:#94a3b8'>" + (counts.skipped || 0) + "</td></tr>";
        }
        html += "</tbody></table>";
        body.innerHTML = html;

        btn.innerHTML = "&#x2705; Import Complete!";
        setTimeout(() => { btn.innerHTML = "&#x2B06; Upload & Import Backup"; btn.disabled = false; }, 3000);
        input.value = "";
        loadDashboard();
      } catch (e) {
        btn.innerHTML = "&#x274C; " + e.message;
        setTimeout(() => { btn.innerHTML = "&#x2B06; Upload & Import Backup"; btn.disabled = false; }, 5000);
        input.value = "";
      }
    }

    async function saveSeedData() {
      const btn = document.getElementById("save-seed-btn");
      const resultDiv = document.getElementById("save-seed-result");
      btn.textContent = "Saving...";
      btn.disabled = true;
      try {
        const resp = await fetch("/admin/api/save-seed", { method: "POST" });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || "Save failed");
        resultDiv.style.display = "block";
        resultDiv.style.background = "#f0fdf4";
        resultDiv.style.color = "#166534";
        let html = "<strong>Seed files saved successfully!</strong><br>";
        const s = result.saved;
        html += "Users: " + s.users + " | Subscriptions: " + s.subscriptions + " | Syllabus: " + s.syllabus;
        html += " | PYQ: " + s.pyqQuestions + " | Blog: " + s.blogPosts;
        html += " | Digests: " + s.dailyDigests + " | Topics: " + s.dailyTopics;
        resultDiv.innerHTML = html;
        btn.innerHTML = "&#x2705; Saved!";
        setTimeout(() => { btn.innerHTML = "&#x1F4BE; Save Current Data to Seed Files"; btn.disabled = false; }, 3000);
      } catch (e) {
        resultDiv.style.display = "block";
        resultDiv.style.background = "#fef2f2";
        resultDiv.style.color = "#991b1b";
        resultDiv.textContent = "Error: " + e.message;
        btn.innerHTML = "&#x274C; Failed";
        setTimeout(() => { btn.innerHTML = "&#x1F4BE; Save Current Data to Seed Files"; btn.disabled = false; }, 3000);
      }
    }

    const PYQ_TOPICS = ${JSON.stringify(PYQ_TOPICS)};
    const PYQ_SUBTOPICS = ${JSON.stringify(PYQ_SUBTOPICS)};
    let pyqStageFilter = "";

    function initPyqDropdowns() {
      const yearSel = document.getElementById("pyq-year");
      const filterYearSel = document.getElementById("pyq-filter-year");
      const filterTopicSel = document.getElementById("pyq-filter-topic");
      const editTopicSel = document.getElementById("pyq-edit-topic");

      yearSel.innerHTML = "";
      for (let y = 2026; y >= 2013; y--) {
        yearSel.innerHTML += '<option value="' + y + '">' + y + '</option>';
      }
      filterYearSel.innerHTML = '<option value="">All Years</option>';
      for (let y = 2026; y >= 2013; y--) {
        filterYearSel.innerHTML += '<option value="' + y + '">' + y + '</option>';
      }
      filterTopicSel.innerHTML = '<option value="">All Topics</option>';
      editTopicSel.innerHTML = "";
      PYQ_TOPICS.forEach(function(t) {
        filterTopicSel.innerHTML += '<option value="' + t + '">' + t + '</option>';
        editTopicSel.innerHTML += '<option value="' + t + '">' + t + '</option>';
      });
    }

    function updatePyqPaperTypes() {
      const stage = document.getElementById("pyq-exam-stage").value;
      const sel = document.getElementById("pyq-paper-type");
      if (stage === "Prelims") {
        sel.innerHTML = '<option value="GS">GS</option>';
      } else {
        sel.innerHTML = '<option value="GS-I">GS-I</option><option value="GS-II">GS-II</option><option value="GS-III">GS-III</option><option value="GS-IV">GS-IV</option><option value="Essay">Essay</option>';
      }
    }

    function updatePyqEditSubTopics() {
      const topic = document.getElementById("pyq-edit-topic").value;
      const sel = document.getElementById("pyq-edit-subTopic");
      sel.innerHTML = '<option value="">None</option>';
      const subs = PYQ_SUBTOPICS[topic] || [];
      subs.forEach(function(s) {
        sel.innerHTML += '<option value="' + s + '">' + s + '</option>';
      });
    }

    function filterPyqStage(stage) {
      pyqStageFilter = stage;
      document.querySelectorAll(".pyq-stage-tab").forEach(function(b) {
        b.classList.toggle("btn-primary", b.getAttribute("data-stage") === stage);
        b.classList.toggle("btn-secondary", b.getAttribute("data-stage") !== stage);
      });
      if (stage === "") {
        document.querySelectorAll(".pyq-stage-tab[data-stage='']")[0].classList.add("btn-primary");
        document.querySelectorAll(".pyq-stage-tab[data-stage='']")[0].classList.remove("btn-secondary");
      }
      loadPyqQuestions(1);
    }

    async function loadPyqStats() {
      try {
        const res = await fetch("/admin/api/pyq-stats");
        const d = await res.json();
        const grid = document.getElementById("pyq-stats-grid");
        const examCards = (d.byExamType || []).map(function(e) {
          return { label: e.examType, value: e.count };
        });
        const cards = [
          { label: "Total Questions", value: d.total },
          { label: "Prelims", value: d.prelims },
          { label: "Mains", value: d.mains },
          { label: "Total Attempts", value: d.attempts },
        ].concat(examCards);
        grid.innerHTML = cards.map(function(s) {
          return '<div class="stat-card"><div class="label">' + s.label + '</div><div class="value">' + s.value + '</div></div>';
        }).join('');
      } catch (e) { console.error(e); }
    }

    async function loadPyqBank() {
      initPyqDropdowns();
      await loadPyqStats();
      loadPyqJobs();
      filterPyqStage("");
    }

    async function loadPyqQuestions(page) {
      const tbody = document.getElementById("pyq-tbody");
      tbody.innerHTML = '<tr><td colspan="10" class="loading">Loading...</td></tr>';
      try {
        const params = new URLSearchParams({ page: page, limit: 20 });
        if (pyqStageFilter) params.set("examStage", pyqStageFilter);
        const examF = document.getElementById("pyq-filter-exam").value;
        const yearF = document.getElementById("pyq-filter-year").value;
        const paperF = document.getElementById("pyq-filter-paper").value;
        const topicF = document.getElementById("pyq-filter-topic").value;
        if (examF) params.set("examType", examF);
        if (yearF) params.set("year", yearF);
        if (paperF) params.set("paperType", paperF);
        if (topicF) params.set("topic", topicF);

        const res = await fetch("/admin/api/pyq/questions?" + params);
        const d = await res.json();
        if (!d.questions || !d.questions.length) {
          tbody.innerHTML = '<tr><td colspan="10" class="loading">No questions found</td></tr>';
          document.getElementById("pyq-pagination").innerHTML = "";
          return;
        }
        tbody.innerHTML = d.questions.map(function(q, i) {
          const idx = (d.page - 1) * 20 + i + 1;
          const diffClass = q.difficulty === "Easy" ? "tag-active" : q.difficulty === "Hard" ? "tag-pending" : "tag-plan";
          const stageClass = q.examStage === "Prelims" ? "tag-active" : "tag-plan";
          const typeClass = q.questionType === "mcq" ? "tag-active" : "tag-plan";
          const textPreview = (q.questionText || "").substring(0, 80) + ((q.questionText || "").length > 80 ? "..." : "");
          return '<tr>' +
            '<td>' + idx + '</td>' +
            '<td>' + esc(q.examType) + '</td>' +
            '<td><span class="tag ' + stageClass + '">' + esc(q.examStage) + '</span></td>' +
            '<td>' + q.year + '</td>' +
            '<td>' + esc(q.paperType) + '</td>' +
            '<td><span class="tag tag-plan">' + esc(q.topic) + '</span></td>' +
            '<td>' + (q.difficulty ? '<span class="tag ' + diffClass + '">' + esc(q.difficulty) + '</span>' : '—') + '</td>' +
            '<td><span class="tag ' + typeClass + '">' + esc(q.questionType) + '</span></td>' +
            '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(q.questionText) + '">' + esc(textPreview) + '</td>' +
            '<td style="white-space:nowrap;"><button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;margin-right:4px;" onclick=\\'openPyqEditModal(' + q.id + ')\\'>Edit</button><button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;color:#dc2626;" onclick=\\'deletePyqQuestion(' + q.id + ')\\'>Del</button></td>' +
            '</tr>';
        }).join('');
        renderPagination("pyq-pagination", d.page, d.totalPages, d.total, "loadPyqQuestions");
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="10" class="loading">Error loading questions</td></tr>';
      }
    }

    async function openPyqEditModal(id) {
      try {
        const res = await fetch("/admin/api/pyq/questions?limit=100");
        const d = await res.json();
        const q = d.questions.find(function(x) { return x.id === id; });
        if (!q) { alert("Question not found"); return; }
        document.getElementById("pyq-edit-id").value = q.id;
        document.getElementById("pyq-edit-examType").value = q.examType || "";
        document.getElementById("pyq-edit-examStage").value = q.examStage || "Prelims";
        document.getElementById("pyq-edit-year").value = q.year || "";
        document.getElementById("pyq-edit-paperType").value = q.paperType || "";
        document.getElementById("pyq-edit-questionNumber").value = q.questionNumber || "";
        document.getElementById("pyq-edit-questionType").value = q.questionType || "mcq";
        document.getElementById("pyq-edit-marks").value = q.marks || "";
        document.getElementById("pyq-edit-correctIndex").value = q.correctIndex != null ? q.correctIndex : "";
        document.getElementById("pyq-edit-topic").value = q.topic || "Unclassified";
        updatePyqEditSubTopics();
        document.getElementById("pyq-edit-subTopic").value = q.subTopic || "";
        document.getElementById("pyq-edit-difficulty").value = q.difficulty || "";
        document.getElementById("pyq-edit-questionText").value = q.questionText || "";
        document.getElementById("pyq-edit-options").value = q.options ? JSON.stringify(q.options) : "";
        document.getElementById("pyq-edit-explanation").value = q.explanation || "";
        document.getElementById("pyq-edit-modal").style.display = "block";
      } catch (e) {
        console.error(e);
        alert("Failed to load question");
      }
    }

    function closePyqEditModal() {
      document.getElementById("pyq-edit-modal").style.display = "none";
    }

    async function savePyqEdit() {
      const id = document.getElementById("pyq-edit-id").value;
      const btn = document.getElementById("pyq-save-btn");
      btn.textContent = "Saving...";
      btn.disabled = true;
      try {
        let options = null;
        const optStr = document.getElementById("pyq-edit-options").value.trim();
        if (optStr) { try { options = JSON.parse(optStr); } catch { alert("Invalid options JSON"); btn.textContent = "Save Changes"; btn.disabled = false; return; } }
        const correctIdx = document.getElementById("pyq-edit-correctIndex").value;
        const body = {
          examType: document.getElementById("pyq-edit-examType").value,
          examStage: document.getElementById("pyq-edit-examStage").value,
          year: parseInt(document.getElementById("pyq-edit-year").value),
          paperType: document.getElementById("pyq-edit-paperType").value,
          questionNumber: parseInt(document.getElementById("pyq-edit-questionNumber").value),
          questionType: document.getElementById("pyq-edit-questionType").value,
          marks: parseInt(document.getElementById("pyq-edit-marks").value),
          correctIndex: correctIdx !== "" ? parseInt(correctIdx) : null,
          topic: document.getElementById("pyq-edit-topic").value,
          subTopic: document.getElementById("pyq-edit-subTopic").value || null,
          difficulty: document.getElementById("pyq-edit-difficulty").value || null,
          questionText: document.getElementById("pyq-edit-questionText").value,
          options: options,
          explanation: document.getElementById("pyq-edit-explanation").value || null,
        };
        const res = await fetch("/admin/api/pyq/questions/" + id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        closePyqEditModal();
        loadPyqQuestions(1);
        btn.textContent = "Save Changes";
        btn.disabled = false;
      } catch (e) {
        alert("Error: " + e.message);
        btn.textContent = "Save Changes";
        btn.disabled = false;
      }
    }

    async function deletePyqQuestion(id) {
      if (!confirm("Delete this question?")) return;
      try {
        const res = await fetch("/admin/api/pyq/questions/" + id, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        loadPyqQuestions(1);
        loadPyqBank();
      } catch (e) {
        alert("Error: " + e.message);
      }
    }

    let jobPollInterval = null;

    async function uploadPyqPdf() {
      const fileInput = document.getElementById("pyq-pdf-file");
      const file = fileInput.files[0];
      if (!file) { alert("Please select a PDF file"); return; }

      const btn = document.getElementById("pyq-upload-btn");
      const progress = document.getElementById("pyq-upload-progress");
      btn.disabled = true;
      btn.textContent = "Uploading...";
      progress.style.display = "block";
      progress.style.background = "#fffbeb";
      progress.style.color = "#92400e";

      try {
        progress.textContent = "Uploading PDF...";
        const arrayBuf = await file.arrayBuffer();
        const uploadRes = await fetch("/admin/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: arrayBuf,
        });
        if (!uploadRes.ok) throw new Error("Upload failed: " + (await uploadRes.text()));
        const uploadData = await uploadRes.json();

        progress.textContent = "Queuing for processing...";
        const queueRes = await fetch("/admin/api/pyq/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: uploadData.fileName,
            originalName: file.name,
            examType: document.getElementById("pyq-exam-type").value,
            examStage: document.getElementById("pyq-exam-stage").value,
            year: document.getElementById("pyq-year").value,
            paperType: document.getElementById("pyq-paper-type").value,
          }),
        });
        const queueData = await queueRes.json();
        if (!queueRes.ok) throw new Error(queueData.error || "Queue failed");

        progress.textContent = "Queued! Processing will happen in the background.";
        progress.style.background = "#f0fdf4";
        progress.style.color = "#16a34a";
        setTimeout(function() { progress.style.display = "none"; }, 3000);
        loadPyqJobs();
        startJobPolling();
      } catch (e) {
        progress.textContent = "Error: " + e.message;
        progress.style.background = "#fef2f2";
        progress.style.color = "#dc2626";
      }
      btn.disabled = false;
      btn.textContent = "Upload & Queue";
      fileInput.value = "";
    }

    function startJobPolling() {
      if (jobPollInterval) return;
      jobPollInterval = setInterval(function() {
        loadPyqJobs(true);
      }, 3000);
    }

    function stopJobPolling() {
      if (jobPollInterval) { clearInterval(jobPollInterval); jobPollInterval = null; }
    }

    async function loadPyqJobs(silent) {
      const container = document.getElementById("pyq-jobs-container");
      if (!silent) container.innerHTML = '<div class="loading">Loading jobs...</div>';
      try {
        const res = await fetch("/admin/api/pyq/jobs");
        const d = await res.json();
        const jobs = d.jobs || [];
        if (jobs.length === 0) {
          container.innerHTML = '<div class="empty-state"><p>No ingestion jobs yet. Upload a PDF to get started.</p></div>';
          stopJobPolling();
          return;
        }

        let hasActive = false;
        let html = '';
        jobs.forEach(function(j) {
          const isActive = j.status === "queued" || j.status === "processing";
          if (isActive) hasActive = true;

          let statusColor, statusBg, statusIcon;
          if (j.status === "completed") { statusColor = "#16a34a"; statusBg = "#f0fdf4"; statusIcon = "&#x2705;"; }
          else if (j.status === "failed") { statusColor = "#dc2626"; statusBg = "#fef2f2"; statusIcon = "&#x274c;"; }
          else if (j.status === "cancelled") { statusColor = "#94a3b8"; statusBg = "#f1f5f9"; statusIcon = "&#x23f8;"; }
          else if (j.status === "processing") { statusColor = "#d97706"; statusBg = "#fffbeb"; statusIcon = "&#x23f3;"; }
          else { statusColor = "#64748b"; statusBg = "#f8fafc"; statusIcon = "&#x1f4cb;"; }

          let progressPercent = 0;
          if (j.status === "completed") progressPercent = 100;
          else if (j.status === "processing") {
            const prog = (j.progress || "").toLowerCase();
            if (prog.includes("reading")) progressPercent = 10;
            else if (prog.includes("extracting text") || prog.includes("ocr")) progressPercent = 20;
            else if (prog.includes("splitting")) progressPercent = 30;
            else if (prog.includes("chunk")) {
              var m = prog.match(/chunk (\\d+)\\/(\\d+)/);
              if (m) progressPercent = 30 + Math.round(40 * parseInt(m[1]) / parseInt(m[2]));
              else progressPercent = 50;
            }
            else if (prog.includes("validating")) progressPercent = 75;
            else if (prog.includes("classifying")) progressPercent = 85;
            else if (prog.includes("inserting")) progressPercent = 92;
            else progressPercent = 15;
          }
          else if (j.status === "failed") progressPercent = 100;

          var borderColor = j.status === "completed" ? "#bbf7d0" : j.status === "failed" ? "#fecaca" : j.status === "cancelled" ? "#e2e8f0" : j.status === "processing" ? "#fde68a" : "#e2e8f0";
          html += '<div style="background:' + statusBg + ';border:1px solid ' + borderColor + ';border-radius:10px;padding:16px;margin-bottom:12px;">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
          html += '<div style="display:flex;align-items:center;gap:8px;">';
          html += '<span style="font-size:16px;">' + statusIcon + '</span>';
          html += '<div>';
          html += '<div style="font-weight:600;font-size:14px;color:#1e293b;">' + esc(j.originalName) + '</div>';
          html += '<div style="font-size:11px;color:#94a3b8;">' + esc(j.examType) + ' ' + esc(j.examStage) + ' ' + j.year + ' ' + esc(j.paperType) + '</div>';
          html += '</div></div>';
          html += '<div style="display:flex;align-items:center;gap:6px;">';
          html += '<span style="font-size:11px;font-weight:600;color:' + statusColor + ';text-transform:uppercase;">' + esc(j.status) + '</span>';
          if (j.status === "processing" || j.status === "queued") {
            html += '<button class="btn" style="font-size:11px;padding:4px 10px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;" onclick="cancelJob(' + j.id + ')">&#x23f9; Stop</button>';
          }
          if (j.status === "failed" || j.status === "cancelled") {
            html += '<button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="retryJob(' + j.id + ')">&#x1f504; Retry</button>';
          }
          html += '<button class="btn" style="font-size:11px;padding:4px 10px;background:#fff;color:#dc2626;border:1px solid #fecaca;" onclick="deleteJob(' + j.id + ')" title="Remove from list">&#x1f5d1; Delete</button>';
          html += '</div></div>';

          html += '<div style="background:rgba(0,0,0,0.06);border-radius:6px;height:8px;overflow:hidden;margin-bottom:6px;">';
          var barColor = j.status === "failed" ? "#dc2626" : j.status === "completed" ? "#16a34a" : j.status === "cancelled" ? "#94a3b8" : "#d97706";
          html += '<div style="height:100%;border-radius:6px;transition:width 0.5s ease;width:' + progressPercent + '%;background:' + barColor + ';"></div>';
          html += '</div>';

          html += '<div style="font-size:12px;color:' + statusColor + ';">' + esc(j.progress || "—") + '</div>';

          if (j.status === "completed") {
            html += '<div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:#475569;">';
            html += '<span>Extracted: <strong>' + (j.totalExtracted || 0) + '</strong></span>';
            html += '<span>Validated: <strong>' + (j.validated || 0) + '</strong></span>';
            html += '<span>Inserted: <strong>' + (j.inserted || 0) + '</strong></span>';
            html += '<span>Skipped: <strong>' + (j.skipped || 0) + '</strong></span>';
            html += '<span>Rejected: <strong>' + (j.rejected || 0) + '</strong></span>';
            html += '</div>';
          }
          if (j.status === "failed" && j.errorDetails) {
            html += '<div style="margin-top:6px;font-size:12px;color:#dc2626;word-break:break-all;">' + esc(j.errorDetails) + '</div>';
          }
          html += '</div>';
        });

        container.innerHTML = html;

        loadPyqStats();
        if (hasActive) startJobPolling();
        else { stopJobPolling(); loadPyqQuestions(1); }
      } catch (e) {
        if (!silent) container.innerHTML = '<div class="loading">Error loading jobs</div>';
        console.error(e);
      }
    }

    async function clearFinishedJobs() {
      if (!confirm("Remove all completed, failed, and cancelled jobs?")) return;
      try {
        await fetch("/admin/api/pyq/jobs/clear-finished", { method: "POST" });
        loadPyqJobs();
      } catch (e) { alert("Error: " + e.message); }
    }

    async function cancelJob(id) {
      if (!confirm("Stop processing this job?")) return;
      try {
        await fetch("/admin/api/pyq/jobs/" + id + "/cancel", { method: "POST" });
        loadPyqJobs();
      } catch (e) { alert("Error: " + e.message); }
    }

    async function retryJob(id) {
      try {
        await fetch("/admin/api/pyq/jobs/" + id + "/retry", { method: "POST" });
        loadPyqJobs();
        startJobPolling();
      } catch (e) { alert("Error: " + e.message); }
    }

    async function deleteJob(id) {
      if (!confirm("Remove this job from the list?")) return;
      try {
        await fetch("/admin/api/pyq/jobs/" + id, { method: "DELETE" });
        loadPyqJobs();
      } catch (e) { alert("Error: " + e.message); }
    }

    async function importPyqJson() {
      const fileInput = document.getElementById("pyq-json-file");
      const file = fileInput.files[0];
      if (!file) { alert("Please select a JSON file"); return; }

      const btn = document.getElementById("pyq-json-btn");
      const results = document.getElementById("pyq-json-results");
      btn.disabled = true;
      btn.textContent = "Importing...";

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const questions = data.questions || data;
        if (!Array.isArray(questions)) throw new Error("Expected a JSON array or { questions: [...] }");

        const res = await fetch("/admin/api/pyq/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Import failed");

        let html = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:13px;">';
        html += '<strong>Total:</strong> ' + result.total + ' | <strong>Inserted:</strong> ' + result.inserted + ' | <strong>Skipped:</strong> ' + result.skipped;
        if (result.errors && result.errors.length > 0) {
          html += '<br><span style="color:#dc2626;">Errors: ' + result.errors.join("; ") + '</span>';
        }
        html += '</div>';
        results.innerHTML = html;
        results.style.display = "block";
        loadPyqBank();
      } catch (e) {
        results.innerHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;font-size:13px;color:#dc2626;">Error: ' + e.message + '</div>';
        results.style.display = "block";
      }
      btn.disabled = false;
      btn.textContent = "Import JSON";
      fileInput.value = "";
    }

    var initSection = window.location.hash.replace("#", "") || "dashboard";
    var validSections = ["dashboard","users","subscriptions","conversations","current-affairs","quizzes","evaluations","notes","articles","pyq-bank","backup"];
    if (validSections.indexOf(initSection) === -1) initSection = "dashboard";
    switchSection(initSection);
  </script>
</body>
</html>`;
}
