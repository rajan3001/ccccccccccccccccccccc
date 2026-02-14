import * as cheerio from "cheerio";
import { GoogleGenAI, Modality } from "@google/genai";
import { db } from "./db";
import { blogPosts, type InsertBlogPost, BLOG_CATEGORIES } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface ScrapedArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  category: string;
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error(`[Scraper] Failed to fetch ${url}:`, (e as Error).message);
    return null;
  }
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").trim();
}

async function scrapeDrishtiIAS(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.drishtiias.com/daily-updates/daily-news-editorials", cat: "current-affairs" },
    { url: "https://www.drishtiias.com/daily-updates/daily-news-analysis", cat: "current-affairs" },
    { url: "https://www.drishtiias.com/to-the-points", cat: "general" },
    { url: "https://www.drishtiias.com/important-institutions", cat: "gs-paper-2" },
  ];

  for (const section of sections) {
    try {
      const html = await fetchHtml(section.url);
      if (!html) continue;
      const $ = cheerio.load(html);
      const links: { href: string; title: string }[] = [];

      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const title = $(el).text().trim();
        if (href && title && title.length > 15 && title.length < 200 &&
            (href.includes("daily-news") || href.includes("daily-updates") || href.includes("to-the-points") || href.includes("important-institutions"))) {
          const fullUrl = href.startsWith("http") ? href : `https://www.drishtiias.com${href}`;
          if (!links.find(l => l.href === fullUrl)) {
            links.push({ href: fullUrl, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);

        page$("script, style, nav, header, footer, .sidebar, .advertisement, .ad-container, .social-share, .breadcrumb, .related-articles, .comment-section").remove();

        let content = "";
        const articleBody = page$(".article-content, .entry-content, .post-content, main article, .post_content, #content-area, .blog-content").first();

        if (articleBody.length) {
          content = articleBody.text();
        } else {
          content = page$("body").text();
        }

        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: link.title,
            content: content.substring(0, 8000),
            url: link.href,
            source: "drishti",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] Drishti IAS error:`, (e as Error).message);
    }
  }
  return articles;
}

async function scrapeVajiramandravi(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://vajiramandravi.com/quest-upsc-notes/", cat: "upsc-strategy" },
    { url: "https://vajiramandravi.com/upsc-daily-current-affairs/", cat: "current-affairs" },
  ];

  for (const section of sections) {
    try {
      const html = await fetchHtml(section.url);
      if (!html) continue;
      const $ = cheerio.load(html);
      const links: { href: string; title: string }[] = [];

      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const title = $(el).text().trim();
        if (href && title && title.length > 15 && title.length < 200 && href.includes("vajiramandravi.com")) {
          const fullUrl = href.startsWith("http") ? href : `https://vajiramandravi.com${href}`;
          if (!links.find(l => l.href === fullUrl) && fullUrl !== section.url) {
            links.push({ href: fullUrl, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar, .advertisement").remove();

        let content = page$(".entry-content, .post-content, article, .blog-content, main").first().text();
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: link.title,
            content: content.substring(0, 8000),
            url: link.href,
            source: "vajiram",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] Vajiram error:`, (e as Error).message);
    }
  }
  return articles;
}

async function scrapeVisionIAS(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.visionias.in/current-affairs/daily-news", cat: "current-affairs" },
    { url: "https://www.visionias.in/current-affairs", cat: "current-affairs" },
    { url: "https://www.visionias.in/resources/blogs", cat: "general" },
    { url: "https://www.visionias.in/resources", cat: "general" },
  ];

  for (const section of sections) {
    try {
      const html = await fetchHtml(section.url);
      if (!html) continue;
      const $ = cheerio.load(html);
      const links: { href: string; title: string }[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        let title = $(el).text().trim();
        if (!title || title.length < 10) {
          title = $(el).attr("title") || $(el).find("h2, h3, h4, .title").first().text().trim();
        }
        if (href && title && title.length > 10 && title.length < 200) {
          const fullUrl = href.startsWith("http") ? href : `https://www.visionias.in${href.startsWith("/") ? "" : "/"}${href}`;
          if (!links.find(l => l.href === fullUrl) && fullUrl !== section.url &&
              !fullUrl.includes("login") && !fullUrl.includes("signup") && !fullUrl.includes("cart")) {
            links.push({ href: fullUrl, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar, .ad-container").remove();

        let content = page$(".content, .post-content, article, main, .entry-content, .blog-content, .article-body, #main-content").first().text();
        if (!content || content.length < 200) {
          content = page$("body").text();
        }
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: link.title,
            content: content.substring(0, 8000),
            url: link.href,
            source: "vision",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] Vision IAS error:`, (e as Error).message);
    }
  }
  return articles;
}

async function scrapeAdda247(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.adda247.com/upsc-exam/", cat: "upsc-strategy" },
    { url: "https://www.adda247.com/upsc-exam/upsc-current-affairs/", cat: "current-affairs" },
    { url: "https://www.adda247.com/jobs/", cat: "general" },
    { url: "https://www.adda247.com/government-jobs/", cat: "general" },
  ];

  for (const section of sections) {
    try {
      const html = await fetchHtml(section.url);
      if (!html) continue;
      const $ = cheerio.load(html);
      const links: { href: string; title: string }[] = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        let title = $(el).text().trim();
        if (!title || title.length < 10) {
          title = $(el).attr("title") || $(el).find("h2, h3, h4, .title, .heading").first().text().trim();
        }
        if (href && title && title.length > 15 && title.length < 200 &&
            href.includes("adda247.com") && !href.includes("login") && !href.includes("signup") &&
            !href.includes("mock-test") && !href.includes("test-series")) {
          if (!links.find(l => l.href === href) && href !== section.url) {
            links.push({ href, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar, .advertisement, .ad-wrapper, .social-share, .related-post").remove();

        let content = page$(".blog__content, .entry-content, article, .post-content, main, .article-content, #content-area").first().text();
        if (!content || content.length < 200) {
          content = page$("body").text();
        }
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: link.title,
            content: content.substring(0, 8000),
            url: link.href,
            source: "adda247",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] Adda247 error:`, (e as Error).message);
    }
  }
  return articles;
}

async function scrapeSPMIAS(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://spmiasacademy.com/blog/", cat: "upsc-strategy" },
    { url: "https://spmiasacademy.com/current-affairs/", cat: "current-affairs" },
  ];

  for (const section of sections) {
    try {
      const html = await fetchHtml(section.url);
      if (!html) continue;
      const $ = cheerio.load(html);
      const links: { href: string; title: string }[] = [];

      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const title = $(el).text().trim();
        if (href && title && title.length > 15 && title.length < 200 &&
            href.includes("spmiasacademy.com") && href !== section.url) {
          if (!links.find(l => l.href === href)) {
            links.push({ href, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar").remove();

        let content = page$(".entry-content, .post-content, article, main, .content-area").first().text();
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: link.title,
            content: content.substring(0, 8000),
            url: link.href,
            source: "spm",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] SPM IAS error:`, (e as Error).message);
    }
  }
  return articles;
}

export async function scrapeAllSources(): Promise<ScrapedArticle[]> {
  console.log("[Scraper] Starting to scrape all 5 sources...");

  const results = await Promise.allSettled([
    scrapeDrishtiIAS(),
    scrapeVajiramandravi(),
    scrapeVisionIAS(),
    scrapeAdda247(),
    scrapeSPMIAS(),
  ]);

  const allArticles: ScrapedArticle[] = [];
  const sourceNames = ["Drishti IAS", "Vajiram & Ravi", "Vision IAS", "Adda247", "SPM IAS"];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      console.log(`[Scraper] ${sourceNames[i]}: ${result.value.length} articles found`);
      allArticles.push(...result.value);
    } else {
      console.error(`[Scraper] ${sourceNames[i]} failed:`, result.reason);
    }
  }

  console.log(`[Scraper] Total articles scraped: ${allArticles.length}`);
  return allArticles;
}

function detectCategory(title: string, content: string): string {
  const text = (title + " " + content).toLowerCase();
  if (text.includes("current affairs") || text.includes("daily news") || text.includes("editorial")) return "current-affairs";
  if (text.includes("polity") || text.includes("constitution") || text.includes("governance") || text.includes("parliament")) return "gs-paper-2";
  if (text.includes("economy") || text.includes("budget") || text.includes("gdp") || text.includes("fiscal")) return "gs-paper-3";
  if (text.includes("history") || text.includes("geography") || text.includes("culture") || text.includes("society")) return "gs-paper-1";
  if (text.includes("ethics") || text.includes("integrity") || text.includes("aptitude")) return "gs-paper-4";
  if (text.includes("essay")) return "essay";
  if (text.includes("strategy") || text.includes("preparation") || text.includes("syllabus") || text.includes("topper")) return "upsc-strategy";
  if (text.includes("answer writing") || text.includes("mains answer")) return "answer-writing";
  if (text.includes("state psc") || text.includes("bpsc") || text.includes("uppsc") || text.includes("mpsc")) return "state-psc";
  if (text.includes("book") || text.includes("ncert") || text.includes("reading list")) return "booklist";
  if (text.includes("csat") || text.includes("aptitude") || text.includes("reasoning")) return "csat";
  if (text.includes("vacancy") || text.includes("recruitment") || text.includes("notification") || text.includes("job")) return "general";
  return "general";
}

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
  const lines = md.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableHeaders = false;

  function closeLists() {
    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }
  }

  function inlineFormat(text: string): string {
    text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return text;
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^\|[\s\-:]+\|/.test(line) && !line.replace(/[\s\-:|]/g, '').length) { tableHeaders = true; continue; }
    if (/^\|(.+)\|$/.test(line)) {
      if (!inTable) { closeLists(); result.push('<table>'); inTable = true; tableHeaders = false; }
      const cells = line.split('|').filter(c => c.trim() !== '');
      const cellTag = !tableHeaders && result[result.length - 1] === '<table>' ? 'th' : 'td';
      const row = cells.map(c => `<${cellTag}>${inlineFormat(c.trim())}</${cellTag}>`).join('');
      result.push(`<tr>${row}</tr>`);
      continue;
    } else if (inTable) { result.push('</table>'); inTable = false; tableHeaders = false; }
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) { closeLists(); const level = Math.min(headingMatch[1].length, 4); const tag = level <= 3 ? `h${level}` : 'h3'; result.push(`<${tag}>${inlineFormat(headingMatch[2])}</${tag}>`); continue; }
    const ulMatch = line.match(/^\s*[\-\*]\s+(.+)$/);
    if (ulMatch) { if (inOl) { result.push('</ol>'); inOl = false; } if (!inUl) { result.push('<ul>'); inUl = true; } result.push(`<li>${inlineFormat(ulMatch[1])}</li>`); continue; }
    const olMatch = line.match(/^\s*\d+[\.\)]\s+(.+)$/);
    if (olMatch) { if (inUl) { result.push('</ul>'); inUl = false; } if (!inOl) { result.push('<ol>'); inOl = true; } result.push(`<li>${inlineFormat(olMatch[1])}</li>`); continue; }
    if (/^>\s*(.+)$/.test(line)) { closeLists(); result.push(`<blockquote><p>${inlineFormat(line.replace(/^>\s*/, ''))}</p></blockquote>`); continue; }
    if (line.trim() === '') { closeLists(); continue; }
    closeLists();
    result.push(`<p>${inlineFormat(line)}</p>`);
  }
  closeLists();
  if (inTable) result.push('</table>');
  return result.join('\n');
}

const BLOCKED_NAMES = [
  "drishti ias", "drishtiias", "drishti", "vajiram", "vajiram & ravi", "vajiramandravi",
  "vision ias", "visionias", "adda247", "adda 247", "spm ias", "spmiasacademy",
  "spm ias academy", "byju", "unacademy", "testbook", "oliveboard", "gradeup",
  "prepp", "clearias", "iasbaba", "insights ias", "insightsonindia", "shankar ias",
  "nextias", "next ias", "forum ias",
];

function sanitizeContent(text: string): string {
  let result = text;
  for (const name of BLOCKED_NAMES) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, "leading coaching experts");
  }
  result = result.replace(/https?:\/\/(www\.)?(drishtiias|vajiramandravi|visionias|adda247|spmiasacademy|byju|unacademy|testbook)\.[a-z.]+[^\s)"]*/gi, "");
  return result;
}

async function rewriteArticleWithAI(article: ScrapedArticle): Promise<InsertBlogPost | null> {
  const detectedCategory = detectCategory(article.title, article.content);

  const prompt = `You are a senior UPSC content strategist at Learnpro AI. You must COMPLETELY REWRITE the following content into a 100% original, deeply researched, SEO-optimized article.

IMPORTANT RULES:
1. NEVER mention any coaching institute, website, academy, or source name
2. NEVER copy sentences as-is. Every sentence must be completely rewritten in your own words
3. Add NEW insights, analysis, UPSC relevance angles, and exam-focused commentary
4. Make it significantly BETTER and MORE COMPREHENSIVE than the original
5. Target 2000-2500 words minimum with deep UPSC-focused analysis
6. Write as if Learnpro AI's expert team researched and wrote this from scratch

ORIGINAL TITLE: "${article.title}"
ORIGINAL CONTENT (use as research material only, DO NOT copy):
${article.content}

=== FORMATTING RULES ===
HEADINGS: Use ONLY ## (H2) and ### (H3). NEVER use #### or deeper.
- Minimum 6 H2 sections, each with 2-3 H3 sub-sections
LISTS: EVERY H2 section MUST have at least one bullet list using dash (-) syntax
BOLD: Bold ALL key terms, names, articles, acts, dates using **double asterisks**
TABLES: Include at least ONE comparison or summary table
PARAGRAPHS: Maximum 3 lines per paragraph. No walls of text.

=== CONTENT ENHANCEMENTS ===
- Add UPSC Prelims and Mains relevance notes
- Include related Constitutional articles and provisions
- Add historical context and recent developments
- Include comparison tables and data points
- End with ## Frequently Asked Questions (6 FAQs as ### headings with 2-3 sentence answers)
- Add ## UPSC Exam Relevance section explaining which papers/topics this connects to

=== OUTPUT FORMAT ===
Return ONLY a JSON object:
{
  "title": "Completely new SEO title (under 60 chars) with UPSC/IAS keywords - must be DIFFERENT from original",
  "metaTitle": "Meta title 50-60 chars with UPSC/IAS keyword",
  "metaDescription": "150-160 char meta description with keyword and CTA",
  "excerpt": "2-3 sentence summary under 200 chars",
  "content": "Full markdown content. ONLY ## and ### headings. Dash lists. Bold terms. Tables. Short paragraphs.",
  "tags": ["5-8 relevant tags"],
  "coverImageAlt": "Descriptive alt text with keywords",
  "category": "${detectedCategory}"
}

No markdown fencing. No extra text. Only valid JSON.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 2048 }, temperature: 0.6 },
    });

    const text = result.text?.trim() || "";
    let jsonStr = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e1) {
      jsonStr = jsonStr.replace(/\t/g, "    ").replace(/\r\n/g, "\n");
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e2) {
        const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
        const contentMatch = jsonStr.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:metaTitle|tags|excerpt)/);
        if (!titleMatch || !contentMatch) throw e1;
        const metaTitleMatch = jsonStr.match(/"metaTitle"\s*:\s*"([^"]+)"/);
        const metaDescMatch = jsonStr.match(/"metaDescription"\s*:\s*"([^"]+)"/);
        const excerptMatch = jsonStr.match(/"excerpt"\s*:\s*"([^"]+)"/);
        const coverAltMatch = jsonStr.match(/"coverImageAlt"\s*:\s*"([^"]+)"/);
        const tagsMatch = jsonStr.match(/"tags"\s*:\s*\[([^\]]+)\]/);
        parsed = {
          title: titleMatch[1],
          content: contentMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
          metaTitle: metaTitleMatch?.[1] || titleMatch[1] + " | Learnpro AI",
          metaDescription: metaDescMatch?.[1] || excerptMatch?.[1] || "",
          excerpt: excerptMatch?.[1] || "",
          coverImageAlt: coverAltMatch?.[1] || titleMatch[1],
          tags: tagsMatch ? tagsMatch[1].split(",").map((t: string) => t.trim().replace(/"/g, "")) : [],
          category: detectedCategory,
        };
      }
    }

    const sanitizedTitle = sanitizeContent(parsed.title);
    const sanitizedMd = sanitizeContent(parsed.content);
    const slug = slugify(sanitizedTitle) + "-" + Date.now().toString(36);
    const htmlContent = markdownToHtml(sanitizedMd);
    const readingTime = estimateReadingTime(sanitizedMd);
    const category = parsed.category && BLOG_CATEGORIES.includes(parsed.category) ? parsed.category : detectedCategory;

    return {
      slug,
      title: sanitizedTitle,
      metaTitle: sanitizeContent(parsed.metaTitle || sanitizedTitle + " | Learnpro AI"),
      metaDescription: sanitizeContent(parsed.metaDescription || parsed.excerpt || ""),
      excerpt: sanitizeContent(parsed.excerpt || ""),
      content: sanitizedMd,
      htmlContent,
      category,
      tags: parsed.tags || [],
      coverImageAlt: parsed.coverImageAlt || parsed.title,
      readingTimeMinutes: readingTime,
      published: true,
      featured: false,
      sourceUrl: article.url,
      publishedAt: new Date(),
    };
  } catch (e) {
    console.error(`[Scraper] Failed to rewrite "${article.title}":`, (e as Error).message);
    return null;
  }
}

async function generateCoverImage(title: string, slug: string): Promise<string | null> {
  try {
    const colorSchemes = [
      "deep royal blue (#1e3a8a) to teal (#0d9488) gradient",
      "rich indigo (#4338ca) to vibrant magenta (#c026d3) gradient",
      "emerald green (#047857) to cyan (#06b6d4) gradient",
      "warm crimson (#dc2626) to amber gold (#f59e0b) gradient",
      "deep purple (#7c3aed) to ocean blue (#2563eb) gradient",
      "forest green (#15803d) to lime (#84cc16) gradient",
      "slate blue (#3b82f6) to rose (#f43f5e) gradient",
      "burnt orange (#ea580c) to deep red (#b91c1c) gradient",
    ];
    const scheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

    const prompt = `Create a PREMIUM, ELEGANT cover image for an educational article. 
TITLE TO DISPLAY: "${title}"
DESIGN: Rich ${scheme} background with subtle geometric patterns. Title in large, elegant white typography centered. Small "Learnpro AI" watermark bottom-right. Professional, premium feel. Landscape 16:9. No clipart or cartoons.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((part: any) => part.inlineData);
    if (!imagePart?.inlineData?.data) return null;

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const ext = mimeType.includes("jpeg") ? "jpg" : "png";

    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) return null;

    const objectPath = `public/blog/${slug}.${ext}`;
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectPath);
    await file.save(imageBuffer, {
      contentType: mimeType,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    return `/api/blog/images/${slug}.${ext}`;
  } catch (e) {
    console.error(`[Scraper] Cover image failed for "${title}":`, (e as Error).message);
    return null;
  }
}

let isScraping = false;

export async function runContentScrapeAndPublish(maxPerSource: number = 3): Promise<number> {
  if (isScraping) {
    console.log("[Scraper] Already running, skipping...");
    return 0;
  }

  isScraping = true;
  let published = 0;

  try {
    const allArticles = await scrapeAllSources();
    if (allArticles.length === 0) {
      console.log("[Scraper] No articles found from any source");
      return 0;
    }

    const existingUrls = await db
      .select({ sourceUrl: blogPosts.sourceUrl })
      .from(blogPosts)
      .where(sql`${blogPosts.sourceUrl} IS NOT NULL`);
    const existingUrlSet = new Set(existingUrls.map(e => e.sourceUrl));

    const newArticles = allArticles.filter(a => !existingUrlSet.has(a.url));
    console.log(`[Scraper] ${newArticles.length} new articles after dedup (${allArticles.length} total scraped)`);

    const sourceCounts: Record<string, number> = {};
    const articlesToProcess: ScrapedArticle[] = [];

    for (const article of newArticles) {
      const count = sourceCounts[article.source] || 0;
      if (count < maxPerSource) {
        articlesToProcess.push(article);
        sourceCounts[article.source] = count + 1;
      }
    }

    console.log(`[Scraper] Processing ${articlesToProcess.length} articles for rewriting...`);

    for (const article of articlesToProcess) {
      try {
        console.log(`[Scraper] Rewriting: "${article.title}" (from ${article.source})`);
        const post = await rewriteArticleWithAI(article);
        if (!post) continue;

        const imageUrl = await generateCoverImage(post.title, post.slug);
        if (imageUrl) {
          post.coverImageUrl = imageUrl;
        }

        await db.insert(blogPosts).values(post);
        published++;
        console.log(`[Scraper] Published: "${post.title}"`);

        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        console.error(`[Scraper] Failed to process "${article.title}":`, (e as Error).message);
      }
    }
  } catch (e) {
    console.error("[Scraper] Critical error:", e);
  } finally {
    isScraping = false;
  }

  console.log(`[Scraper] Complete: ${published} new articles published`);
  return published;
}

export function scheduleDailyScraping() {
  const SCRAPE_HOURS = [6, 14, 20];

  function scheduleNext() {
    const now = new Date();
    let nextRun: Date | null = null;

    for (const hour of SCRAPE_HOURS) {
      const candidate = new Date();
      candidate.setHours(hour, 0, 0, 0);
      if (candidate > now && (!nextRun || candidate < nextRun)) {
        nextRun = candidate;
      }
    }

    if (!nextRun) {
      nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(SCRAPE_HOURS[0], 0, 0, 0);
    }

    const delay = nextRun.getTime() - now.getTime();
    console.log(`[Scraper] Next auto-scrape at ${nextRun.toISOString()} (in ${Math.round(delay / 3600000)}h)`);

    setTimeout(async () => {
      try {
        console.log("[Scraper] Starting scheduled scrape...");
        const count = await runContentScrapeAndPublish(3);
        console.log(`[Scraper] Scheduled scrape complete: ${count} articles published`);
      } catch (e) {
        console.error("[Scraper] Scheduled scrape failed:", e);
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}
