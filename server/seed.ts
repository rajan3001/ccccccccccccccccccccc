import { db } from "./db";
import { pool } from "./db";
import { sql } from "drizzle-orm";
import {
  users, subscriptions, syllabusTopics
} from "@shared/schema";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJson(filename: string): any[] {
  const path = join(__dirname, "seed-data", filename);
  if (!existsSync(path)) {
    console.log(`  [Seed] ${filename} not found, skipping`);
    return [];
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

async function seed() {
  console.log("[Seed] Starting database seed...");

  const force = process.argv.includes("--force");
  const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [{ count: syllabusCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(syllabusTopics);

  if (userCount > 0 && syllabusCount > 0 && !force) {
    console.log(`[Seed] Database already has data (${userCount} users, ${syllabusCount} syllabus topics). Skipping seed.`);
    console.log("[Seed] To force re-seed, run: npm run seed -- --force");
    process.exit(0);
  }
  if (force) console.log("[Seed] --force flag detected, proceeding...");

  const client = await pool.connect();
  try {
    console.log("[Seed] Seeding users...");
    const usersData = loadJson("users.json");
    let usersInserted = 0;
    for (const u of usersData) {
      try {
        const notifPrefs = typeof u.notification_prefs === 'string' ? u.notification_prefs : JSON.stringify(u.notification_prefs || {});
        const targetExams = typeof u.target_exams === 'string' ? u.target_exams : JSON.stringify(u.target_exams || []);
        await client.query(`
          INSERT INTO users (id, phone, email, first_name, last_name, profile_image_url, display_name, user_type, target_exams, is_admin, onboarding_completed, notification_prefs, language, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13,$14::timestamp,$15::timestamp)
          ON CONFLICT (id) DO NOTHING
        `, [u.id, u.phone, u.email, u.first_name, u.last_name, u.profile_image_url,
            u.display_name, u.user_type, targetExams, u.is_admin, u.onboarding_completed,
            notifPrefs, u.language, u.created_at, u.updated_at]);
        usersInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] User ${u.display_name}: ${e.message}`);
      }
    }
    console.log(`[Seed] Users: ${usersInserted}/${usersData.length}`);

    console.log("[Seed] Seeding subscriptions...");
    const subsData = loadJson("subscriptions.json");
    let subsInserted = 0;
    for (const s of subsData) {
      try {
        await client.query(`
          INSERT INTO subscriptions (user_id, status, plan, amount, currency, current_period_end, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT DO NOTHING
        `, [s.user_id, s.status, s.plan, s.amount, s.currency, s.current_period_end, s.created_at, s.updated_at]);
        subsInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] Sub: ${e.message}`);
      }
    }
    console.log(`[Seed] Subscriptions: ${subsInserted}/${subsData.length}`);

    console.log("[Seed] Seeding syllabus topics...");
    const syllabusData = loadJson("syllabus.json");
    let syllabusInserted = 0;
    for (const t of syllabusData) {
      try {
        await client.query(`
          INSERT INTO syllabus_topics (id, exam_type, gs_paper, parent_topic, topic, order_index)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO NOTHING
        `, [t.id, t.exam_type, t.gs_paper, t.parent_topic, t.topic, t.order_index]);
        syllabusInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] Syllabus ${t.id}: ${e.message}`);
      }
    }
    await client.query(`SELECT setval('syllabus_topics_id_seq', (SELECT COALESCE(MAX(id), 0) FROM syllabus_topics))`);
    console.log(`[Seed] Syllabus: ${syllabusInserted}/${syllabusData.length}`);

    console.log("[Seed] Seeding PYQ questions...");
    const pyqData = loadJson("pyq-questions.json");
    let pyqInserted = 0;
    for (let i = 0; i < pyqData.length; i++) {
      const q = pyqData[i];
      try {
        await client.query(`
          INSERT INTO pyq_questions (id, exam_type, exam_stage, year, paper_type, question_number, question_text,
            question_type, options, correct_index, marks, topic, sub_topic, difficulty, source_url, text_hash, explanation, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (id) DO NOTHING
        `, [q.id, q.exam_type, q.exam_stage, q.year, q.paper_type, q.question_number, q.question_text,
            q.question_type, q.options, q.correct_index, q.marks, q.topic, q.sub_topic, q.difficulty,
            q.source_url, q.text_hash, q.explanation, q.created_at]);
        pyqInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] PYQ Q${q.id}: ${e.message?.slice(0, 80)}`);
      }
      if ((i + 1) % 200 === 0) console.log(`  [Seed] PYQ progress: ${i + 1}/${pyqData.length}`);
    }
    await client.query(`SELECT setval('pyq_questions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM pyq_questions))`);
    console.log(`[Seed] PYQ questions: ${pyqInserted}/${pyqData.length}`);

    console.log("[Seed] Seeding blog posts...");
    const blogData = loadJson("blog-posts.json");
    let blogInserted = 0;
    for (const b of blogData) {
      try {
        await client.query(`
          INSERT INTO blog_posts (id, slug, title, meta_title, meta_description, excerpt, content, html_content,
            cover_image_alt, category, tags, reading_time_minutes, published, featured, source_url,
            cluster_id, cluster_role, published_at, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
          ON CONFLICT (id) DO NOTHING
        `, [b.id, b.slug, b.title, b.meta_title, b.meta_description, b.excerpt, b.content, b.html_content,
            b.cover_image_alt, b.category, b.tags, b.reading_time_minutes, b.published ?? true, b.featured ?? false,
            b.source_url, b.cluster_id, b.cluster_role, b.published_at, b.created_at, b.updated_at]);
        blogInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] Blog ${b.slug}: ${e.message?.slice(0, 80)}`);
      }
    }
    await client.query(`SELECT setval('blog_posts_id_seq', (SELECT COALESCE(MAX(id), 0) FROM blog_posts))`);
    console.log(`[Seed] Blog posts: ${blogInserted}/${blogData.length}`);

    console.log("[Seed] Seeding daily digests...");
    const digestData = loadJson("daily-digests.json");
    let digestInserted = 0;
    for (const d of digestData) {
      try {
        await client.query(`
          INSERT INTO daily_digests (id, date, source, generated_at)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (id) DO NOTHING
        `, [d.id, d.date, d.source, d.generated_at]);
        digestInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] Digest ${d.id}: ${e.message}`);
      }
    }
    await client.query(`SELECT setval('daily_digests_id_seq', (SELECT COALESCE(MAX(id), 0) FROM daily_digests))`);
    console.log(`[Seed] Daily digests: ${digestInserted}/${digestData.length}`);

    console.log("[Seed] Seeding daily topics...");
    const topicData = loadJson("daily-topics.json");
    let topicInserted = 0;
    for (const t of topicData) {
      try {
        await client.query(`
          INSERT INTO daily_topics (id, digest_id, title, summary, category, gs_category, relevance,
            source, page_number, revised, detail_content, detail_content_langs, translations, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          ON CONFLICT (id) DO NOTHING
        `, [t.id, t.digest_id, t.title, t.summary, t.category, t.gs_category, t.relevance,
            t.source, t.page_number, t.revised ?? false, t.detail_content,
            t.detail_content_langs ? JSON.stringify(t.detail_content_langs) : null,
            t.translations ? JSON.stringify(t.translations) : null, t.created_at]);
        topicInserted++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate")) console.log(`  [Seed] Topic ${t.id}: ${e.message}`);
      }
    }
    await client.query(`SELECT setval('daily_topics_id_seq', (SELECT COALESCE(MAX(id), 0) FROM daily_topics))`);
    console.log(`[Seed] Daily topics: ${topicInserted}/${topicData.length}`);
  } finally {
    client.release();
  }

  console.log("[Seed] ✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("[Seed] Fatal error:", e);
  process.exit(1);
});
