import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerCurrentAffairsRoutes } from "./current-affairs-routes";
import { registerQuizRoutes } from "./quiz-routes";
import { registerEvaluationRoutes } from "./evaluation-routes";
import { registerNotesRoutes } from "./notes-routes";
import { registerStudyPlannerRoutes } from "./study-planner-routes";
import { registerStudyProgressRoutes } from "./study-progress-routes";
import { registerPaymentRoutes, reconcilePendingSubscription } from "./payment-routes";
import { registerBlogRoutes } from "./blog-routes";
import { api } from "@shared/routes";
import { db } from "./db";
import { quizAttempts, conversations, messages, dailyTopics, notes } from "@shared/schema";
import { eq, and, gte, sql, desc, count } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerObjectStorageRoutes(app);
  registerChatRoutes(app);
  registerCurrentAffairsRoutes(app);
  registerQuizRoutes(app);
  registerEvaluationRoutes(app);
  registerNotesRoutes(app);
  registerStudyPlannerRoutes(app);
  registerStudyProgressRoutes(app);
  registerPaymentRoutes(app, isAuthenticated);
  registerBlogRoutes(app);

  // Subscription Routes
  app.get(api.subscription.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const isAdmin = req.user?.dbUser?.isAdmin === true;
    let sub = await storage.getActiveSubscription(userId);

    if (!sub) {
      const reconciled = await reconcilePendingSubscription(userId);
      if (reconciled) {
        sub = await storage.getActiveSubscription(userId);
      }
    }

    const isActive = sub?.status === 'active' && sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date();
    const { getTierFromPlan } = await import("@shared/schema");
    const tier = isActive && sub ? getTierFromPlan(sub.plan) : null;
    const isPro = isAdmin || (tier !== null);
    res.json({ isPro, isAdmin, tier: isAdmin ? "ultimate" : tier, subscription: sub || null });
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [todayQuiz] = await db
        .select({
          attempts: sql<number>`count(*)::int`,
          totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
        })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.createdAt, todayStart)));

      const [todayChats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(and(eq(conversations.userId, userId), gte(conversations.createdAt, todayStart)));

      const [todayNotes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notes)
        .where(and(eq(notes.userId, userId), gte(notes.createdAt, todayStart)));

      const [caRevision] = await db
        .select({
          total: sql<number>`count(*)::int`,
          revised: sql<number>`count(*) filter (where ${dailyTopics.revised} = true)::int`,
        })
        .from(dailyTopics);

      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const weeklyProgress = await db
        .select({
          date: sql<string>`date(${quizAttempts.createdAt})`,
          questions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          correct: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
          attempts: sql<number>`count(*)::int`,
        })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.createdAt, sevenDaysAgo)))
        .groupBy(sql`date(${quizAttempts.createdAt})`)
        .orderBy(sql`date(${quizAttempts.createdAt})`);

      const weeklyChats = await db
        .select({
          date: sql<string>`date(${conversations.createdAt})`,
          count: sql<number>`count(*)::int`,
        })
        .from(conversations)
        .where(and(eq(conversations.userId, userId), gte(conversations.createdAt, sevenDaysAgo)))
        .groupBy(sql`date(${conversations.createdAt})`)
        .orderBy(sql`date(${conversations.createdAt})`);

      const weeklyNotes = await db
        .select({
          date: sql<string>`date(${notes.createdAt})`,
          count: sql<number>`count(*)::int`,
        })
        .from(notes)
        .where(and(eq(notes.userId, userId), gte(notes.createdAt, sevenDaysAgo)))
        .groupBy(sql`date(${notes.createdAt})`)
        .orderBy(sql`date(${notes.createdAt})`);

      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
      }

      const quizMap = Object.fromEntries(weeklyProgress.map(r => [r.date, r]));
      const chatMap = Object.fromEntries(weeklyChats.map(r => [r.date, r.count]));
      const noteMap = Object.fromEntries(weeklyNotes.map(r => [r.date, r.count]));

      const trendData = days.map(date => ({
        date,
        mcqs: quizMap[date]?.questions || 0,
        correct: quizMap[date]?.correct || 0,
        chats: chatMap[date] || 0,
        notes: noteMap[date] || 0,
      }));

      const [allTimeQuiz] = await db
        .select({
          totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
          attempts: sql<number>`count(*)::int`,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      const [allTimeChats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(eq(conversations.userId, userId));

      const [allTimeNotes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notes)
        .where(eq(notes.userId, userId));

      res.json({
        today: {
          mcqsSolved: todayQuiz?.totalQuestions || 0,
          mcqsCorrect: todayQuiz?.totalCorrect || 0,
          quizAttempts: todayQuiz?.attempts || 0,
          topicsStudied: todayChats?.count || 0,
          notesSaved: todayNotes?.count || 0,
          currentAffairsRead: caRevision?.revised || 0,
        },
        allTime: {
          mcqsSolved: allTimeQuiz?.totalQuestions || 0,
          mcqsCorrect: allTimeQuiz?.totalCorrect || 0,
          quizAttempts: allTimeQuiz?.attempts || 0,
          topicsStudied: allTimeChats?.count || 0,
          notesSaved: allTimeNotes?.count || 0,
          currentAffairsTotal: caRevision?.total || 0,
          currentAffairsRevised: caRevision?.revised || 0,
        },
        trend: trendData,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  return httpServer;
}
