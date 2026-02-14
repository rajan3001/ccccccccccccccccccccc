import { Router, Request, Response } from "express";
import { GoogleGenAI, Modality } from "@google/genai";
import { db } from "./db";
import { blogPosts, type InsertBlogPost, BLOG_CATEGORIES } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(3, Math.ceil(words / 200));
}

function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<h([123])>/g, '<h$1>');
  html = html.replace(/<\/h([123])>\s*<\/p>/g, '</h$1>');
  html = html.replace(/<p>\s*<ul>/g, '<ul>');
  html = html.replace(/<\/ul>\s*<\/p>/g, '</ul>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}

const UPSC_TOPICS = [
  { category: "upsc-strategy", topics: [
    "How to Start UPSC Preparation from Scratch in 2025",
    "Best UPSC Study Plan for Working Professionals",
    "UPSC Toppers Strategy: Common Habits of Successful Candidates",
    "How to Balance Optional Subject with GS Preparation",
    "Time Management Tips for UPSC Aspirants",
    "How to Crack UPSC in First Attempt: Complete Roadmap",
    "UPSC Prelims vs Mains: Key Differences in Preparation Approach",
    "How to Stay Motivated During Long UPSC Preparation Journey",
    "Role of AI and Technology in Modern UPSC Preparation",
    "Self-Study vs Coaching for UPSC: Pros and Cons Analysis",
  ]},
  { category: "current-affairs", topics: [
    "Monthly Current Affairs Compilation for UPSC: Key Highlights",
    "Important Supreme Court Judgments for UPSC Preparation",
    "Key International Events and Their Impact on India's Foreign Policy",
    "Recent Government Schemes and Policies for UPSC Mains",
    "Environment and Ecology Current Affairs for UPSC",
    "Science and Technology Breakthroughs Relevant to UPSC",
    "Economic Survey Highlights for UPSC Economics",
    "Important Amendments and Bills Passed in Parliament",
    "Disaster Management and Climate Change: Current Issues",
    "India's G20 Presidency and Its Significance for UPSC",
  ]},
  { category: "gs-paper-1", topics: [
    "Indian Art and Architecture: Complete Guide for UPSC GS Paper 1",
    "Modern Indian History: Freedom Movement Timeline",
    "World History for UPSC: Major Revolutions and Their Impact",
    "Indian Society: Issues of Social Justice and Empowerment",
    "Geography of India: Physical, Economic and Human Geography",
    "Urbanization Challenges in India: UPSC Perspective",
    "Population and Associated Issues for UPSC GS-1",
    "Salient Features of Indian Culture and Diversity",
  ]},
  { category: "gs-paper-2", topics: [
    "Indian Constitution: Important Articles Every UPSC Aspirant Must Know",
    "Comparison of Indian and US Constitution for UPSC",
    "Governance Issues and Challenges in India",
    "International Relations: India and Its Neighbors",
    "Welfare Schemes for Vulnerable Sections of Society",
    "Role of Civil Services in Indian Democracy",
    "Parliamentary Procedures and Functions for UPSC",
    "Federal Structure and Centre-State Relations",
  ]},
  { category: "gs-paper-3", topics: [
    "Indian Economy for UPSC: GDP, Inflation and Budget Analysis",
    "Agriculture Sector Reforms and Challenges in India",
    "Infrastructure Development: Roads, Railways and Smart Cities",
    "Internal Security: Naxalism, Terrorism and Cyber Security",
    "Environmental Conservation and Biodiversity for UPSC",
    "Science and Technology in Everyday Life for UPSC",
    "Inclusive Growth and Economic Planning",
    "Energy Security and Renewable Energy in India",
  ]},
  { category: "gs-paper-4", topics: [
    "Ethics in Public Administration: Key Concepts for UPSC",
    "Case Studies on Ethical Dilemmas in Civil Services",
    "Emotional Intelligence and Its Application in Governance",
    "Attitude and Foundational Values for Civil Services",
    "Corporate Governance and Ethical Issues",
    "Thinkers and Philosophers Important for GS Paper 4",
    "Probity in Governance: Transparency and Accountability",
  ]},
  { category: "answer-writing", topics: [
    "How to Write Perfect Answers in UPSC Mains Examination",
    "UPSC Answer Writing Practice: Structure and Techniques",
    "Common Mistakes in UPSC Mains Answer Writing and How to Avoid Them",
    "How to Use Diagrams and Flowcharts in UPSC Answers",
    "Essay Writing Tips for UPSC: Scoring 150+ Marks",
    "How to Present Multiple Perspectives in UPSC Answers",
  ]},
  { category: "state-psc", topics: [
    "State PSC Preparation Strategy: How Different from UPSC",
    "Top 15 State PSC Exams in India: Complete Guide",
    "BPSC vs UPSC: Syllabus Comparison and Strategy",
    "MPSC Preparation Guide: Syllabus, Pattern and Tips",
    "UPPSC Strategy: How to Crack UP PCS Exam",
    "RPSC RAS Exam Guide: Complete Preparation Strategy",
    "WBPSC Preparation: West Bengal Civil Services Exam Guide",
    "KPSC Preparation: Karnataka State Civil Services Strategy",
  ]},
  { category: "booklist", topics: [
    "Best Books for UPSC Prelims 2025: Subject-wise Recommendations",
    "NCERT Books Strategy for UPSC: Which Ones to Read",
    "Best Optional Subject Books for UPSC Mains",
    "Current Affairs Sources for UPSC: Newspapers, Magazines and Online",
    "Best Reference Books for UPSC GS Papers 1 to 4",
  ]},
  { category: "motivation", topics: [
    "UPSC Success Stories: From Failure to IAS Officer",
    "How to Deal with UPSC Exam Stress and Anxiety",
    "Life After UPSC: What Happens When You Become an IAS Officer",
    "UPSC Aspirants from Rural India: Inspiring Journeys",
    "How to Bounce Back After Failed UPSC Attempts",
  ]},
];

async function selectTopicsForGeneration(count: number = 5): Promise<Array<{ topic: string; category: string }>> {
  const existing = await db
    .select({ title: blogPosts.title })
    .from(blogPosts);
  const existingTitles = new Set(existing.map(e => e.title.toLowerCase()));

  const allTopics: Array<{ topic: string; category: string }> = [];
  for (const cat of UPSC_TOPICS) {
    for (const topic of cat.topics) {
      if (!existingTitles.has(topic.toLowerCase())) {
        allTopics.push({ topic, category: cat.category });
      }
    }
  }

  for (let i = allTopics.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTopics[i], allTopics[j]] = [allTopics[j], allTopics[i]];
  }

  if (allTopics.length < count) {
    const extraTopics = await generateFreshTopics(count - allTopics.length, existingTitles);
    allTopics.push(...extraTopics);
  }

  return allTopics.slice(0, count);
}

async function generateFreshTopics(count: number, existingTitles: Set<string>): Promise<Array<{ topic: string; category: string }>> {
  const categories = BLOG_CATEGORIES.filter(c => c !== "general");
  const randomCats = categories.sort(() => Math.random() - 0.5).slice(0, count);

  const prompt = `Generate ${count} unique blog post titles for a UPSC/Civil Services exam preparation platform. 
Each title should be SEO-optimized with keywords like UPSC, IAS, Civil Services, etc.
Categories to cover: ${randomCats.join(", ")}

Return a JSON array of objects with "topic" and "category" fields.
Ensure titles are different from these existing ones: ${Array.from(existingTitles).slice(0, 20).join(", ")}

Return ONLY the JSON array, no other text.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.7 },
    });
    const text = result.text?.trim() || "[]";
    const jsonStr = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Error generating fresh topics:", e);
    return [];
  }
}

async function generateBlogContent(topic: string, category: string): Promise<InsertBlogPost | null> {
  const prompt = `You are an expert UPSC/Civil Services exam preparation content writer. Write a comprehensive, SEO-optimized blog post.

TOPIC: "${topic}"
CATEGORY: ${category}

REQUIREMENTS:
1. Write 1500-2500 words of high-quality, detailed content
2. Use proper Markdown formatting with headers (##, ###), bullet points, and bold text
3. Include practical tips, strategies, and actionable advice
4. Natural keyword density for "UPSC", "IAS", "Civil Services", related terms
5. Write in an engaging, authoritative, yet approachable tone
6. Include a compelling introduction and conclusion
7. Add internal cross-references to topics like current affairs, answer writing, study planning

Return a JSON object with these fields:
{
  "title": "SEO-optimized title (60-70 chars ideally)",
  "metaTitle": "Meta title for search engines (50-60 chars, include UPSC/IAS)",
  "metaDescription": "Compelling meta description (150-160 chars, include primary keywords)",
  "excerpt": "2-3 sentence summary for blog listing cards (under 200 chars)",
  "content": "Full markdown content of the blog post",
  "tags": ["array", "of", "relevant", "tags"],
  "coverImageAlt": "Descriptive alt text for the cover image"
}

Return ONLY the JSON object, no other text or markdown fencing.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 1024 }, temperature: 0.5 },
    });

    const text = result.text?.trim() || "";
    const jsonStr = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    const slug = slugify(parsed.title) + "-" + Date.now().toString(36);
    const htmlContent = markdownToHtml(parsed.content);
    const readingTime = estimateReadingTime(parsed.content);

    return {
      slug,
      title: parsed.title,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      excerpt: parsed.excerpt,
      content: parsed.content,
      htmlContent,
      category,
      tags: parsed.tags || [],
      coverImageAlt: parsed.coverImageAlt || parsed.title,
      readingTimeMinutes: readingTime,
      published: true,
      featured: false,
      publishedAt: new Date(),
    };
  } catch (e) {
    console.error(`Error generating blog content for "${topic}":`, e);
    return null;
  }
}

async function generateAndUploadCoverImage(title: string, slug: string): Promise<string | null> {
  try {
    const prompt = `Create a professional, modern blog cover image for an educational article titled "${title}". 
The image should be clean, professional, with warm gold/amber tones. 
Include visual elements related to education, studying, books, or Indian civil services. 
Style: flat illustration, modern design, warm colors. No text in image.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(
      (part: any) => part.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      console.log("No image data in response for:", title);
      return null;
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const ext = mimeType.includes("jpeg") ? "jpg" : "png";

    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      console.log("No bucket ID for image upload");
      return null;
    }

    const objectPath = `public/blog/${slug}.${ext}`;
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectPath);

    await file.save(imageBuffer, {
      contentType: mimeType,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    return `/api/blog/images/${slug}.${ext}`;
  } catch (e) {
    console.error(`Error generating cover image for "${title}":`, e);
    return null;
  }
}

let isGenerating = false;

export async function generateBlogPosts(count: number = 5): Promise<number> {
  if (isGenerating) {
    console.log("Blog generation already in progress");
    return 0;
  }

  isGenerating = true;
  let generated = 0;

  try {
    const topics = await selectTopicsForGeneration(count);
    console.log(`Generating ${topics.length} blog posts...`);

    for (const { topic, category } of topics) {
      try {
        console.log(`Generating: ${topic}`);
        const post = await generateBlogContent(topic, category);
        if (!post) continue;

        const imageUrl = await generateAndUploadCoverImage(topic, post.slug);
        if (imageUrl) {
          post.coverImageUrl = imageUrl;
        }

        await db.insert(blogPosts).values(post);
        generated++;
        console.log(`Published: ${post.title}`);

        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Failed to generate post for "${topic}":`, e);
      }
    }
  } finally {
    isGenerating = false;
  }

  return generated;
}

const CATEGORY_DISPLAY: Record<string, { label: string; description: string }> = {
  "all": { label: "All Articles", description: "Browse all UPSC preparation articles" },
  "upsc-strategy": { label: "UPSC Strategy", description: "Exam strategy, preparation roadmaps & topper insights" },
  "current-affairs": { label: "Current Affairs", description: "Daily current affairs analysis for Prelims & Mains" },
  "gs-paper-1": { label: "History & Geography", description: "Indian History, World History, Geography & Culture" },
  "gs-paper-2": { label: "Polity & Governance", description: "Indian Polity, Constitution, Governance & IR" },
  "gs-paper-3": { label: "Economy & Environment", description: "Indian Economy, Science & Technology, Environment" },
  "gs-paper-4": { label: "Ethics & Integrity", description: "Ethics, Integrity, Aptitude & Case Studies" },
  "essay": { label: "Essay Writing", description: "Essay writing techniques, frameworks & practice" },
  "answer-writing": { label: "Answer Writing", description: "Mains answer writing skills & structuring techniques" },
  "csat": { label: "CSAT", description: "Aptitude, reasoning & comprehension for Paper II" },
  "state-psc": { label: "State PSC", description: "State-level Civil Services exam preparation" },
  "booklist": { label: "Book Recommendations", description: "Best books & resources for each subject" },
  "motivation": { label: "Motivation", description: "Inspirational stories, tips & mental wellness" },
  "general": { label: "General", description: "Miscellaneous preparation resources" },
};

function renderBlogListHtml(posts: any[], page: number, totalPages: number, activeCategory: string, categoryCounts: Record<string, number>): string {
  const catInfo = CATEGORY_DISPLAY[activeCategory] || CATEGORY_DISPLAY["all"];

  const postCards = posts.length > 0 ? posts.map(post => {
    const postCatInfo = CATEGORY_DISPLAY[post.category] || CATEGORY_DISPLAY["general"];
    return `
    <article class="blog-card" data-category="${post.category}" itemscope itemtype="https://schema.org/Article">
      <a href="/blog/${post.slug}" class="blog-card-link">
        <div class="blog-card-image">
          ${post.coverImageUrl ? `<img src="${post.coverImageUrl}" alt="${post.coverImageAlt || post.title}" loading="lazy" width="800" height="450" />` : `<div class="blog-card-placeholder"><span class="placeholder-label">${postCatInfo.label}</span></div>`}
          <span class="blog-card-badge">${postCatInfo.label}</span>
        </div>
        <div class="blog-card-body">
          <h2 itemprop="headline">${post.title}</h2>
          <p itemprop="description">${post.excerpt}</p>
          <div class="blog-card-footer">
            <time datetime="${new Date(post.publishedAt).toISOString()}" itemprop="datePublished">${new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
            <span class="blog-read-time">${post.readingTimeMinutes} min read</span>
          </div>
        </div>
      </a>
    </article>`;
  }).join('') : '';

  const categoryTabs = Object.entries(CATEGORY_DISPLAY).map(([key, val]) => {
    const count = key === "all" ? Object.values(categoryCounts).reduce((a, b) => a + b, 0) : (categoryCounts[key] || 0);
    if (key !== "all" && count === 0) return '';
    const isActive = key === activeCategory;
    return `<button type="button" class="cat-tab${isActive ? ' cat-active' : ''}" data-testid="blog-category-${key}" data-cat="${key}">
      <span class="cat-label">${val.label}</span>
      <span class="cat-count">${count}</span>
    </button>`;
  }).filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeCategory !== 'all' ? `${catInfo.label} - ` : ''}UPSC Preparation Blog | Learnpro AI</title>
  <meta name="description" content="${activeCategory !== 'all' ? catInfo.description + ' - ' : ''}Expert UPSC preparation tips, IAS study strategies, current affairs analysis, and exam guidance. Free resources for Civil Services aspirants by Learnpro AI.">
  <meta name="keywords" content="UPSC blog, IAS preparation tips, Civil Services strategy, UPSC study plan, current affairs UPSC, UPSC topper strategy${activeCategory !== 'all' ? ', ' + catInfo.label : ''}">
  <link rel="canonical" href="https://learnproai.in/blog">
  <meta property="og:type" content="website">
  <meta property="og:title" content="UPSC Blog | Learnpro AI">
  <meta property="og:description" content="Expert UPSC preparation tips, IAS study strategies, and free resources for Civil Services aspirants.">
  <meta property="og:url" content="https://learnproai.in/blog">
  <meta property="og:site_name" content="Learnpro AI">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="icon" href="/favicon_final.webp" type="image/webp">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Learnpro AI UPSC Blog",
    "description": "Expert UPSC and Civil Services preparation resources",
    "url": "https://learnproai.in/blog",
    "publisher": {
      "@type": "Organization",
      "name": "Learnpro AI",
      "url": "https://learnproai.in"
    }
  }
  </script>
  <style>
    :root{--gold:hsl(35,90%,45%);--gold-rgb:196,130,20;--gold-light:hsl(35,85%,50%);--gold-dark:hsl(35,90%,32%);--gold-dim:hsla(35,90%,45%,0.08);--bg:hsl(40,33%,98%);--bg-card:#ffffff;--bg-card-hover:hsl(40,20%,96%);--border:hsl(35,15%,90%);--border-hover:hsl(35,15%,82%);--text:hsl(30,15%,15%);--text-secondary:hsl(30,8%,45%);--text-muted:hsl(30,8%,60%);--radius:0.75rem;--header-h:56px;--font-display:'Plus Jakarta Sans',sans-serif}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}

    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes glow{0%,100%{opacity:0.5}50%{opacity:1}}
    @keyframes gridPulse{0%,100%{opacity:0.03}50%{opacity:0.06}}

    .top-bar{background:hsla(40,33%,98%,0.9);backdrop-filter:blur(20px) saturate(1.2);-webkit-backdrop-filter:blur(20px) saturate(1.2);border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;height:var(--header-h)}
    .top-bar-logo{display:flex;align-items:center;gap:0.6rem;text-decoration:none;font-weight:700;font-size:1.15rem;color:var(--text)}
    .top-bar-logo img{width:32px;height:32px;object-fit:contain}
    .top-bar-logo .ai-text{color:var(--gold-dark)}
    .top-bar-nav{display:flex;gap:0.5rem;align-items:center}
    .top-bar-nav a{color:var(--text-secondary);text-decoration:none;font-size:0.85rem;font-weight:500;transition:all 0.25s;padding:0.45rem 0.9rem;border-radius:0.5rem;border:1px solid transparent}
    .top-bar-nav a:hover{color:var(--text);background:hsl(35,15%,93%);border-color:var(--border)}
    .top-bar-nav a.nav-active{color:var(--gold-dark);background:var(--gold-dim);border-color:hsla(35,90%,45%,0.2)}

    .hero{position:relative;padding:3.5rem 1.5rem 2.5rem;text-align:center;overflow:hidden;background:linear-gradient(180deg,hsla(35,50%,95%,0.6),transparent)}
    .hero-bg{position:absolute;inset:0;pointer-events:none}
    .hero-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 50% 0%,hsla(35,90%,45%,0.06),transparent 65%)}
    .hero-bg::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:1px;height:120px;background:linear-gradient(to bottom,hsla(35,90%,45%,0.3),transparent)}
    .hero-grid{position:absolute;inset:0;background-image:linear-gradient(hsla(35,90%,45%,0.04) 1px,transparent 1px),linear-gradient(90deg,hsla(35,90%,45%,0.04) 1px,transparent 1px);background-size:48px 48px;animation:gridPulse 4s ease-in-out infinite}
    .hero-orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;animation:float 8s ease-in-out infinite}
    .hero-orb-1{width:300px;height:300px;background:hsla(35,90%,70%,0.12);top:-80px;right:10%;animation-delay:-2s}
    .hero-orb-2{width:200px;height:200px;background:hsla(35,60%,65%,0.08);bottom:-40px;left:5%;animation-delay:-4s}
    .hero-badge{display:inline-flex;align-items:center;gap:0.4rem;background:var(--gold-dim);border:1px solid hsla(35,90%,45%,0.18);color:var(--gold-dark);font-size:0.72rem;font-weight:600;padding:0.35rem 0.9rem;border-radius:9999px;margin-bottom:1.25rem;letter-spacing:0.06em;text-transform:uppercase;position:relative;animation:fadeUp 0.5s ease-out both}
    .hero-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold);animation:glow 2s ease-in-out infinite}
    .hero h1{font-family:var(--font-display);font-size:2.8rem;font-weight:800;color:var(--text);line-height:1.15;margin-bottom:0.75rem;position:relative;animation:fadeUp 0.5s 0.1s ease-out both;letter-spacing:-0.02em}
    .hero h1 span{background:linear-gradient(135deg,var(--gold-dark),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero p{color:var(--text-secondary);font-size:1.05rem;max-width:560px;margin:0 auto;position:relative;animation:fadeUp 0.5s 0.2s ease-out both}

    .cat-strip{padding:0.65rem 1.5rem;border-bottom:1px solid var(--border);position:sticky;top:var(--header-h);z-index:40;background:hsla(40,33%,98%,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
    .cat-strip::-webkit-scrollbar{display:none}
    .cat-strip-inner{display:flex;gap:0.4rem;max-width:1200px;margin:0 auto;min-width:max-content}
    .cat-tab{display:inline-flex;align-items:center;gap:0.4rem;padding:0.45rem 0.9rem;border-radius:9999px;font-size:0.8rem;font-weight:500;color:var(--text-secondary);background:none;border:1px solid transparent;transition:all 0.25s;white-space:nowrap;flex-shrink:0;cursor:pointer;font-family:inherit}
    .cat-tab:hover{color:var(--text);background:hsl(35,15%,93%);border-color:var(--border)}
    .cat-active{background:var(--gold-dim)!important;color:var(--gold-dark)!important;border-color:hsla(35,90%,45%,0.2)!important;font-weight:600}
    .cat-count{background:hsla(30,10%,50%,0.08);padding:0.1rem 0.4rem;border-radius:9999px;font-size:0.68rem;font-weight:600;color:var(--text-muted)}
    .cat-active .cat-count{background:hsla(35,90%,45%,0.12);color:var(--gold-dark)}

    .main{max-width:1200px;margin:0 auto;padding:2rem 1.5rem 3rem}
    .section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem;animation:fadeUp 0.5s 0.3s ease-out both}
    .section-title h2{font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--text);letter-spacing:-0.01em;transition:opacity 0.25s,transform 0.25s}
    .section-title .post-count{font-size:0.85rem;color:var(--text-muted)}

    .blog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
    .blog-card{background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;transition:opacity 0.35s cubic-bezier(0.4,0,0.2,1),transform 0.35s cubic-bezier(0.4,0,0.2,1),border-color 0.3s,box-shadow 0.3s;animation:fadeUp 0.5s ease-out both;position:relative}
    .blog-card:hover{border-color:var(--border-hover);transform:translateY(-4px) scale(1)!important;box-shadow:0 12px 40px hsla(30,15%,30%,0.08),0 0 0 1px hsla(35,90%,45%,0.06)}
    .blog-card:nth-child(1){animation-delay:0.1s}.blog-card:nth-child(2){animation-delay:0.15s}.blog-card:nth-child(3){animation-delay:0.2s}
    .blog-card:nth-child(4){animation-delay:0.25s}.blog-card:nth-child(5){animation-delay:0.3s}.blog-card:nth-child(6){animation-delay:0.35s}
    .blog-card-link{display:flex;flex-direction:column;text-decoration:none;color:inherit;height:100%;position:relative;z-index:1}
    .blog-card-image{position:relative;aspect-ratio:16/9;overflow:hidden;background:hsl(35,15%,93%)}
    .blog-card-image img{width:100%;height:100%;object-fit:cover;transition:transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)}
    .blog-card:hover .blog-card-image img{transform:scale(1.04)}
    .blog-card-placeholder{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,hsl(35,15%,93%),hsl(35,12%,90%))}
    .placeholder-label{font-size:0.82rem;font-weight:600;color:var(--text-muted);letter-spacing:0.04em;opacity:0.5}
    .blog-card-badge{position:absolute;top:0.75rem;left:0.75rem;background:hsla(40,33%,98%,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:var(--gold-dark);font-size:0.68rem;font-weight:600;padding:0.25rem 0.65rem;border-radius:6px;letter-spacing:0.03em;border:1px solid hsla(35,90%,45%,0.15)}
    .blog-card-body{padding:1.25rem 1.25rem 1rem;flex:1;display:flex;flex-direction:column}
    .blog-card-body h2{font-family:var(--font-display);font-size:1.05rem;font-weight:700;line-height:1.4;margin-bottom:0.6rem;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;letter-spacing:-0.01em}
    .blog-card-body p{font-size:0.84rem;color:var(--text-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1}
    .blog-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:0.85rem;padding-top:0.75rem;border-top:1px solid var(--border);font-size:0.76rem;color:var(--text-muted);gap:0.5rem}
    .blog-read-time{display:flex;align-items:center;gap:0.3rem}

    .blog-empty{text-align:center;padding:4rem 1rem;grid-column:1/-1;animation:fadeUp 0.5s ease-out both}
    .blog-empty p{color:var(--text-secondary);font-size:1rem;margin-bottom:1rem}
    .blog-back-link{display:inline-block;color:var(--gold-dark);text-decoration:none;font-weight:500;border:1px solid hsla(35,90%,45%,0.25);padding:0.5rem 1.25rem;border-radius:0.5rem;transition:all 0.25s}
    .blog-back-link:hover{background:var(--gold-dim)}

    .pagination{display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:2.5rem;flex-wrap:wrap;animation:fadeUp 0.5s 0.4s ease-out both}
    .pagination a{padding:0.45rem 0.85rem;color:var(--text-secondary);text-decoration:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;transition:all 0.25s;border:1px solid var(--border)}
    .pagination a.active{background:var(--gold);color:#fff;font-weight:700;border-color:var(--gold)}
    .pagination a:hover:not(.active){background:var(--bg-card);border-color:var(--border-hover)}
    .pg-arrow{font-weight:500!important}
    .pg-numbers{display:flex;gap:0.35rem}

    .site-footer{border-top:1px solid var(--border);padding:2.5rem 1.5rem;margin-top:1rem;position:relative}
    .site-footer::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
    .footer-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
    .footer-brand{display:flex;align-items:center;gap:0.5rem;color:var(--text);font-weight:700;font-size:0.95rem;text-decoration:none}
    .footer-brand img{width:24px;height:24px;object-fit:contain}
    .footer-brand .ai-text{color:var(--gold-dark)}
    .footer-copy{font-size:0.82rem;color:var(--text-muted)}
    .footer-links{display:flex;gap:1.5rem}
    .footer-links a{color:var(--text-secondary);text-decoration:none;font-size:0.82rem;transition:color 0.25s}
    .footer-links a:hover{color:var(--gold-dark)}

    @media(max-width:1024px){.blog-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:640px){
      .hero h1{font-size:1.8rem}
      .hero p{font-size:0.92rem}
      .hero{padding:2.5rem 1rem 2rem}
      .blog-grid{grid-template-columns:1fr;gap:1rem}
      .top-bar{padding:0 1rem}
      .main{padding:1.25rem 1rem 2rem}
      .footer-inner{flex-direction:column;text-align:center}
      .hero-orb{display:none}
    }
  </style>
</head>
<body>
  <header class="top-bar">
    <a href="/" class="top-bar-logo">
      <img src="/favicon_final.webp" alt="Learnpro AI" />
      Learnpro <span class="ai-text">AI</span>
    </a>
    <nav class="top-bar-nav">
      <a href="/">Home</a>
      <a href="/blog" class="nav-active">Blog</a>
    </nav>
  </header>

  <section class="hero">
    <div class="hero-bg">
      <div class="hero-grid"></div>
      <div class="hero-orb hero-orb-1"></div>
      <div class="hero-orb hero-orb-2"></div>
    </div>
    <div class="hero-badge">UPSC &amp; State PSC Preparation</div>
    <h1>Expert Insights for <span>Civil Services</span></h1>
    <p>${activeCategory !== 'all' ? catInfo.description : 'In-depth articles on strategy, current affairs, subject guides, and answer writing to accelerate your preparation.'}</p>
  </section>

  <div class="cat-strip"><div class="cat-strip-inner" id="catTabs">${categoryTabs}</div></div>

  <main class="main">
    <div class="section-title">
      <h2 id="sectionLabel">${catInfo.label}</h2>
      <span class="post-count" id="postCount">${posts.length} article${posts.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="blog-grid" id="blogGrid">
      ${postCards}
    </div>
    <div class="blog-empty" id="blogEmpty" style="display:none">
      <p>No articles found in this category yet. Check back soon!</p>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <a href="/" class="footer-brand">
        <img src="/favicon_final.webp" alt="Learnpro AI" />
        Learnpro <span class="ai-text">AI</span>
      </a>
      <span class="footer-copy">&copy; ${new Date().getFullYear()} Learnpro AI. All rights reserved.</span>
      <nav class="footer-links">
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
      </nav>
    </div>
  </footer>
  <script>
  (function(){
    var catLabels=${JSON.stringify(Object.fromEntries(Object.entries(CATEGORY_DISPLAY).map(([k,v])=>[k,v.label])))};
    var catDescs=${JSON.stringify(Object.fromEntries(Object.entries(CATEGORY_DISPLAY).map(([k,v])=>[k,v.description])))};
    var tabs=document.getElementById('catTabs');
    var grid=document.getElementById('blogGrid');
    var label=document.getElementById('sectionLabel');
    var count=document.getElementById('postCount');
    var empty=document.getElementById('blogEmpty');
    var heroP=document.querySelector('.hero p');
    var current='all';
    var params=new URLSearchParams(window.location.search);
    var initCat=params.get('category');

    function filterCards(cat){
      if(cat===current)return;
      current=cat;
      var cards=grid.querySelectorAll('.blog-card');
      var visible=0;

      cards.forEach(function(c){c.style.opacity='0';c.style.transform='translateY(12px) scale(0.97)'});

      setTimeout(function(){
        var delay=0;
        cards.forEach(function(c){
          var show=cat==='all'||c.getAttribute('data-category')===cat;
          if(show){
            c.style.display='';
            visible++;
            var d=delay;
            setTimeout(function(){
              c.style.opacity='1';
              c.style.transform='translateY(0) scale(1)';
            },50+d*60);
            delay++;
          } else {
            c.style.display='none';
          }
        });

        label.style.opacity='0';label.style.transform='translateY(-8px)';
        setTimeout(function(){
          label.textContent=catLabels[cat]||'All Articles';
          count.textContent=visible+' article'+(visible!==1?'s':'');
          if(heroP)heroP.textContent=cat!=='all'?(catDescs[cat]||''):'In-depth articles on strategy, current affairs, subject guides, and answer writing to accelerate your preparation.';
          label.style.opacity='1';label.style.transform='translateY(0)';
        },150);

        empty.style.display=visible===0?'':'none';
      },200);

      tabs.querySelectorAll('.cat-tab').forEach(function(t){
        t.classList.toggle('cat-active',t.getAttribute('data-cat')===cat);
      });
    }

    tabs.addEventListener('click',function(e){
      var btn=e.target.closest('.cat-tab');
      if(!btn)return;
      e.preventDefault();
      filterCards(btn.getAttribute('data-cat'));
    });

    if(initCat && catLabels[initCat]){
      filterCards(initCat);
    }
  })();
  </script>
</body>
</html>`;
}

function renderBlogPostHtml(post: any, relatedPosts: any[] = [], prevPost: any = null, nextPost: any = null): string {
  const publishedDate = new Date(post.publishedAt).toISOString();
  const readableDate = new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const catInfo = CATEGORY_DISPLAY[post.category] || CATEGORY_DISPLAY["general"];
  const wordCount = post.content ? post.content.split(/\s+/).length : 0;
  const escapedTitle = (post.title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escapedDesc = (post.metaDescription || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const relatedHtml = relatedPosts.map(rp => {
    const rpDate = new Date(rp.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    const rpCat = CATEGORY_DISPLAY[rp.category] || CATEGORY_DISPLAY["general"];
    return `<a href="/blog/${rp.slug}" class="sb-related-item" data-testid="related-post-${rp.slug}">
      <div class="sb-related-meta"><span class="sb-related-cat">${rpCat.label}</span><span>${rpDate}</span></div>
      <h4>${rp.title}</h4>
      <span class="sb-related-read">${rp.readingTimeMinutes} min read</span>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.metaTitle}</title>
  <meta name="description" content="${escapedDesc}">
  <meta name="keywords" content="${(post.tags || []).join(', ')}">
  <link rel="canonical" href="https://learnproai.in/blog/${post.slug}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapedTitle}">
  <meta property="og:description" content="${escapedDesc}">
  <meta property="og:url" content="https://learnproai.in/blog/${post.slug}">
  <meta property="og:site_name" content="Learnpro AI">
  ${post.coverImageUrl ? `<meta property="og:image" content="https://learnproai.in${post.coverImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapedTitle}">
  <meta name="twitter:description" content="${escapedDesc}">
  ${post.coverImageUrl ? `<meta name="twitter:image" content="https://learnproai.in${post.coverImageUrl}">` : ''}
  <meta property="article:published_time" content="${publishedDate}">
  <meta property="article:modified_time" content="${new Date(post.updatedAt).toISOString()}">
  <meta property="article:author" content="https://learnproai.in">
  <meta property="article:section" content="${catInfo.label}">
  ${(post.tags || []).map((t: string) => `<meta property="article:tag" content="${t}">`).join('\n  ')}
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="Learnpro AI">
  <link rel="icon" href="/favicon_final.webp" type="image/webp">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapedTitle}",
    "description": "${escapedDesc}",
    "datePublished": "${publishedDate}",
    "dateModified": "${new Date(post.updatedAt).toISOString()}",
    ${post.coverImageUrl ? `"image": {"@type":"ImageObject","url":"https://learnproai.in${post.coverImageUrl}","width":1200,"height":630},` : ''}
    "author": {"@type": "Organization","name": "Learnpro AI","url": "https://learnproai.in"},
    "publisher": {"@type": "Organization","name": "Learnpro AI","url": "https://learnproai.in","logo":{"@type":"ImageObject","url":"https://learnproai.in/favicon_final.webp","width":64,"height":64}},
    "mainEntityOfPage": {"@type": "WebPage","@id": "https://learnproai.in/blog/${post.slug}"},
    "articleSection": "${catInfo.label}",
    "wordCount": ${wordCount},
    "inLanguage": "en-IN",
    "keywords": "${(post.tags || []).join(', ')}"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Home","item":"https://learnproai.in/"},
      {"@type":"ListItem","position":2,"name":"Blog","item":"https://learnproai.in/blog"},
      {"@type":"ListItem","position":3,"name":"${catInfo.label}","item":"https://learnproai.in/blog?category=${post.category}"},
      {"@type":"ListItem","position":4,"name":"${escapedTitle}"}
    ]
  }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root{--blue:#2563eb;--blue-dark:#1d4ed8;--blue-light:#3b82f6;--blue-bg:rgba(37,99,235,0.06);--blue-border:rgba(37,99,235,0.15);--bg:hsl(40,33%,98%);--bg-card:#ffffff;--border:#e5e7eb;--border-hover:#d1d5db;--text:#1a1a2e;--text-secondary:#4b5563;--text-muted:#9ca3af;--radius:0.5rem;--header-h:56px;--sidebar-w:320px;--content-max:740px;--font-display:'Plus Jakarta Sans',sans-serif;--font-body:'Inter',system-ui,sans-serif;--font-serif:'Merriweather','Georgia',serif}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
    ::selection{background:rgba(37,99,235,0.15);color:var(--text)}

    .top-bar{background:#fff;border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;height:var(--header-h)}
    .top-bar-logo{display:flex;align-items:center;gap:0.6rem;text-decoration:none;font-weight:700;font-size:1.1rem;color:var(--text)}
    .top-bar-logo img{width:32px;height:32px;object-fit:contain}
    .top-bar-logo .ai-text{color:var(--blue)}
    .top-bar-nav{display:flex;gap:0.25rem;align-items:center}
    .top-bar-nav a{color:var(--text-secondary);text-decoration:none;font-size:0.85rem;font-weight:500;padding:0.4rem 0.85rem;border-radius:var(--radius);transition:all 0.2s}
    .top-bar-nav a:hover{color:var(--blue);background:var(--blue-bg)}
    .read-bar{position:fixed;top:var(--header-h);left:0;height:3px;background:linear-gradient(90deg,var(--blue),var(--blue-light),#8b5cf6);z-index:99;transition:width 0.1s linear;width:0;border-radius:0 2px 2px 0}

    .page-wrapper{max-width:1180px;margin:0 auto;padding:0 1.5rem;display:flex;gap:2rem;align-items:flex-start}
    .main-col{flex:1;min-width:0;max-width:var(--content-max);padding-bottom:3rem}
    .sidebar-col{width:var(--sidebar-w);flex-shrink:0;position:sticky;top:calc(var(--header-h) + 1.5rem);max-height:calc(100vh - var(--header-h) - 2rem);overflow-y:auto;padding:1.5rem 0 2rem;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    .sidebar-col::-webkit-scrollbar{width:4px}
    .sidebar-col::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}

    .breadcrumb{display:flex;align-items:center;gap:0.35rem;font-size:0.8rem;color:var(--text-muted);padding:1.25rem 0 0;flex-wrap:wrap}
    .breadcrumb a{color:var(--text-secondary);text-decoration:none;transition:color 0.2s}
    .breadcrumb a:hover{color:var(--blue)}
    .breadcrumb svg{width:12px;height:12px;opacity:0.4}

    .article-header{padding:1.25rem 0 1.5rem;border-bottom:1px solid var(--border)}
    .article-header .cat-row{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.85rem;flex-wrap:wrap}
    .cat-badge{display:inline-flex;align-items:center;gap:0.3rem;font-size:0.72rem;font-weight:600;padding:0.25rem 0.7rem;border-radius:var(--radius);text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;color:#fff;background:var(--blue);transition:background 0.2s}
    .cat-badge:hover{background:var(--blue-dark)}
    .gs-tag{display:inline-flex;align-items:center;gap:0.25rem;font-size:0.7rem;font-weight:600;padding:0.2rem 0.6rem;border-radius:var(--radius);border:1px solid var(--blue-border);color:var(--blue);background:var(--blue-bg);text-decoration:none;transition:all 0.2s}
    .gs-tag:hover{background:rgba(37,99,235,0.12)}
    .article-header h1{font-family:var(--font-display);font-size:2rem;color:var(--text);line-height:1.25;font-weight:800;letter-spacing:-0.02em;margin-bottom:1rem}
    .meta-row{display:flex;align-items:center;gap:0.75rem;color:var(--text-muted);font-size:0.82rem;flex-wrap:wrap}
    .meta-row svg{width:14px;height:14px;opacity:0.55}
    .meta-item{display:flex;align-items:center;gap:0.3rem}
    .meta-sep{width:3px;height:3px;border-radius:50%;background:var(--text-muted);opacity:0.45}

    .cover-img{margin:1.5rem 0;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)}
    .cover-img img{width:100%;display:block;max-height:400px;object-fit:cover}

    .article-body{padding:1.5rem 0;font-family:var(--font-serif);font-size:1.02rem;line-height:1.95;color:#374151}
    .article-body p{margin-bottom:1.25rem}
    .article-body ul,.article-body ol{margin:0.75rem 0 1.25rem 1.5rem}
    .article-body li{margin-bottom:0.45rem;line-height:1.7}
    .article-body li::marker{color:var(--blue)}
    .article-body strong{color:var(--text);font-weight:700}
    .article-body a{color:var(--blue);text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(37,99,235,0.3);transition:text-decoration-color 0.2s}
    .article-body a:hover{text-decoration-color:var(--blue)}
    .article-body blockquote{border-left:3px solid var(--blue);padding:0.85rem 1.25rem;margin:1.5rem 0;background:var(--blue-bg);border-radius:0 var(--radius) var(--radius) 0;font-style:italic;color:var(--text-secondary)}
    .article-body table{width:100%;border-collapse:collapse;margin:1.25rem 0;font-family:var(--font-body);font-size:0.88rem;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
    .article-body th{background:var(--blue);color:#fff;padding:0.6rem 0.85rem;text-align:left;font-weight:600;font-size:0.82rem}
    .article-body td{padding:0.55rem 0.85rem;border-bottom:1px solid var(--border)}
    .article-body tr:nth-child(even) td{background:rgba(37,99,235,0.03)}
    .article-body code{background:rgba(37,99,235,0.06);padding:0.15rem 0.4rem;border-radius:4px;font-size:0.88em}
    .article-body pre{background:#1e293b;color:#e2e8f0;padding:1rem 1.25rem;border-radius:var(--radius);overflow-x:auto;margin:1.25rem 0;font-size:0.85rem}
    .article-body img{max-width:100%;border-radius:var(--radius);margin:1rem 0}
    .article-body hr{border:none;height:1px;background:var(--border);margin:2rem 0}

    /* Section boxes - Drishti/Vajirao style */
    .section-box{background:#fff;border:1px solid var(--border);border-radius:var(--radius);margin:1.75rem 0;overflow:hidden}
    .section-head{display:flex;align-items:center;gap:0.65rem;padding:0.75rem 1.1rem;background:linear-gradient(135deg,#1e3a5f,#1e40af);color:#fff;font-family:var(--font-display);font-size:1.05rem;font-weight:700;line-height:1.35}
    .section-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.2);font-size:0.82rem;font-weight:700;flex-shrink:0}
    .section-body{padding:1.1rem 1.25rem}
    .section-body>p:last-child,.section-body>ul:last-child,.section-body>ol:last-child{margin-bottom:0}

    /* Sub-section h3 inside section boxes */
    .article-body .section-body h3{font-family:var(--font-display);font-size:1.05rem;color:var(--text);margin:1.35rem 0 0.5rem;font-weight:600;padding-left:0.6rem;border-left:2px solid var(--blue-light)}
    .article-body h3{font-family:var(--font-display);font-size:1.1rem;color:var(--text);margin:1.5rem 0 0.6rem;font-weight:600}

    /* Info boxes for key concepts, background, etc. */
    .info-box{border-radius:var(--radius);padding:1rem 1.15rem;margin:1.25rem 0;font-family:var(--font-body);font-size:0.9rem;line-height:1.65;position:relative;overflow:hidden}
    .info-box::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%}
    .info-box-blue{background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.12)}
    .info-box-blue::before{background:var(--blue)}
    .info-box-green{background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15)}
    .info-box-green::before{background:#10b981}
    .info-box-amber{background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15)}
    .info-box-amber::before{background:#f59e0b}
    .info-box-purple{background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.12)}
    .info-box-purple::before{background:#8b5cf6}
    .info-box-head{display:flex;align-items:center;gap:0.45rem;font-weight:700;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.5rem}
    .info-box-head svg{width:16px;height:16px;flex-shrink:0}
    .info-box p{margin-bottom:0.6rem}
    .info-box p:last-child{margin-bottom:0}
    .info-box ul{margin:0.5rem 0 0.5rem 1.25rem}
    .info-box li{margin-bottom:0.3rem;font-size:0.88rem}

    /* Prelims / Mains relevance box */
    .relevance-box{background:#fff;border:1px solid var(--border);border-radius:var(--radius);margin:1.5rem 0;overflow:hidden}
    .relevance-head{padding:0.6rem 1rem;background:linear-gradient(135deg,rgba(37,99,235,0.08),rgba(37,99,235,0.03));border-bottom:1px solid var(--border);font-family:var(--font-display);font-size:0.82rem;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:0.45rem}
    .relevance-head svg{width:15px;height:15px}
    .relevance-body{padding:0.85rem 1rem;font-family:var(--font-body);font-size:0.88rem;line-height:1.6;color:var(--text-secondary)}
    .relevance-body a{color:var(--blue);text-decoration:none;font-weight:500}
    .relevance-body a:hover{text-decoration:underline}

    /* FAQ Accordion */
    .faq-section{margin:2rem 0;border-top:1px solid var(--border);padding-top:1.5rem}
    .faq-title{font-family:var(--font-display);font-size:1.2rem;font-weight:700;color:var(--text);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem}
    .faq-title svg{width:20px;height:20px;color:var(--blue)}
    .faq-item{border:1px solid var(--border);border-radius:var(--radius);margin-bottom:0.6rem;overflow:hidden;background:#fff;transition:border-color 0.2s}
    .faq-item.faq-open{border-color:rgba(37,99,235,0.25)}
    .faq-q{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.85rem 1.1rem;cursor:pointer;font-family:var(--font-body);font-size:0.92rem;font-weight:600;color:var(--text);transition:background 0.2s;user-select:none}
    .faq-q:hover{background:rgba(37,99,235,0.03)}
    .faq-q svg{width:18px;height:18px;flex-shrink:0;color:var(--blue);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1)}
    .faq-open .faq-q svg{transform:rotate(180deg)}
    .faq-a{max-height:0;overflow:hidden;transition:max-height 0.35s cubic-bezier(0.4,0,0.2,1),padding 0.35s}
    .faq-open .faq-a{max-height:500px}
    .faq-a-inner{padding:0 1.1rem 1rem;font-family:var(--font-body);font-size:0.88rem;line-height:1.7;color:var(--text-secondary);border-top:1px solid var(--border)}
    .faq-a-inner p{margin:0.65rem 0 0}

    /* Source attribution */
    .source-box{display:flex;align-items:center;gap:0.5rem;padding:0.65rem 1rem;background:rgba(37,99,235,0.04);border:1px solid rgba(37,99,235,0.1);border-radius:var(--radius);margin:1.25rem 0;font-family:var(--font-body);font-size:0.82rem;color:var(--text-secondary)}
    .source-box svg{width:14px;height:14px;color:var(--blue);flex-shrink:0}
    .source-box strong{color:var(--text);font-weight:600}

    .tags-section{padding:1.5rem 0;border-top:1px solid var(--border)}
    .tags-section h3{font-family:var(--font-display);font-size:0.82rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.65rem}
    .tags-list{display:flex;flex-wrap:wrap;gap:0.4rem}
    .tags-list a{display:inline-block;background:var(--blue-bg);color:var(--blue);padding:0.25rem 0.65rem;border-radius:var(--radius);font-size:0.78rem;border:1px solid var(--blue-border);text-decoration:none;transition:all 0.2s;font-weight:500}
    .tags-list a:hover{background:rgba(37,99,235,0.12);border-color:rgba(37,99,235,0.3)}

    .nav-posts{display:flex;gap:1rem;padding:1.5rem 0;border-top:1px solid var(--border)}
    .nav-post{flex:1;padding:0.85rem;border-radius:var(--radius);border:1px solid var(--border);text-decoration:none;transition:all 0.2s;background:#fff;min-width:0}
    .nav-post:hover{border-color:var(--blue-border);background:var(--blue-bg)}
    .nav-post-label{font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--blue);margin-bottom:0.3rem;display:flex;align-items:center;gap:0.3rem}
    .nav-post-label svg{width:12px;height:12px}
    .nav-post-title{font-size:0.85rem;font-weight:600;color:var(--text);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .nav-post.next{text-align:right}
    .nav-post.next .nav-post-label{justify-content:flex-end}

    .cta-box{margin:1.5rem 0;padding:1.75rem;border-radius:var(--radius);background:linear-gradient(135deg,#1e40af,var(--blue),#3b82f6);color:#fff;text-align:center;position:relative;overflow:hidden}
    .cta-box::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Cpath d='M0 40L40 0H20L0 20zM40 40V20L20 40z' fill='rgba(255,255,255,0.04)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23g)' width='40' height='40'/%3E%3C/svg%3E");pointer-events:none}
    .cta-box h3{font-family:var(--font-display);font-size:1.2rem;font-weight:700;margin-bottom:0.4rem;position:relative}
    .cta-box p{font-size:0.88rem;opacity:0.9;margin-bottom:1rem;max-width:420px;margin-left:auto;margin-right:auto;position:relative}
    .cta-btn{display:inline-block;background:#fff;color:var(--blue);padding:0.6rem 1.5rem;border-radius:var(--radius);text-decoration:none;font-weight:700;font-size:0.88rem;transition:all 0.2s;position:relative;box-shadow:0 2px 12px rgba(0,0,0,0.1)}
    .cta-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,0.15)}

    /* Sidebar */
    .sb-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:1rem;overflow:hidden}
    .sb-card-head{padding:0.7rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.5rem;background:linear-gradient(135deg,var(--blue-bg),rgba(37,99,235,0.02))}
    .sb-card-head svg{width:16px;height:16px;color:var(--blue);flex-shrink:0}
    .sb-card-head h3{font-family:var(--font-display);font-size:0.82rem;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.04em}
    .sb-card-body{padding:0.65rem 0}

    .toc-list{list-style:none}
    .toc-item{position:relative}
    .toc-item a{display:block;padding:0.35rem 1rem;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;transition:all 0.2s;border-left:2px solid transparent;line-height:1.4}
    .toc-item a:hover,.toc-item a.toc-active{color:var(--blue);background:var(--blue-bg);border-left-color:var(--blue)}
    .toc-item.toc-h3 a{padding-left:1.75rem;font-size:0.77rem}

    .sb-related-item{display:block;padding:0.65rem 1rem;text-decoration:none;border-bottom:1px solid var(--border);transition:background 0.2s}
    .sb-related-item:last-child{border-bottom:none}
    .sb-related-item:hover{background:var(--blue-bg)}
    .sb-related-item h4{font-size:0.82rem;color:var(--text);font-weight:600;line-height:1.35;margin-bottom:0.2rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .sb-related-meta{display:flex;align-items:center;gap:0.5rem;font-size:0.7rem;color:var(--text-muted);margin-bottom:0.25rem}
    .sb-related-cat{color:var(--blue);font-weight:600}
    .sb-related-read{font-size:0.7rem;color:var(--text-muted)}

    .sb-tags-wrap{padding:0.65rem 1rem;display:flex;flex-wrap:wrap;gap:0.35rem}
    .sb-tag{display:inline-block;padding:0.2rem 0.55rem;font-size:0.72rem;border-radius:var(--radius);background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-border);text-decoration:none;font-weight:500;transition:all 0.2s}
    .sb-tag:hover{background:rgba(37,99,235,0.12)}

    .sb-cta{padding:1rem;text-align:center}
    .sb-cta p{font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.65rem;line-height:1.4}
    .sb-cta a{display:block;background:var(--blue);color:#fff;padding:0.55rem 1rem;border-radius:var(--radius);text-decoration:none;font-weight:600;font-size:0.82rem;transition:background 0.2s}
    .sb-cta a:hover{background:var(--blue-dark)}

    .site-footer{border-top:1px solid var(--border);padding:2rem 1.5rem;background:#fff}
    .footer-inner{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
    .footer-brand{display:flex;align-items:center;gap:0.5rem;color:var(--text);font-weight:700;font-size:0.95rem;text-decoration:none}
    .footer-brand img{width:24px;height:24px;object-fit:contain}
    .footer-brand .ai-text{color:var(--blue)}
    .footer-copy{font-size:0.8rem;color:var(--text-muted)}
    .footer-links{display:flex;gap:1.5rem}
    .footer-links a{color:var(--text-secondary);text-decoration:none;font-size:0.8rem;transition:color 0.2s}
    .footer-links a:hover{color:var(--blue)}

    @media(max-width:960px){
      .sidebar-col{display:none}
      .page-wrapper{max-width:var(--content-max);gap:0}
    }
    @media(max-width:640px){
      .article-header h1{font-size:1.5rem}
      .page-wrapper{padding:0 1rem}
      .top-bar{padding:0 1rem}
      .footer-inner{flex-direction:column;text-align:center}
      .nav-posts{flex-direction:column}
      .section-head{font-size:0.92rem;padding:0.65rem 0.85rem}
      .section-body{padding:0.85rem 1rem}
      .info-box{padding:0.85rem 0.95rem}
      .relevance-body{font-size:0.82rem}
      .faq-q{font-size:0.85rem;padding:0.75rem 0.9rem}
    }
  </style>
</head>
<body>
  <div class="read-bar" id="readBar"></div>
  <header class="top-bar" data-testid="blog-header">
    <a href="/" class="top-bar-logo" data-testid="logo-link">
      <img src="/favicon_final.webp" alt="Learnpro AI" width="32" height="32" />
      Learnpro <span class="ai-text">AI</span>
    </a>
    <nav class="top-bar-nav" data-testid="top-nav">
      <a href="/" data-testid="nav-home">Home</a>
      <a href="/blog" data-testid="nav-blog">Blog</a>
    </nav>
  </header>

  <div class="page-wrapper">
    <main class="main-col">
      <nav class="breadcrumb" aria-label="Breadcrumb" data-testid="breadcrumb">
        <a href="/">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <a href="/blog">Blog</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <a href="/blog?category=${post.category}">${catInfo.label}</a>
      </nav>

      <header class="article-header" data-testid="article-header">
        <div class="cat-row">
          <a href="/blog?category=${post.category}" class="cat-badge" data-testid="category-badge">${catInfo.label}</a>
          <a href="/blog?category=${post.category}" class="gs-tag">${post.category.startsWith('gs-paper') ? post.category.replace('gs-paper-', 'GS Paper ') : catInfo.label}</a>
        </div>
        <h1 data-testid="article-title">${post.title}</h1>
        <div class="meta-row" data-testid="article-meta">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <time datetime="${publishedDate}">${readableDate}</time>
          </span>
          <span class="meta-sep"></span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${post.readingTimeMinutes} min read
          </span>
          <span class="meta-sep"></span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Learnpro AI Editorial
          </span>
        </div>
      </header>

      ${post.coverImageUrl ? `<div class="cover-img" data-testid="cover-image"><img src="${post.coverImageUrl}" alt="${post.coverImageAlt || post.title}" width="800" height="400" loading="eager" /></div>` : ''}

      <div class="relevance-box" data-testid="relevance-prelims">
        <div class="relevance-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          For Prelims &amp; Mains
        </div>
        <div class="relevance-body">
          <strong>Prelims:</strong> ${(post.tags || []).slice(0, 5).join(', ') || catInfo.label} |
          <strong>Mains:</strong> ${catInfo.label} - ${catInfo.description}
        </div>
      </div>

      <article class="article-body" id="articleBody" itemprop="articleBody" data-testid="article-body">
        ${post.htmlContent}
      </article>

      <div class="source-box" data-testid="source-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        <span><strong>Source:</strong> Learnpro AI Editorial | ${catInfo.label} | Published: ${readableDate}</span>
      </div>

      <section class="faq-section" id="faqSection" data-testid="faq-section">
        <h2 class="faq-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          Frequently Asked Questions
        </h2>
        <div id="faqList" data-testid="faq-list"></div>
      </section>

      ${(post.tags && post.tags.length > 0) ? `
      <section class="tags-section" data-testid="tags-section">
        <h3>Tags</h3>
        <div class="tags-list">
          ${post.tags.map((t: string) => `<a href="/blog" data-testid="tag-${t}">${t}</a>`).join('')}
        </div>
      </section>` : ''}

      <div class="cta-box" data-testid="cta-box">
        <h3>Supercharge Your UPSC Preparation</h3>
        <p>AI-powered study tools, daily current affairs, quizzes, and personalized study plans.</p>
        <a href="/" class="cta-btn" data-testid="cta-button">Start Free on Learnpro AI</a>
      </div>

      ${(prevPost || nextPost) ? `
      <nav class="nav-posts" data-testid="post-navigation">
        ${prevPost ? `<a href="/blog/${prevPost.slug}" class="nav-post prev" data-testid="prev-post">
          <div class="nav-post-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Previous</div>
          <div class="nav-post-title">${prevPost.title}</div>
        </a>` : '<div></div>'}
        ${nextPost ? `<a href="/blog/${nextPost.slug}" class="nav-post next" data-testid="next-post">
          <div class="nav-post-label">Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
          <div class="nav-post-title">${nextPost.title}</div>
        </a>` : '<div></div>'}
      </nav>` : ''}
    </main>

    <aside class="sidebar-col" data-testid="sidebar">
      <div class="sb-card" id="tocCard" data-testid="toc-card">
        <div class="sb-card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
          <h3>Table of Contents</h3>
        </div>
        <div class="sb-card-body">
          <ul class="toc-list" id="tocList" data-testid="toc-list"></ul>
        </div>
      </div>

      ${relatedPosts.length > 0 ? `
      <div class="sb-card" data-testid="related-posts-card">
        <div class="sb-card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          <h3>Related Articles</h3>
        </div>
        <div class="sb-card-body" style="padding:0">
          ${relatedHtml}
        </div>
      </div>` : ''}

      ${(post.tags && post.tags.length > 0) ? `
      <div class="sb-card" data-testid="sidebar-tags-card">
        <div class="sb-card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/></svg>
          <h3>Tags</h3>
        </div>
        <div class="sb-tags-wrap">
          ${post.tags.map((t: string) => `<a href="/blog" class="sb-tag">${t}</a>`).join('')}
        </div>
      </div>` : ''}

      <div class="sb-card" data-testid="sidebar-cta">
        <div class="sb-card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <h3>Start Preparing</h3>
        </div>
        <div class="sb-cta">
          <p>Join aspirants using AI-powered tools for UPSC and State PSC prep.</p>
          <a href="/" data-testid="sidebar-cta-btn">Try Learnpro AI Free</a>
        </div>
      </div>
    </aside>
  </div>

  <footer class="site-footer" data-testid="blog-footer">
    <div class="footer-inner">
      <a href="/" class="footer-brand">
        <img src="/favicon_final.webp" alt="Learnpro AI" width="24" height="24" />
        Learnpro <span class="ai-text">AI</span>
      </a>
      <span class="footer-copy">&#169; ${new Date().getFullYear()} Learnpro AI. All rights reserved.</span>
      <nav class="footer-links">
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
      </nav>
    </div>
  </footer>
  <script>
  (function(){
    var bar=document.getElementById('readBar');
    if(bar){
      window.addEventListener('scroll',function(){
        var h=document.documentElement;
        var pct=(h.scrollTop/(h.scrollHeight-h.clientHeight))*100;
        bar.style.width=Math.min(100,Math.max(0,pct))+'%';
      },{passive:true});
    }

    var body=document.getElementById('articleBody');
    if(!body)return;

    /* === AUTO-STRUCTURE: Wrap H2 sections in bordered boxes === */
    var children=Array.from(body.childNodes);
    var sections=[];
    var currentSection=null;
    var sectionNum=0;
    children.forEach(function(node){
      if(node.nodeType===1 && (node.tagName==='H2'||node.tagName==='H1')){
        if(currentSection){sections.push(currentSection);}
        sectionNum++;
        currentSection={heading:node,num:sectionNum,nodes:[]};
      } else if(currentSection){
        currentSection.nodes.push(node);
      }
    });
    if(currentSection){sections.push(currentSection);}

    if(sections.length>=2){
      sections.forEach(function(sec){
        var box=document.createElement('div');
        box.className='section-box';
        var head=document.createElement('div');
        head.className='section-head';
        var numSpan=document.createElement('span');
        numSpan.className='section-num';
        numSpan.textContent=sec.num;
        head.appendChild(numSpan);
        var titleSpan=document.createElement('span');
        titleSpan.textContent=sec.heading.textContent||'';
        head.appendChild(titleSpan);
        box.appendChild(head);
        var bodyDiv=document.createElement('div');
        bodyDiv.className='section-body';
        sec.nodes.forEach(function(n){bodyDiv.appendChild(n);});
        box.appendChild(bodyDiv);
        sec.heading.parentNode.insertBefore(box,sec.heading);
        sec.heading.remove();
      });
    }

    /* === Detect and wrap special patterns in info boxes === */
    var allPs=body.querySelectorAll('.section-body p, .article-body > p');
    allPs.forEach(function(p){
      var txt=(p.textContent||'').toLowerCase();
      var firstStrong=p.querySelector('strong');
      if(!firstStrong)return;
      var strongTxt=(firstStrong.textContent||'').toLowerCase();
      var boxType=null;
      var boxLabel='';
      var iconSvg='';
      if(/upsc tip|upsc note|exam tip|important note/i.test(strongTxt)){
        boxType='info-box-amber';
        boxLabel='UPSC TIP';
        iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
      } else if(/key (features?|highlights?|points?|takeaways?)|salient features/i.test(strongTxt)){
        boxType='info-box-blue';
        boxLabel='KEY POINTS';
        iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>';
      } else if(/background|context|overview/i.test(strongTxt) && txt.length<100){
        boxType='info-box-purple';
        boxLabel='BACKGROUND';
        iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
      }
      if(boxType){
        var infoBox=document.createElement('div');
        infoBox.className='info-box '+boxType;
        var headDiv=document.createElement('div');
        headDiv.className='info-box-head';
        headDiv.innerHTML=iconSvg+' '+boxLabel;
        infoBox.appendChild(headDiv);
        var nextSib=p.nextElementSibling;
        infoBox.appendChild(p.cloneNode(true));
        while(nextSib && nextSib.tagName!=='H2' && nextSib.tagName!=='H3' && nextSib.tagName!=='H1' && !nextSib.classList.contains('section-box')){
          var ns=nextSib.nextElementSibling;
          if(nextSib.tagName==='UL'||nextSib.tagName==='OL'){
            infoBox.appendChild(nextSib.cloneNode(true));
            nextSib.remove();
            nextSib=ns;
          } else {break;}
        }
        p.parentNode.replaceChild(infoBox,p);
      }
    });

    /* === Convert blockquotes to styled info boxes === */
    body.querySelectorAll('blockquote').forEach(function(bq){
      var box=document.createElement('div');
      box.className='info-box info-box-green';
      var headDiv=document.createElement('div');
      headDiv.className='info-box-head';
      headDiv.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> NOTE';
      box.appendChild(headDiv);
      box.innerHTML+=bq.innerHTML;
      bq.parentNode.replaceChild(box,bq);
    });

    /* === Generate FAQ section from article content === */
    var faqList=document.getElementById('faqList');
    var faqSection=document.getElementById('faqSection');
    if(faqList){
      var faqs=[];
      var sectionBoxes=body.querySelectorAll('.section-box');
      sectionBoxes.forEach(function(sb){
        var headEl=sb.querySelector('.section-head');
        var bodyEl=sb.querySelector('.section-body');
        if(!headEl||!bodyEl)return;
        var headText=headEl.textContent.replace(/^\d+/,'').trim();
        var firstP=bodyEl.querySelector('p');
        var answer=firstP?(firstP.textContent||'').substring(0,300):'';
        if(answer.length>280)answer=answer.substring(0,answer.lastIndexOf(' '))+'...';
        if(headText && answer){
          var q='What is '+headText+'?';
          if(/why|how|what|role|impact|significance|importance|challenges/i.test(headText.toLowerCase())){
            q=headText+'?';
          } else if(/key|features|highlights/i.test(headText.toLowerCase())){
            q='What are the '+headText+'?';
          }
          faqs.push({q:q,a:answer});
        }
      });
      if(faqs.length<3){
        var hdsLeft=body.querySelectorAll('h3');
        hdsLeft.forEach(function(h3){
          if(faqs.length>=6)return;
          var txt=h3.textContent||'';
          var nextP=h3.nextElementSibling;
          var ans=nextP?(nextP.textContent||'').substring(0,250):'';
          if(txt && ans){
            faqs.push({q:'Explain '+txt,a:ans.length>230?ans.substring(0,ans.lastIndexOf(' '))+'...':ans});
          }
        });
      }
      if(faqs.length>0){
        faqs.slice(0,6).forEach(function(faq,i){
          var item=document.createElement('div');
          item.className='faq-item';
          item.setAttribute('data-testid','faq-item-'+i);
          item.innerHTML='<div class="faq-q" role="button" tabindex="0" aria-expanded="false"><span>'+faq.q+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="faq-a"><div class="faq-a-inner"><p>'+faq.a+'</p></div></div>';
          item.querySelector('.faq-q').addEventListener('click',function(){
            var isOpen=item.classList.contains('faq-open');
            item.classList.toggle('faq-open');
            this.setAttribute('aria-expanded',!isOpen);
          });
          faqList.appendChild(item);
        });
      } else {
        faqSection.style.display='none';
      }
    }

    /* === TOC generation === */
    var tocList=document.getElementById('tocList');
    var tocCard=document.getElementById('tocCard');
    if(tocList){
      var headings=body.querySelectorAll('.section-head, h3');
      if(headings.length===0){if(tocCard)tocCard.style.display='none';}
      else{
        headings.forEach(function(h,i){
          var id='s'+i;
          var parent=h.closest('.section-box')||h;
          parent.setAttribute('id',id);
          var li=document.createElement('li');
          var isH3=h.tagName==='H3';
          li.className='toc-item'+(isH3?' toc-h3':'');
          var a=document.createElement('a');
          a.href='#'+id;
          var numEl=h.querySelector('.section-num');
          var label=numEl?(h.textContent||'').replace(numEl.textContent,'').trim():(h.textContent||'');
          a.textContent=label;
          a.addEventListener('click',function(e){
            e.preventDefault();
            parent.scrollIntoView({behavior:'smooth',block:'start'});
            history.replaceState(null,'',a.href);
          });
          li.appendChild(a);
          tocList.appendChild(li);
        });

        var tocLinks=tocList.querySelectorAll('a');
        var targets=[];
        tocLinks.forEach(function(l){
          var t=document.querySelector(l.getAttribute('href'));
          if(t)targets.push({link:l,el:t});
        });
        var obs=new IntersectionObserver(function(entries){
          entries.forEach(function(en){
            if(en.isIntersecting){
              tocLinks.forEach(function(l){l.classList.remove('toc-active');});
              targets.forEach(function(t){
                if(t.el===en.target)t.link.classList.add('toc-active');
              });
            }
          });
        },{rootMargin:'-80px 0px -70% 0px',threshold:0});
        targets.forEach(function(t){obs.observe(t.el);});
      }
    }

    /* === Inject FAQ Schema JSON-LD for SEO === */
    if(faqList && faqList.children.length>0){
      var faqSchema={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]};
      var faqItems=faqList.querySelectorAll('.faq-item');
      faqItems.forEach(function(item){
        var qEl=item.querySelector('.faq-q span');
        var aEl=item.querySelector('.faq-a-inner');
        if(qEl && aEl){
          faqSchema.mainEntity.push({
            "@type":"Question",
            "name":qEl.textContent,
            "acceptedAnswer":{"@type":"Answer","text":aEl.textContent.trim()}
          });
        }
      });
      var script=document.createElement('script');
      script.type='application/ld+json';
      script.textContent=JSON.stringify(faqSchema);
      document.head.appendChild(script);
    }
  })();
  </script>
</body>
</html>`;
}

export function registerBlogRoutes(app: any) {
  const router = Router();

  router.get("/api/blog/posts", async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
      const category = req.query.category as string;
      const offset = (page - 1) * limit;

      const conditions = [eq(blogPosts.published, true)];
      if (category && BLOG_CATEGORIES.includes(category as any)) {
        conditions.push(eq(blogPosts.category, category));
      }

      const where = conditions.length === 1 ? conditions[0] : and(...conditions);

      const [posts, [{ total }]] = await Promise.all([
        db
          .select({
            id: blogPosts.id,
            slug: blogPosts.slug,
            title: blogPosts.title,
            excerpt: blogPosts.excerpt,
            coverImageUrl: blogPosts.coverImageUrl,
            coverImageAlt: blogPosts.coverImageAlt,
            category: blogPosts.category,
            tags: blogPosts.tags,
            readingTimeMinutes: blogPosts.readingTimeMinutes,
            publishedAt: blogPosts.publishedAt,
            featured: blogPosts.featured,
          })
          .from(blogPosts)
          .where(where)
          .orderBy(desc(blogPosts.publishedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: sql<number>`count(*)::int` })
          .from(blogPosts)
          .where(where),
      ]);

      res.json({
        posts,
        page,
        totalPages: Math.ceil(total / limit),
        total,
      });
    } catch (e) {
      console.error("Error fetching blog posts:", e);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  router.get("/api/blog/posts/:slug", async (req: Request, res: Response) => {
    try {
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(sql`${blogPosts.slug} = ${req.params.slug} AND ${blogPosts.published} = true`);

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (e) {
      console.error("Error fetching blog post:", e);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  router.get("/api/blog/images/:filename", async (req: Request, res: Response) => {
    try {
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        return res.status(404).send("Not found");
      }

      const objectPath = `public/blog/${req.params.filename}`;
      const bucket = objectStorageClient.bucket(bucketId);
      const file = bucket.file(objectPath);
      const [exists] = await file.exists();

      if (!exists) {
        return res.status(404).send("Image not found");
      }

      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      });

      file.createReadStream().pipe(res);
    } catch (e) {
      res.status(404).send("Image not found");
    }
  });

  router.post("/api/blog/generate", async (req: Request, res: Response) => {
    try {
      const count = Math.min(10, Math.max(1, parseInt(req.query.count as string) || 5));
      res.json({ message: `Blog generation started for ${count} posts`, status: "started" });
      generateBlogPosts(count).then(n => console.log(`Blog generation complete: ${n} posts created`));
    } catch (e) {
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  router.get("/blog", async (req: Request, res: Response) => {
    try {
      const [allPosts, categoryCountsRaw] = await Promise.all([
        db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.published, true))
          .orderBy(desc(blogPosts.publishedAt)),
        db
          .select({ category: blogPosts.category, count: sql<number>`count(*)::int` })
          .from(blogPosts)
          .where(eq(blogPosts.published, true))
          .groupBy(blogPosts.category),
      ]);

      const categoryCounts: Record<string, number> = {};
      for (const row of categoryCountsRaw) {
        categoryCounts[row.category] = row.count;
      }

      res.set("Content-Type", "text/html");
      res.send(renderBlogListHtml(allPosts, 1, 1, "all", categoryCounts));
    } catch (e) {
      console.error("Error rendering blog:", e);
      res.status(500).send("Error loading blog");
    }
  });

  router.get("/blog/:slug", async (req: Request, res: Response) => {
    try {
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(sql`${blogPosts.slug} = ${req.params.slug} AND ${blogPosts.published} = true`);

      if (!post) {
        return res.status(404).send("Post not found");
      }

      const [relatedPosts, allPublished] = await Promise.all([
        db
          .select({
            slug: blogPosts.slug,
            title: blogPosts.title,
            category: blogPosts.category,
            readingTimeMinutes: blogPosts.readingTimeMinutes,
            publishedAt: blogPosts.publishedAt,
            coverImageUrl: blogPosts.coverImageUrl,
            excerpt: blogPosts.excerpt,
          })
          .from(blogPosts)
          .where(sql`${blogPosts.published} = true AND ${blogPosts.slug} != ${req.params.slug}`)
          .orderBy(desc(blogPosts.publishedAt))
          .limit(5),
        db
          .select({ slug: blogPosts.slug, title: blogPosts.title, publishedAt: blogPosts.publishedAt })
          .from(blogPosts)
          .where(eq(blogPosts.published, true))
          .orderBy(desc(blogPosts.publishedAt)),
      ]);

      let prevPost = null;
      let nextPost = null;
      const idx = allPublished.findIndex(p => p.slug === post.slug);
      if (idx > 0) nextPost = allPublished[idx - 1];
      if (idx < allPublished.length - 1) prevPost = allPublished[idx + 1];

      res.set("Content-Type", "text/html");
      res.send(renderBlogPostHtml(post, relatedPosts, prevPost, nextPost));
    } catch (e) {
      console.error("Error rendering blog post:", e);
      res.status(500).send("Error loading post");
    }
  });

  router.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const posts = await db
        .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
        .from(blogPosts)
        .where(eq(blogPosts.published, true))
        .orderBy(desc(blogPosts.publishedAt));

      const staticPages = [
        { loc: "https://learnproai.in/", priority: "1.0", changefreq: "daily" },
        { loc: "https://learnproai.in/blog", priority: "0.9", changefreq: "daily" },
      ];

      const urls = [
        ...staticPages.map(p => `
    <url>
      <loc>${p.loc}</loc>
      <changefreq>${p.changefreq}</changefreq>
      <priority>${p.priority}</priority>
    </url>`),
        ...posts.map(p => `
    <url>
      <loc>https://learnproai.in/blog/${p.slug}</loc>
      <lastmod>${new Date(p.updatedAt!).toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>`),
      ];

      res.set("Content-Type", "application/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('')}
</urlset>`);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  router.get("/robots.txt", (_req: Request, res: Response) => {
    res.set("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /
Allow: /blog
Allow: /blog/*

Sitemap: https://learnproai.in/sitemap.xml

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /
`);
  });

  app.use(router);

  scheduleDailyBlogGeneration();
}

function scheduleDailyBlogGeneration() {
  const GENERATION_HOUR = 4;
  const POSTS_PER_DAY = 5;

  function scheduleNext() {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(GENERATION_HOUR, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    const delay = nextRun.getTime() - now.getTime();
    console.log(`[Blog] Next auto-generation scheduled at ${nextRun.toISOString()} (in ${Math.round(delay / 3600000)}h)`);

    setTimeout(async () => {
      try {
        console.log("[Blog] Starting daily auto-generation...");
        const count = await generateBlogPosts(POSTS_PER_DAY);
        console.log(`[Blog] Daily auto-generation complete: ${count} posts created`);
      } catch (e) {
        console.error("[Blog] Daily auto-generation failed:", e);
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}
