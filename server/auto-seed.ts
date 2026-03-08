import { db, pool } from "./db";
import { sql } from "drizzle-orm";
import {
  users, subscriptions, syllabusTopics, pyqQuestions, blogPosts,
  dailyDigests, dailyTopics
} from "@shared/schema";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import pyqClassifications from "./pyq-classifications.json";

const seedDataDir = resolve(process.cwd(), "server", "seed-data");

function loadJson(filename: string): any[] {
  const path = join(seedDataDir, filename);
  if (!existsSync(path)) {
    console.log(`[Auto-Seed] ${filename} not found at ${path}`);
    return [];
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function g(obj: any, snake: string, camel: string): any {
  return obj[snake] !== undefined ? obj[snake] : obj[camel];
}

export async function autoSeedIfNeeded() {
  try {
    await runMigrations();
  } catch (err) {
    console.error("[Migrations] Error:", err);
  }

  try {
    const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [{ count: subsCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(subscriptions);
    const [{ count: syllabusCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(syllabusTopics);
    const [{ count: pyqCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(pyqQuestions);
    const [{ count: blogCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(blogPosts);
    const [{ count: digestCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyDigests);
    const [{ count: topicCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyTopics);

    const usersSeedData = loadJson("users.json");
    const subsSeedData = loadJson("subscriptions.json");
    const syllabusSeedData = loadJson("syllabus.json");
    const pyqSeedData = loadJson("pyq-questions.json");
    const blogSeedData = loadJson("blog-posts.json");
    const digestSeedData = loadJson("daily-digests.json");
    const topicSeedData = loadJson("daily-topics.json");

    const needsUsers = userCount === 0 && usersSeedData.length > 0;
    const needsSubs = subsCount === 0 && subsSeedData.length > 0;
    const needsSyllabus = syllabusCount === 0 && syllabusSeedData.length > 0;
    const needsPyq = pyqCount === 0 && pyqSeedData.length > 0;
    const needsBlog = blogCount === 0 && blogSeedData.length > 0;
    const needsDigests = digestCount === 0 && digestSeedData.length > 0;
    const needsTopics = topicCount === 0 && topicSeedData.length > 0;

    if (!needsUsers && !needsSubs && !needsSyllabus && !needsPyq && !needsBlog && !needsDigests && !needsTopics) {
      console.log(`[Auto-Seed] Database has data (${userCount} users, ${syllabusCount} syllabus, ${pyqCount} PYQ, ${blogCount} blog, ${digestCount} digests, ${topicCount} topics). Skipping seed.`);
      return;
    }

    console.log("[Auto-Seed] Empty tables detected, seeding from seed-data files...");
    const client = await pool.connect();

    try {
      if (needsUsers) {
        console.log("[Auto-Seed] Seeding users...");
        let inserted = 0;
        for (const u of usersSeedData) {
          try {
            const notifPrefs = g(u, "notification_prefs", "notificationPrefs");
            const targetExams = g(u, "target_exams", "targetExams");
            const notifStr = typeof notifPrefs === 'string' ? notifPrefs : JSON.stringify(notifPrefs || {});
            const examsStr = typeof targetExams === 'string' ? targetExams : JSON.stringify(targetExams || []);
            await client.query(`
              INSERT INTO users (id, phone, email, first_name, last_name, profile_image_url, display_name, user_type, target_exams, is_admin, onboarding_completed, notification_prefs, language, created_at, updated_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13,$14::timestamp,$15::timestamp)
              ON CONFLICT (id) DO NOTHING
            `, [u.id, u.phone, u.email,
                g(u, "first_name", "firstName"), g(u, "last_name", "lastName"),
                g(u, "profile_image_url", "profileImageUrl"), g(u, "display_name", "displayName"),
                g(u, "user_type", "userType"), examsStr,
                g(u, "is_admin", "isAdmin"), g(u, "onboarding_completed", "onboardingCompleted"),
                notifStr, u.language,
                g(u, "created_at", "createdAt"), g(u, "updated_at", "updatedAt")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] User: ${e.message}`);
          }
        }
        console.log(`[Auto-Seed] Users: ${inserted}/${usersSeedData.length}`);
      }

      if (needsSubs) {
        console.log("[Auto-Seed] Seeding subscriptions...");
        let inserted = 0;
        for (const s of subsSeedData) {
          try {
            await client.query(`
              INSERT INTO subscriptions (user_id, status, plan, amount, currency, current_period_end, created_at, updated_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
              ON CONFLICT DO NOTHING
            `, [g(s, "user_id", "userId"), s.status, s.plan, s.amount, s.currency,
                g(s, "current_period_end", "currentPeriodEnd"),
                g(s, "created_at", "createdAt"), g(s, "updated_at", "updatedAt")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] Sub: ${e.message}`);
          }
        }
        console.log(`[Auto-Seed] Subscriptions: ${inserted}/${subsSeedData.length}`);
      }

      if (needsSyllabus) {
        console.log("[Auto-Seed] Seeding syllabus topics...");
        let inserted = 0;
        for (const t of syllabusSeedData) {
          try {
            await client.query(`
              INSERT INTO syllabus_topics (id, exam_type, gs_paper, parent_topic, topic, order_index)
              VALUES ($1,$2,$3,$4,$5,$6)
              ON CONFLICT (id) DO NOTHING
            `, [t.id, g(t, "exam_type", "examType"), g(t, "gs_paper", "gsPaper"),
                g(t, "parent_topic", "parentTopic"), t.topic, g(t, "order_index", "orderIndex")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] Syllabus: ${e.message}`);
          }
        }
        await client.query(`SELECT setval('syllabus_topics_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM syllabus_topics), 1))`);
        console.log(`[Auto-Seed] Syllabus: ${inserted}/${syllabusSeedData.length}`);
      }

      if (needsPyq) {
        console.log("[Auto-Seed] Seeding PYQ questions...");
        let inserted = 0;
        for (let i = 0; i < pyqSeedData.length; i++) {
          const q = pyqSeedData[i];
          try {
            await client.query(`
              INSERT INTO pyq_questions (id, exam_type, exam_stage, year, paper_type, question_number, question_text,
                question_type, options, correct_index, marks, topic, sub_topic, difficulty, source_url, text_hash, explanation, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
              ON CONFLICT (id) DO NOTHING
            `, [q.id, g(q, "exam_type", "examType"), g(q, "exam_stage", "examStage"),
                q.year, g(q, "paper_type", "paperType"), g(q, "question_number", "questionNumber"),
                g(q, "question_text", "questionText"), g(q, "question_type", "questionType"),
                q.options, g(q, "correct_index", "correctIndex"), q.marks,
                q.topic, g(q, "sub_topic", "subTopic"), q.difficulty,
                g(q, "source_url", "sourceUrl"), g(q, "text_hash", "textHash"),
                q.explanation, g(q, "created_at", "createdAt")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] PYQ Q${q.id}: ${e.message?.slice(0, 80)}`);
          }
          if ((i + 1) % 200 === 0) console.log(`  [Auto-Seed] PYQ progress: ${i + 1}/${pyqSeedData.length}`);
        }
        await client.query(`SELECT setval('pyq_questions_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM pyq_questions), 1))`);
        console.log(`[Auto-Seed] PYQ questions: ${inserted}/${pyqSeedData.length}`);
      }

      if (needsBlog) {
        console.log("[Auto-Seed] Seeding blog posts...");
        let inserted = 0;
        for (const b of blogSeedData) {
          try {
            await client.query(`
              INSERT INTO blog_posts (id, slug, title, meta_title, meta_description, excerpt, content, html_content,
                cover_image_alt, category, tags, reading_time_minutes, published, featured, source_url,
                cluster_id, cluster_role, published_at, created_at, updated_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
              ON CONFLICT (id) DO NOTHING
            `, [b.id, b.slug, b.title,
                g(b, "meta_title", "metaTitle"), g(b, "meta_description", "metaDescription"),
                b.excerpt, b.content, g(b, "html_content", "htmlContent"),
                g(b, "cover_image_alt", "coverImageAlt"), b.category, b.tags,
                g(b, "reading_time_minutes", "readingTimeMinutes"),
                b.published ?? true, b.featured ?? false,
                g(b, "source_url", "sourceUrl"), g(b, "cluster_id", "clusterId"),
                g(b, "cluster_role", "clusterRole"), g(b, "published_at", "publishedAt"),
                g(b, "created_at", "createdAt"), g(b, "updated_at", "updatedAt")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] Blog ${b.slug}: ${e.message?.slice(0, 80)}`);
          }
        }
        await client.query(`SELECT setval('blog_posts_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM blog_posts), 1))`);
        console.log(`[Auto-Seed] Blog posts: ${inserted}/${blogSeedData.length}`);
      }

      if (needsDigests) {
        console.log("[Auto-Seed] Seeding daily digests...");
        let inserted = 0;
        for (const d of digestSeedData) {
          try {
            await client.query(`
              INSERT INTO daily_digests (id, date, source, generated_at)
              VALUES ($1,$2,$3,$4)
              ON CONFLICT (id) DO NOTHING
            `, [d.id, d.date, d.source, g(d, "generated_at", "generatedAt")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] Digest: ${e.message}`);
          }
        }
        await client.query(`SELECT setval('daily_digests_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM daily_digests), 1))`);
        console.log(`[Auto-Seed] Daily digests: ${inserted}/${digestSeedData.length}`);
      }

      if (needsTopics) {
        console.log("[Auto-Seed] Seeding daily topics...");
        let inserted = 0;
        for (const t of topicSeedData) {
          try {
            const detailLangs = g(t, "detail_content_langs", "detailContentLangs");
            await client.query(`
              INSERT INTO daily_topics (id, digest_id, title, summary, category, gs_category, relevance,
                source, page_number, revised, detail_content, detail_content_langs, translations, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
              ON CONFLICT (id) DO NOTHING
            `, [t.id, g(t, "digest_id", "digestId"), t.title, t.summary, t.category,
                g(t, "gs_category", "gsCategory"), t.relevance,
                t.source, g(t, "page_number", "pageNumber"), t.revised ?? false,
                g(t, "detail_content", "detailContent"),
                detailLangs ? JSON.stringify(detailLangs) : null,
                t.translations ? JSON.stringify(t.translations) : null,
                g(t, "created_at", "createdAt")]);
            inserted++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate")) console.log(`  [Auto-Seed] Topic: ${e.message}`);
          }
        }
        await client.query(`SELECT setval('daily_topics_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM daily_topics), 1))`);
        console.log(`[Auto-Seed] Daily topics: ${inserted}/${topicSeedData.length}`);
      }
    } finally {
      client.release();
    }

    console.log("[Auto-Seed] Complete!");
  } catch (err) {
    console.error("[Auto-Seed] Error during auto-seed:", err);
  }
}

async function runMigrations() {
  const classMap = pyqClassifications as Record<string, { t: string; s: string | null }>;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pyqQuestions)
    .where(sql`topic = 'Unclassified'`);

  if (count === 0) return;

  console.log(`[Migration] Fixing ${count} unclassified PYQ questions...`);
  const client = await pool.connect();
  try {
    let fixed = 0;
    const rows = await db.select({ id: pyqQuestions.id })
      .from(pyqQuestions)
      .where(sql`topic = 'Unclassified'`);

    for (const row of rows) {
      const fix = classMap[String(row.id)];
      if (fix) {
        await client.query(
          `UPDATE pyq_questions SET topic = $1, sub_topic = $2 WHERE id = $3`,
          [fix.t, fix.s, row.id]
        );
        fixed++;
      }
    }
    console.log(`[Migration] Fixed ${fixed}/${count} unclassified PYQ questions.`);
  } finally {
    client.release();
  }
}
