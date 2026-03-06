import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const PYQ_TOPICS = [
  "Polity", "History", "Geography", "Economy", "Environment",
  "Science & Technology", "International Relations", "Ethics",
  "Security", "Society", "Art & Culture", "Disaster Management",
  "Governance", "Unclassified"
] as const;

export const PYQ_SUBTOPICS: Record<string, string[]> = {
  Polity: ["Parliament", "Fundamental Rights", "DPSP", "Constitutional Amendments", "Federalism", "Judiciary", "Local Governance", "Election", "CAG & Other Bodies"],
  History: ["Ancient India", "Medieval India", "Modern India", "Freedom Struggle", "Post-Independence", "World History"],
  Geography: ["Physical Geography", "Indian Geography", "World Geography", "Climatology", "Oceanography", "Human Geography"],
  Economy: ["Macro Economics", "Indian Economy", "Banking & Finance", "Agriculture", "Industry", "Foreign Trade", "Budget & Fiscal Policy"],
  Environment: ["Ecology", "Biodiversity", "Climate Change", "Pollution", "Conservation", "Environmental Laws"],
  "Science & Technology": ["Space", "Nuclear", "Biotechnology", "IT & Computers", "Defence Technology", "Health & Medicine"],
  "International Relations": ["India & Neighbours", "International Organizations", "Bilateral Relations", "Geopolitics"],
  Ethics: ["Moral Thinkers", "Public Administration Ethics", "Case Studies", "Emotional Intelligence", "Aptitude"],
  Security: ["Internal Security", "Border Management", "Cyber Security", "Terrorism", "Naxalism"],
  Society: ["Social Issues", "Population", "Urbanization", "Poverty", "Education", "Women & Children"],
  "Art & Culture": ["Architecture", "Painting", "Music & Dance", "Literature", "Festivals", "Heritage Sites"],
  "Disaster Management": ["Floods", "Earthquakes", "Cyclones", "NDMA", "Mitigation Strategies"],
  Governance: ["E-Governance", "Transparency", "Accountability", "Citizen Charter", "RTI"],
  Unclassified: [],
};

export const PYQ_EXAM_STAGES = ["Prelims", "Mains"] as const;
export type PyqExamStage = typeof PYQ_EXAM_STAGES[number];
export type PyqTopic = typeof PYQ_TOPICS[number];

export const pyqQuestions = pgTable("pyq_questions", {
  id: serial("id").primaryKey(),
  examType: varchar("exam_type").notNull(),
  examStage: varchar("exam_stage").notNull(),
  year: integer("year").notNull(),
  paperType: varchar("paper_type").notNull(),
  questionNumber: integer("question_number").notNull(),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type").notNull(),
  options: text("options").array(),
  correctIndex: integer("correct_index"),
  marks: integer("marks").notNull().default(2),
  topic: varchar("topic").notNull().default("Unclassified"),
  subTopic: varchar("sub_topic"),
  difficulty: varchar("difficulty"),
  explanation: text("explanation"),
  sourceUrl: varchar("source_url"),
  textHash: varchar("text_hash"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("pyq_questions_unique_idx").on(table.examType, table.examStage, table.year, table.paperType, table.questionNumber),
  index("pyq_questions_topic_idx").on(table.topic),
  index("pyq_questions_exam_year_idx").on(table.examType, table.examStage, table.year),
  index("pyq_questions_text_hash_idx").on(table.textHash),
]);

export const pyqAttempts = pgTable("pyq_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull().references(() => pyqQuestions.id, { onDelete: "cascade" }),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct"),
  aiScore: integer("ai_score"),
  aiMaxScore: integer("ai_max_score"),
  aiFeedback: jsonb("ai_feedback").$type<PyqMainsFeedback>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export interface PyqMainsFeedback {
  introduction: number;
  body: number;
  conclusion: number;
  contentCoverage: number;
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
}

export const insertPyqQuestionSchema = createInsertSchema(pyqQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertPyqAttemptSchema = createInsertSchema(pyqAttempts).omit({
  id: true,
  createdAt: true,
});

export type PyqQuestion = typeof pyqQuestions.$inferSelect;
export type InsertPyqQuestion = z.infer<typeof insertPyqQuestionSchema>;
export type PyqAttempt = typeof pyqAttempts.$inferSelect;
export type InsertPyqAttempt = z.infer<typeof insertPyqAttemptSchema>;
