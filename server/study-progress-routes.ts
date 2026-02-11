import type { Express } from "express";
import { db } from "./db";
import { isAuthenticated } from "./replit_integrations/auth";
import { conversations, quizAttempts, notes, dailyStudyGoals } from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

export function registerStudyProgressRoutes(app: Express) {
  app.get("/api/study-progress/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

      const ninetyDaysAgo = new Date(todayStart);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);

      const dailyActivity = await db
        .select({
          date: sql<string>`date(${conversations.createdAt})`,
          chatCount: sql<number>`count(*)::int`,
        })
        .from(conversations)
        .where(and(eq(conversations.userId, userId), gte(conversations.createdAt, ninetyDaysAgo)))
        .groupBy(sql`date(${conversations.createdAt})`)
        .orderBy(sql`date(${conversations.createdAt})`);

      const dailyQuiz = await db
        .select({
          date: sql<string>`date(${quizAttempts.createdAt})`,
          quizCount: sql<number>`count(*)::int`,
          totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
        })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.createdAt, ninetyDaysAgo)))
        .groupBy(sql`date(${quizAttempts.createdAt})`)
        .orderBy(sql`date(${quizAttempts.createdAt})`);

      const dailyNotes = await db
        .select({
          date: sql<string>`date(${notes.createdAt})`,
          noteCount: sql<number>`count(*)::int`,
        })
        .from(notes)
        .where(and(eq(notes.userId, userId), gte(notes.createdAt, ninetyDaysAgo)))
        .groupBy(sql`date(${notes.createdAt})`)
        .orderBy(sql`date(${notes.createdAt})`);

      const dailyGoals = await db
        .select({
          date: sql<string>`${dailyStudyGoals.goalDate}`,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${dailyStudyGoals.completed} = true)::int`,
        })
        .from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), gte(dailyStudyGoals.goalDate, thirtyDaysAgo.toISOString().split("T")[0])))
        .groupBy(dailyStudyGoals.goalDate)
        .orderBy(dailyStudyGoals.goalDate);

      const chatMap = Object.fromEntries(dailyActivity.map(r => [r.date, r.chatCount]));
      const quizMap = Object.fromEntries(dailyQuiz.map(r => [r.date, r]));
      const noteMap = Object.fromEntries(dailyNotes.map(r => [r.date, r.noteCount]));
      const goalMap = Object.fromEntries(dailyGoals.map(r => [r.date, r]));

      const streakDays: { date: string; level: number }[] = [];
      const days90: string[] = [];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        days90.push(d.toISOString().split("T")[0]);
      }

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      for (const dateStr of days90) {
        const chats = chatMap[dateStr] || 0;
        const quizzes = quizMap[dateStr]?.quizCount || 0;
        const notesCount = noteMap[dateStr] || 0;
        const totalActivity = chats + quizzes + notesCount;

        let level = 0;
        if (totalActivity >= 5) level = 4;
        else if (totalActivity >= 3) level = 3;
        else if (totalActivity >= 2) level = 2;
        else if (totalActivity >= 1) level = 1;

        streakDays.push({ date: dateStr, level });

        if (totalActivity > 0) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      for (let i = days90.length - 1; i >= 0; i--) {
        const d = streakDays[i];
        if (d.level > 0) {
          currentStreak++;
        } else {
          break;
        }
      }

      const last30 = days90.slice(-30);
      const dailyTimeData = last30.map(dateStr => {
        const chats = chatMap[dateStr] || 0;
        const quizzes = quizMap[dateStr]?.quizCount || 0;
        const notesCount = noteMap[dateStr] || 0;
        const estimatedMinutes = chats * 15 + quizzes * 10 + notesCount * 5;
        return { date: dateStr, minutes: estimatedMinutes };
      });

      const totalStudyDays = streakDays.filter(d => d.level > 0).length;

      const [allTimeStats] = await db
        .select({
          totalChats: sql<number>`count(*)::int`,
        })
        .from(conversations)
        .where(eq(conversations.userId, userId));

      const [allTimeQuiz] = await db
        .select({
          totalAttempts: sql<number>`count(*)::int`,
          totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      const [allTimeNotes] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(notes)
        .where(eq(notes.userId, userId));

      res.json({
        streakCalendar: streakDays,
        currentStreak,
        longestStreak,
        totalStudyDays,
        dailyTimeData,
        stats: {
          totalChats: allTimeStats?.totalChats || 0,
          totalQuizAttempts: allTimeQuiz?.totalAttempts || 0,
          totalQuestions: allTimeQuiz?.totalQuestions || 0,
          totalCorrect: allTimeQuiz?.totalCorrect || 0,
          totalNotes: allTimeNotes?.total || 0,
          quizAccuracy: allTimeQuiz?.totalQuestions ? Math.round((allTimeQuiz.totalCorrect / allTimeQuiz.totalQuestions) * 100) : 0,
        },
      });
    } catch (error) {
      console.error("Error fetching study progress:", error);
      res.status(500).json({ error: "Failed to fetch study progress" });
    }
  });

  app.get("/api/study-progress/subjects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const quizByExam = await db
        .select({
          examType: quizAttempts.examType,
          attempts: sql<number>`count(*)::int`,
          totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .groupBy(quizAttempts.examType)
        .orderBy(desc(sql`count(*)`));

      const quizByGsPaper = await db
        .select({
          gsPaper: quizAttempts.gsCategory,
          attempts: sql<number>`count(*)::int`,
          totalQuestions: sql<number>`coalesce(sum(${quizAttempts.totalQuestions}), 0)::int`,
          totalCorrect: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .groupBy(quizAttempts.gsCategory)
        .orderBy(desc(sql`count(*)`));

      const recentConversations = await db
        .select({
          id: conversations.id,
          title: conversations.title,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt))
        .limit(10);

      res.json({
        byExam: quizByExam,
        byGsPaper: quizByGsPaper,
        recentTopics: recentConversations,
      });
    } catch (error) {
      console.error("Error fetching subject breakdown:", error);
      res.status(500).json({ error: "Failed to fetch subject breakdown" });
    }
  });
}
