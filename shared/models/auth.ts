import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone").unique(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  userType: varchar("user_type"),
  targetExams: jsonb("target_exams").$type<string[]>().default([]),
  isAdmin: boolean("is_admin").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  notificationPrefs: jsonb("notification_prefs").$type<Record<string, boolean>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phone: varchar("phone").notNull(),
  otp: varchar("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(100),
  userType: z.enum(["college_student", "working_professional", "full_time_aspirant"]),
  targetExams: z.array(z.string()).min(1, "Please select at least one exam"),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
