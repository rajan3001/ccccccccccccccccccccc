import { pgTable, serial, text, integer, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const evaluationSessions = pgTable("evaluation_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  examType: text("exam_type").notNull().default("UPSC"),
  paperType: text("paper_type").notNull().default("GS-I"),
  fileName: text("file_name").notNull(),
  fileObjectPath: text("file_object_path").notNull(),
  status: text("status").notNull().default("processing"),
  totalScore: real("total_score"),
  maxScore: real("max_score"),
  overallFeedback: text("overall_feedback"),
  competencyFeedback: jsonb("competency_feedback").$type<CompetencyFeedback[]>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const evaluationQuestions = pgTable("evaluation_questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => evaluationSessions.id, { onDelete: "cascade" }),
  questionNumber: text("question_number").notNull(),
  questionText: text("question_text").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  improvements: jsonb("improvements").$type<string[]>().notNull(),
  detailedFeedback: text("detailed_feedback").notNull(),
  introductionFeedback: text("introduction_feedback"),
  bodyFeedback: text("body_feedback"),
  conclusionFeedback: text("conclusion_feedback"),
});

export interface CompetencyFeedback {
  name: string;
  strengths: string[];
  improvements: string[];
}

export const createEvaluationSchema = z.object({
  examType: z.string().min(1),
  paperType: z.string().min(1),
  fileName: z.string().min(1),
  fileObjectPath: z.string().min(1),
});

export const insertEvaluationSessionSchema = createInsertSchema(evaluationSessions).omit({
  id: true,
  totalScore: true,
  maxScore: true,
  overallFeedback: true,
  competencyFeedback: true,
  createdAt: true,
});

export const insertEvaluationQuestionSchema = createInsertSchema(evaluationQuestions).omit({
  id: true,
});

export type EvaluationSession = typeof evaluationSessions.$inferSelect;
export type InsertEvaluationSession = z.infer<typeof insertEvaluationSessionSchema>;
export type EvaluationQuestion = typeof evaluationQuestions.$inferSelect;
export type InsertEvaluationQuestion = z.infer<typeof insertEvaluationQuestionSchema>;
