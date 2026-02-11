import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  sessionDate: date("session_date").notNull(),
  subject: text("subject").notNull(),
  gsPaper: text("gs_paper"),
  minutesSpent: integer("minutes_spent").notNull().default(0),
  source: text("source").notNull().default("chat"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertStudySessionSchema = createInsertSchema(studySessions).omit({
  id: true,
  createdAt: true,
});

export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
