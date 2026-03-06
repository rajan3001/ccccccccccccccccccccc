import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  users, subscriptions, syllabusTopics
} from "@shared/schema";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJson(filename: string): any[] {
  const raw = readFileSync(join(__dirname, "seed-data", filename), "utf-8");
  return JSON.parse(raw);
}

async function seed() {
  console.log("[Seed] Starting database seed...");

  const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [{ count: syllabusCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(syllabusTopics);

  if (userCount > 0 && syllabusCount > 0) {
    console.log(`[Seed] Database already has data (${userCount} users, ${syllabusCount} syllabus topics). Skipping seed.`);
    console.log("[Seed] To force re-seed, run: npm run seed -- --force");
    if (!process.argv.includes("--force")) {
      process.exit(0);
    }
    console.log("[Seed] --force flag detected, proceeding...");
  }

  console.log("[Seed] Seeding users...");
  const usersData = loadJson("users.json");
  let usersInserted = 0;
  for (const u of usersData) {
    try {
      await db.execute(sql`
        INSERT INTO users (id, phone, email, first_name, last_name, profile_image_url, display_name, user_type, target_exams, is_admin, onboarding_completed, notification_prefs, language, created_at, updated_at)
        VALUES (
          ${u.id}, ${u.phone}, ${u.email}, ${u.first_name}, ${u.last_name}, ${u.profile_image_url},
          ${u.display_name}, ${u.user_type}, ${u.target_exams}, ${u.is_admin}, ${u.onboarding_completed},
          ${JSON.stringify(u.notification_prefs)}::jsonb, ${u.language},
          ${u.created_at}::timestamp, ${u.updated_at}::timestamp
        )
        ON CONFLICT (id) DO NOTHING
      `);
      usersInserted++;
    } catch (e: any) {
      if (!e.message?.includes("duplicate")) console.log(`  [Seed] User ${u.display_name}: ${e.message}`);
    }
  }
  console.log(`[Seed] Users: ${usersInserted}/${usersData.length} inserted`);

  console.log("[Seed] Seeding subscriptions...");
  const subsData = loadJson("subscriptions.json");
  let subsInserted = 0;
  for (const s of subsData) {
    try {
      await db.execute(sql`
        INSERT INTO subscriptions (user_id, status, plan, amount, currency, current_period_end, created_at, updated_at)
        VALUES (
          ${s.user_id}, ${s.status}, ${s.plan}, ${s.amount}, ${s.currency},
          ${s.current_period_end}::timestamp, ${s.created_at}::timestamp, ${s.updated_at}::timestamp
        )
        ON CONFLICT DO NOTHING
      `);
      subsInserted++;
    } catch (e: any) {
      if (!e.message?.includes("duplicate")) console.log(`  [Seed] Sub for ${s.user_id}: ${e.message}`);
    }
  }
  console.log(`[Seed] Subscriptions: ${subsInserted}/${subsData.length} inserted`);

  console.log("[Seed] Seeding syllabus topics (1179 topics)...");
  const syllabusData = loadJson("syllabus.json");
  let syllabusInserted = 0;

  const batchSize = 50;
  for (let i = 0; i < syllabusData.length; i += batchSize) {
    const batch = syllabusData.slice(i, i + batchSize);
    for (const t of batch) {
      try {
        await db.execute(sql`
          INSERT INTO syllabus_topics (id, exam_type, gs_paper, parent_topic, topic, order_index)
          VALUES (${t.id}, ${t.exam_type}, ${t.gs_paper}, ${t.parent_topic}, ${t.topic}, ${t.order_index})
          ON CONFLICT (id) DO NOTHING
        `);
        syllabusInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] Topic ${t.id}: ${e.message}`);
      }
    }
    if ((i + batchSize) % 200 === 0 || i + batchSize >= syllabusData.length) {
      console.log(`  [Seed] Syllabus progress: ${Math.min(i + batchSize, syllabusData.length)}/${syllabusData.length}`);
    }
  }

  await db.execute(sql`SELECT setval('syllabus_topics_id_seq', (SELECT COALESCE(MAX(id), 0) FROM syllabus_topics))`);

  console.log(`[Seed] Syllabus topics: ${syllabusInserted}/${syllabusData.length} inserted`);

  console.log("[Seed] ✅ Seed complete!");
  console.log(`  Users: ${usersInserted}`);
  console.log(`  Subscriptions: ${subsInserted}`);
  console.log(`  Syllabus Topics: ${syllabusInserted}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("[Seed] Fatal error:", e);
  process.exit(1);
});
