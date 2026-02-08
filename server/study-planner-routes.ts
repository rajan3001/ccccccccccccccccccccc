import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import {
  timetableSlots,
  syllabusTopics,
  userSyllabusProgress,
  dailyStudyGoals,
  quizAttempts,
  quizQuestions,
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { z } from "zod";

const UPSC_SYLLABUS = [
  {
    gsPaper: "GS Paper I",
    topics: [
      { parent: "Indian Heritage & Culture", topics: ["Indian Culture - Salient Aspects", "Art Forms", "Literature", "Architecture", "Ancient Indian History", "Medieval Indian History", "Modern Indian History", "Freedom Struggle - Various Stages", "Important Contributors & Their Contributions", "Post-Independence Consolidation", "Reorganization of States"] },
      { parent: "World History", topics: ["Industrial Revolution", "World Wars & Their Impact", "Colonization & Decolonization", "Political Philosophies - Communism, Capitalism, Socialism", "Redrawing of National Boundaries", "Impact of World Events on India"] },
      { parent: "Indian Society", topics: ["Salient Features of Indian Society", "Diversity of India", "Role of Women & Women's Organizations", "Population & Associated Issues", "Poverty & Developmental Issues", "Urbanization - Problems & Remedies", "Effects of Globalization on Indian Society", "Social Empowerment", "Communalism, Regionalism & Secularism"] },
      { parent: "Geography", topics: ["Physical Geography - Geomorphology", "Climatology & Oceanography", "Indian Physical Geography", "Indian Economic Geography", "World Geography - Major Natural Resources", "Geophysical Phenomena - Earthquakes, Tsunami, Volcanoes", "Geographical Features & Their Location", "Changes in Critical Geographical Features", "Factors Responsible for Location of Industries"] },
    ],
  },
  {
    gsPaper: "GS Paper II",
    topics: [
      { parent: "Governance & Constitution", topics: ["Indian Constitution - Historical Underpinnings", "Evolution & Features of Constitution", "Amendments & Basic Structure", "Functions & Responsibilities of Union & States", "Separation of Powers - Disputes & Redressal", "Federal Structure - Issues & Challenges", "Parliament & State Legislatures - Structure & Functioning", "Powers & Privileges of Legislature"] },
      { parent: "Polity & Governance", topics: ["Executive & Judiciary - Structure & Functioning", "Statutory, Regulatory & Quasi-Judicial Bodies", "Representation of People's Act", "Appointment to Various Constitutional Bodies", "Government Policies & Interventions", "Development Processes & Development Industry", "E-Governance - Applications & Limitations", "Role of Civil Services"] },
      { parent: "Social Justice", topics: ["Welfare Schemes - Performance & Mechanisms", "Issues Relating to Poverty & Hunger", "Mechanisms for Vulnerable Sections", "Issues Relating to Education", "Issues Relating to Health", "Labour & Employment", "Issues relating to SCs, STs, OBCs, Minorities & PWDs"] },
      { parent: "International Relations", topics: ["India & Its Neighbors - Relations", "Bilateral, Regional & Global Groupings", "Effect of Policies on India's Interests", "Important International Institutions & Agencies", "Indian Diaspora", "Geopolitics of South Asia", "Geopolitics of Indo-Pacific Region"] },
    ],
  },
  {
    gsPaper: "GS Paper III",
    topics: [
      { parent: "Indian Economy", topics: ["Indian Economy - Growth & Development", "Inclusive Growth & Issues", "Government Budgeting", "Mobilization of Resources", "Agriculture - Issues & Reforms", "Food Processing & Related Industries", "Land Reforms in India", "Effects of Liberalization on Economy", "Infrastructure - Energy, Ports, Roads, Airports", "Investment Models - PPP"] },
      { parent: "Science & Technology", topics: ["Developments in Science & Technology", "Indigenization of Technology", "Achievements of Indians in S&T", "Awareness in IT, Space, Computers", "Robotics & Nano-technology", "Bio-technology & Issues", "Intellectual Property Rights"] },
      { parent: "Environment & Ecology", topics: ["Conservation & Environmental Pollution", "Environmental Impact Assessment", "Biodiversity & Its Conservation", "Climate Change & Its Impact", "Wildlife Protection & Laws", "Environmental Organizations & Treaties", "Sustainable Development Goals"] },
      { parent: "Internal Security", topics: ["Internal Security Challenges & Threats", "Linkages of Organized Crime & Terrorism", "Role of External State & Non-State Actors", "Border Management & Challenges", "Cyber Security - Threats & Framework", "Money Laundering & Its Prevention", "Security Forces & Agencies - Mandate & Role", "Role of Media & Social Media in Internal Security"] },
      { parent: "Disaster Management", topics: ["Disaster Management - Framework & Institutions", "Disaster Preparedness & Response", "Disaster Mitigation Strategies", "Community-Based Disaster Management", "Sendai Framework & India's NDMA"] },
    ],
  },
  {
    gsPaper: "GS Paper IV",
    topics: [
      { parent: "Ethics & Human Interface", topics: ["Ethics & Human Values - Lessons from Lives of Great Leaders", "Role of Family, Society & Educational Institutions", "Attitude - Content, Structure & Function", "Emotional Intelligence - Concepts & Application", "Moral & Political Attitudes", "Contributions of Moral Thinkers - Indian & Western", "Public/Civil Service Values & Ethics in Public Administration", "Ethical Issues in International Relations & Funding"] },
      { parent: "Aptitude & Integrity", topics: ["Aptitude & Foundational Values for Civil Service", "Integrity in Public Service", "Philosophical Basis of Governance & Probity", "Information Sharing & Transparency in Government", "Right to Information & Citizen Charters", "Code of Ethics & Code of Conduct", "Work Culture & Quality of Service Delivery", "Utilization of Public Funds - Challenges & Ethics", "Ethical Concerns & Dilemmas - Case Studies"] },
    ],
  },
];

async function seedSyllabusIfNeeded() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(syllabusTopics);
  if (existing[0]?.count > 0) return;

  let orderIdx = 0;
  for (const paper of UPSC_SYLLABUS) {
    for (const section of paper.topics) {
      await db.insert(syllabusTopics).values({
        gsPaper: paper.gsPaper,
        parentTopic: null,
        topic: section.parent,
        orderIndex: orderIdx++,
      });
      for (const topic of section.topics) {
        await db.insert(syllabusTopics).values({
          gsPaper: paper.gsPaper,
          parentTopic: section.parent,
          topic,
          orderIndex: orderIdx++,
        });
      }
    }
  }
}

export function registerStudyPlannerRoutes(app: Express): void {
  seedSyllabusIfNeeded().catch(console.error);

  app.get("/api/study-planner/timetable", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const slots = await db.select().from(timetableSlots)
        .where(eq(timetableSlots.userId, userId))
        .orderBy(timetableSlots.dayOfWeek, timetableSlots.startTime);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      res.status(500).json({ error: "Failed to fetch timetable" });
    }
  });

  app.post("/api/study-planner/timetable", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        gsPaper: z.string(),
        subject: z.string(),
        notes: z.string().optional(),
      });
      const data = schema.parse(req.body);
      const [slot] = await db.insert(timetableSlots).values({ ...data, userId }).returning();
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating timetable slot:", error);
      res.status(400).json({ error: "Failed to create timetable slot" });
    }
  });

  app.delete("/api/study-planner/timetable/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(timetableSlots).where(and(eq(timetableSlots.id, id), eq(timetableSlots.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting timetable slot:", error);
      res.status(500).json({ error: "Failed to delete timetable slot" });
    }
  });

  app.get("/api/study-planner/syllabus", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const topics = await db.select().from(syllabusTopics).orderBy(syllabusTopics.orderIndex);
      const progress = await db.select().from(userSyllabusProgress).where(eq(userSyllabusProgress.userId, userId));
      const progressMap: Record<number, boolean> = {};
      for (const p of progress) {
        progressMap[p.topicId] = p.completed;
      }
      const result = topics.map((t) => ({ ...t, completed: progressMap[t.id] || false }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching syllabus:", error);
      res.status(500).json({ error: "Failed to fetch syllabus" });
    }
  });

  app.patch("/api/study-planner/syllabus/:topicId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const topicId = parseInt(req.params.topicId);
      const { completed } = req.body;
      const existing = await db.select().from(userSyllabusProgress)
        .where(and(eq(userSyllabusProgress.userId, userId), eq(userSyllabusProgress.topicId, topicId)));
      if (existing.length > 0) {
        await db.update(userSyllabusProgress)
          .set({ completed, completedAt: completed ? new Date() : null })
          .where(and(eq(userSyllabusProgress.userId, userId), eq(userSyllabusProgress.topicId, topicId)));
      } else {
        await db.insert(userSyllabusProgress).values({
          userId,
          topicId,
          completed,
          completedAt: completed ? new Date() : null,
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating syllabus progress:", error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  app.get("/api/study-planner/daily-goals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const dateStr = req.query.date as string || new Date().toISOString().split("T")[0];
      const goals = await db.select().from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, dateStr)))
        .orderBy(dailyStudyGoals.createdAt);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching daily goals:", error);
      res.status(500).json({ error: "Failed to fetch daily goals" });
    }
  });

  app.post("/api/study-planner/daily-goals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({
        title: z.string().min(1),
        goalDate: z.string(),
      });
      const data = schema.parse(req.body);
      const [goal] = await db.insert(dailyStudyGoals).values({ ...data, userId }).returning();
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating daily goal:", error);
      res.status(400).json({ error: "Failed to create daily goal" });
    }
  });

  app.patch("/api/study-planner/daily-goals/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      await db.update(dailyStudyGoals)
        .set({ completed })
        .where(and(eq(dailyStudyGoals.id, id), eq(dailyStudyGoals.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating daily goal:", error);
      res.status(500).json({ error: "Failed to update daily goal" });
    }
  });

  app.delete("/api/study-planner/daily-goals/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.id, id), eq(dailyStudyGoals.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting daily goal:", error);
      res.status(500).json({ error: "Failed to delete daily goal" });
    }
  });

  app.get("/api/study-planner/dashboard", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;

      const topics = await db.select().from(syllabusTopics).orderBy(syllabusTopics.orderIndex);
      const progress = await db.select().from(userSyllabusProgress).where(eq(userSyllabusProgress.userId, userId));
      const progressMap: Record<number, boolean> = {};
      for (const p of progress) {
        progressMap[p.topicId] = p.completed;
      }

      const papers = ["GS Paper I", "GS Paper II", "GS Paper III", "GS Paper IV"];
      const paperProgress = papers.map((paper) => {
        const paperTopics = topics.filter((t) => t.gsPaper === paper && t.parentTopic !== null);
        const completed = paperTopics.filter((t) => progressMap[t.id]).length;
        return {
          paper,
          total: paperTopics.length,
          completed,
          percentage: paperTopics.length > 0 ? Math.round((completed / paperTopics.length) * 100) : 0,
        };
      });

      const totalTopics = topics.filter((t) => t.parentTopic !== null).length;
      const totalCompleted = topics.filter((t) => t.parentTopic !== null && progressMap[t.id]).length;
      const overallProgress = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

      const attempts = await db.select().from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      const categoryStats: Record<string, { correct: number; total: number }> = {};
      for (const attempt of attempts) {
        if (!attempt.completedAt) continue;
        const questions = await db.select().from(quizQuestions)
          .where(eq(quizQuestions.attemptId, attempt.id));
        const cat = attempt.gsCategory;
        if (!categoryStats[cat]) {
          categoryStats[cat] = { correct: 0, total: 0 };
        }
        for (const q of questions) {
          categoryStats[cat].total++;
          if (q.isCorrect) categoryStats[cat].correct++;
        }
      }

      const weakAreas = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          totalQuestions: stats.total,
          correct: stats.correct,
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5);

      const completedTopicNames = new Set(
        topics.filter((t) => t.parentTopic !== null && progressMap[t.id]).map((t) => t.topic)
      );
      const recommendedTopics = topics
        .filter((t) => t.parentTopic !== null && !progressMap[t.id])
        .slice(0, 6)
        .map((t) => ({ topic: t.topic, gsPaper: t.gsPaper, parentTopic: t.parentTopic }));

      const today = new Date().toISOString().split("T")[0];
      const todayGoals = await db.select().from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, today)));
      const goalsCompleted = todayGoals.filter((g) => g.completed).length;

      res.json({
        overallProgress,
        paperProgress,
        weakAreas,
        recommendedTopics,
        todayGoals: { total: todayGoals.length, completed: goalsCompleted },
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });
}
