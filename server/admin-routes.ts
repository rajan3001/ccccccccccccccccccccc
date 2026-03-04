import type { Express } from "express";
import { db } from "./db";
import { users, otpVerifications, subscriptions } from "@shared/schema";
import { conversations, messages, quizAttempts, quizQuestions, dailyTopics, dailyDigests, notes, blogPosts, evaluationSessions, evaluationQuestions, studySessions } from "@shared/schema";
import { eq, sql, desc, count, inArray, and, gte, lte } from "drizzle-orm";

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

export function registerAdminRoutes(app: Express) {
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

  app.get("/admin", basicAuth, (_req, res) => {
    res.send(getAdminHtml());
  });

  app.get("/admin/{*path}", basicAuth, (_req, res) => {
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
      <h1>Learnpro <span class="brand-ai">AI</span></h1>
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
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      document.getElementById("section-" + name).classList.add("active");
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      document.querySelector('.nav-item[data-section="' + name + '"]').classList.add("active");

      const titles = {
        dashboard: "Dashboard", users: "Users", subscriptions: "Subscriptions",
        conversations: "Conversations", "current-affairs": "Current Affairs",
        quizzes: "Quizzes", evaluations: "Evaluations", notes: "Notes", articles: "Articles"
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

    loadDashboard();
  </script>
</body>
</html>`;
}
