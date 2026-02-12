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

function renderBlogListHtml(posts: any[], page: number, totalPages: number): string {
  const postCards = posts.map(post => `
    <article class="blog-card" itemscope itemtype="https://schema.org/Article">
      ${post.coverImageUrl ? `<a href="/blog/${post.slug}"><img src="${post.coverImageUrl}" alt="${post.coverImageAlt || post.title}" loading="lazy" width="800" height="450" /></a>` : ''}
      <div class="blog-card-content">
        <span class="blog-category">${post.category.replace(/-/g, ' ').toUpperCase()}</span>
        <h2 itemprop="headline"><a href="/blog/${post.slug}">${post.title}</a></h2>
        <p itemprop="description">${post.excerpt}</p>
        <div class="blog-meta">
          <time datetime="${new Date(post.publishedAt).toISOString()}" itemprop="datePublished">${new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <span>${post.readingTimeMinutes} min read</span>
        </div>
      </div>
    </article>
  `).join('');

  const pagination = totalPages > 1 ? `
    <nav class="pagination" aria-label="Blog pagination">
      ${page > 1 ? `<a href="/blog?page=${page - 1}">Previous</a>` : ''}
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p =>
        `<a href="/blog?page=${p}" ${p === page ? 'class="active"' : ''}>${p}</a>`
      ).join('')}
      ${page < totalPages ? `<a href="/blog?page=${page + 1}">Next</a>` : ''}
    </nav>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPSC Preparation Blog | Learnpro AI - IAS Study Tips & Strategy</title>
  <meta name="description" content="Expert UPSC preparation tips, IAS study strategies, current affairs analysis, and exam guidance. Free resources for Civil Services aspirants by Learnpro AI.">
  <meta name="keywords" content="UPSC blog, IAS preparation tips, Civil Services strategy, UPSC study plan, current affairs UPSC, UPSC topper strategy">
  <link rel="canonical" href="https://learnproai.in/blog${page > 1 ? `?page=${page}` : ''}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="UPSC Preparation Blog | Learnpro AI">
  <meta property="og:description" content="Expert UPSC preparation tips, IAS study strategies, and free resources for Civil Services aspirants.">
  <meta property="og:url" content="https://learnproai.in/blog">
  <meta property="og:site_name" content="Learnpro AI">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="index, follow, max-image-preview:large">
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
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#e0e0e0;line-height:1.6}
    .blog-header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#1a1a2e 100%);border-bottom:2px solid #d4a634;padding:2rem;text-align:center}
    .blog-header h1{font-size:2rem;color:#d4a634;margin-bottom:0.5rem}
    .blog-header p{color:#9ca3af;font-size:1.1rem}
    .blog-header nav{margin-top:1rem}
    .blog-header nav a{color:#d4a634;text-decoration:none;margin:0 1rem;font-weight:500}
    .blog-header nav a:hover{text-decoration:underline}
    .blog-container{max-width:1200px;margin:0 auto;padding:2rem 1rem}
    .blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:2rem}
    .blog-card{background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a;transition:transform 0.2s,box-shadow 0.2s}
    .blog-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(212,166,52,0.15)}
    .blog-card img{width:100%;height:200px;object-fit:cover}
    .blog-card-content{padding:1.5rem}
    .blog-category{display:inline-block;background:rgba(212,166,52,0.15);color:#d4a634;font-size:0.75rem;font-weight:600;padding:0.25rem 0.75rem;border-radius:9999px;margin-bottom:0.75rem;letter-spacing:0.05em}
    .blog-card h2{font-size:1.2rem;margin-bottom:0.75rem;line-height:1.4}
    .blog-card h2 a{color:#fff;text-decoration:none}
    .blog-card h2 a:hover{color:#d4a634}
    .blog-card p{color:#9ca3af;font-size:0.9rem;margin-bottom:1rem}
    .blog-meta{display:flex;justify-content:space-between;color:#6b7280;font-size:0.85rem}
    .pagination{display:flex;justify-content:center;gap:0.5rem;margin-top:3rem;flex-wrap:wrap}
    .pagination a{padding:0.5rem 1rem;background:#1a1a2e;color:#d4a634;text-decoration:none;border-radius:8px;border:1px solid #2a2a4a}
    .pagination a.active{background:#d4a634;color:#0f0f0f;font-weight:700}
    .pagination a:hover{background:#2a2a4a}
    .blog-footer{text-align:center;padding:2rem;border-top:1px solid #2a2a4a;margin-top:3rem;color:#6b7280}
    .blog-footer a{color:#d4a634;text-decoration:none}
    @media(max-width:768px){.blog-grid{grid-template-columns:1fr}.blog-header h1{font-size:1.5rem}}
  </style>
</head>
<body>
  <header class="blog-header">
    <h1>Learnpro AI Blog</h1>
    <p>Expert UPSC & Civil Services Preparation Resources</p>
    <nav>
      <a href="/">Home</a>
      <a href="/blog">All Posts</a>
    </nav>
  </header>
  <main class="blog-container">
    <div class="blog-grid">
      ${postCards}
    </div>
    ${pagination}
  </main>
  <footer class="blog-footer">
    <p>&copy; ${new Date().getFullYear()} <a href="/">Learnpro AI</a> - AI-Powered UPSC Preparation Platform</p>
  </footer>
</body>
</html>`;
}

function renderBlogPostHtml(post: any): string {
  const publishedDate = new Date(post.publishedAt).toISOString();
  const readableDate = new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.metaTitle}</title>
  <meta name="description" content="${post.metaDescription}">
  <meta name="keywords" content="${(post.tags || []).join(', ')}">
  <link rel="canonical" href="https://learnproai.in/blog/${post.slug}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${post.metaTitle}">
  <meta property="og:description" content="${post.metaDescription}">
  <meta property="og:url" content="https://learnproai.in/blog/${post.slug}">
  <meta property="og:site_name" content="Learnpro AI">
  ${post.coverImageUrl ? `<meta property="og:image" content="https://learnproai.in${post.coverImageUrl}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${post.metaTitle}">
  <meta name="twitter:description" content="${post.metaDescription}">
  <meta property="article:published_time" content="${publishedDate}">
  <meta property="article:section" content="${post.category}">
  ${(post.tags || []).map((t: string) => `<meta property="article:tag" content="${t}">`).join('\n  ')}
  <meta name="robots" content="index, follow, max-image-preview:large">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${post.title}",
    "description": "${post.metaDescription}",
    "datePublished": "${publishedDate}",
    "dateModified": "${new Date(post.updatedAt).toISOString()}",
    ${post.coverImageUrl ? `"image": "https://learnproai.in${post.coverImageUrl}",` : ''}
    "author": {
      "@type": "Organization",
      "name": "Learnpro AI"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Learnpro AI",
      "url": "https://learnproai.in"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://learnproai.in/blog/${post.slug}"
    },
    "articleSection": "${post.category}",
    "wordCount": ${post.content.split(/\s+/).length},
    "keywords": "${(post.tags || []).join(', ')}"
  }
  </script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#e0e0e0;line-height:1.8}
    .post-header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#1a1a2e 100%);border-bottom:2px solid #d4a634;padding:2rem}
    .post-header-inner{max-width:800px;margin:0 auto}
    .post-header nav{margin-bottom:1.5rem}
    .post-header nav a{color:#d4a634;text-decoration:none;font-size:0.9rem}
    .post-header nav a:hover{text-decoration:underline}
    .post-category{display:inline-block;background:rgba(212,166,52,0.15);color:#d4a634;font-size:0.75rem;font-weight:600;padding:0.25rem 0.75rem;border-radius:9999px;margin-bottom:1rem;letter-spacing:0.05em}
    .post-header h1{font-size:2rem;color:#fff;margin-bottom:1rem;line-height:1.3}
    .post-meta{color:#9ca3af;font-size:0.9rem;display:flex;gap:1.5rem;flex-wrap:wrap}
    .post-cover{max-width:800px;margin:2rem auto 0;padding:0 1rem}
    .post-cover img{width:100%;border-radius:12px;max-height:400px;object-fit:cover}
    .post-content{max-width:800px;margin:0 auto;padding:2rem 1rem}
    .post-content h1{font-size:1.8rem;color:#d4a634;margin:2rem 0 1rem}
    .post-content h2{font-size:1.5rem;color:#d4a634;margin:2rem 0 1rem;border-bottom:1px solid #2a2a4a;padding-bottom:0.5rem}
    .post-content h3{font-size:1.25rem;color:#e8c547;margin:1.5rem 0 0.75rem}
    .post-content p{margin-bottom:1.25rem;color:#d0d0d0}
    .post-content ul,.post-content ol{margin:1rem 0 1.5rem 1.5rem}
    .post-content li{margin-bottom:0.5rem;color:#d0d0d0}
    .post-content strong{color:#fff}
    .post-content a{color:#d4a634;text-decoration:underline}
    .post-tags{max-width:800px;margin:2rem auto;padding:0 1rem;display:flex;flex-wrap:wrap;gap:0.5rem}
    .post-tags span{background:#1a1a2e;color:#9ca3af;padding:0.25rem 0.75rem;border-radius:9999px;font-size:0.8rem;border:1px solid #2a2a4a}
    .post-footer{max-width:800px;margin:0 auto;padding:2rem 1rem;border-top:1px solid #2a2a4a}
    .post-footer .cta{background:linear-gradient(135deg,#d4a634,#e8c547);color:#0f0f0f;padding:2rem;border-radius:12px;text-align:center}
    .post-footer .cta h3{font-size:1.3rem;margin-bottom:0.5rem}
    .post-footer .cta p{margin-bottom:1rem;color:#333}
    .post-footer .cta a{display:inline-block;background:#0f0f0f;color:#d4a634;padding:0.75rem 2rem;border-radius:8px;text-decoration:none;font-weight:600}
    .blog-footer{text-align:center;padding:2rem;border-top:1px solid #2a2a4a;margin-top:2rem;color:#6b7280}
    .blog-footer a{color:#d4a634;text-decoration:none}
    @media(max-width:768px){.post-header h1{font-size:1.5rem}.post-content{padding:1.5rem 1rem}}
  </style>
</head>
<body>
  <header class="post-header">
    <div class="post-header-inner">
      <nav><a href="/blog">&larr; Back to Blog</a> &nbsp;|&nbsp; <a href="/">Learnpro AI Home</a></nav>
      <span class="post-category">${post.category.replace(/-/g, ' ').toUpperCase()}</span>
      <h1>${post.title}</h1>
      <div class="post-meta">
        <time datetime="${publishedDate}">${readableDate}</time>
        <span>${post.readingTimeMinutes} min read</span>
        <span>By Learnpro AI</span>
      </div>
    </div>
  </header>
  ${post.coverImageUrl ? `<div class="post-cover"><img src="${post.coverImageUrl}" alt="${post.coverImageAlt || post.title}" width="800" height="400" /></div>` : ''}
  <article class="post-content" itemprop="articleBody">
    ${post.htmlContent}
  </article>
  ${(post.tags && post.tags.length > 0) ? `
  <div class="post-tags">
    ${post.tags.map((t: string) => `<span>#${t}</span>`).join('')}
  </div>` : ''}
  <div class="post-footer">
    <div class="cta">
      <h3>Supercharge Your UPSC Preparation</h3>
      <p>Join thousands of aspirants using AI-powered study tools, daily current affairs, practice quizzes, and personalized study plans.</p>
      <a href="/">Start Free on Learnpro AI</a>
    </div>
  </div>
  <footer class="blog-footer">
    <p>&copy; ${new Date().getFullYear()} <a href="/">Learnpro AI</a> - AI-Powered UPSC Preparation Platform</p>
  </footer>
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
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = 12;
      const offset = (page - 1) * limit;

      const [posts, [{ total }]] = await Promise.all([
        db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.published, true))
          .orderBy(desc(blogPosts.publishedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: sql<number>`count(*)::int` })
          .from(blogPosts)
          .where(eq(blogPosts.published, true)),
      ]);

      const totalPages = Math.ceil(total / limit);
      res.set("Content-Type", "text/html");
      res.send(renderBlogListHtml(posts, page, totalPages));
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

      res.set("Content-Type", "text/html");
      res.send(renderBlogPostHtml(post));
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
