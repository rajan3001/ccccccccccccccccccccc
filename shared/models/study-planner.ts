import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const timetableSlots = pgTable("timetable_slots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  gsPaper: text("gs_paper").notNull(),
  subject: text("subject").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const syllabusTopics = pgTable("syllabus_topics", {
  id: serial("id").primaryKey(),
  gsPaper: text("gs_paper").notNull(),
  parentTopic: text("parent_topic"),
  topic: text("topic").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const userSyllabusProgress = pgTable("user_syllabus_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  topicId: integer("topic_id").notNull().references(() => syllabusTopics.id),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

export const dailyStudyGoals = pgTable("daily_study_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  goalDate: date("goal_date").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertTimetableSlotSchema = createInsertSchema(timetableSlots).omit({
  id: true,
  createdAt: true,
});

export const insertDailyGoalSchema = createInsertSchema(dailyStudyGoals).omit({
  id: true,
  createdAt: true,
});

export type TimetableSlot = typeof timetableSlots.$inferSelect;
export type InsertTimetableSlot = z.infer<typeof insertTimetableSlotSchema>;
export type SyllabusTopic = typeof syllabusTopics.$inferSelect;
export type UserSyllabusProgress = typeof userSyllabusProgress.$inferSelect;
export type DailyStudyGoal = typeof dailyStudyGoals.$inferSelect;
export type InsertDailyGoal = z.infer<typeof insertDailyGoalSchema>;
