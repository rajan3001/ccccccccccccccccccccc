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

function cleanTitle(title: string): string {
  let t = title.replace(/\s+/g, " ").trim();
  t = t.replace(/\s*\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\s*$/i, "");
  t = t.replace(/\s*-\s*(Drishti|Vajiram|Vision|Adda|PW|StudyIQ|NextIAS|SPM).*$/i, "");
  t = t.replace(/\s*\|\s*.*$/, "");
  return t.trim();
}

const STALE_TITLE_PATTERNS = [
  /upsc\s+syllabus/i, /upsc\s+exam\s+date/i, /upsc\s+exam\s+calendar/i,
  /upsc\s+eligibility/i, /upsc\s+age\s+limit/i, /upsc\s+notification/i,
  /upsc\s+admit\s+card/i, /upsc\s+result/i, /upsc\s+cut\s*off/i,
  /upsc\s+topper/i, /upsc\s+books/i, /upsc\s+coaching/i,
  /best\s+books/i, /how\s+to\s+prepare/i, /preparation\s+strategy/i,
  /preparation\s+tips/i, /study\s+material/i, /study\s+plan/i,
  /mock\s+test/i, /test\s+series/i, /previous\s+year/i,
  /answer\s+key/i, /salary\s+(of|for)/i, /optional\s+subject/i,
  /selection\s+process/i, /apply\s+online/i, /registration/i,
  /admit\s+card/i, /recruitment/i, /vacancy/i, /job\s+profile/i,
  /^start\s+now/i, /^home$/i, /^login/i, /^sign\s*up/i,
  /^about\s+us/i, /^contact/i, /^faq/i, /^privacy/i, /^terms/i,
  /in\s+hindi/i, /हिंदी/i, /सिलेबस/i, /परीक्षा/i, /[\u0900-\u097F]/,
  /^\d{4}\s+(upsc|ias|prelims|mains)/i,
  /^upsc\s+(prelims|mains)\s+\d{4}$/i,
];

const STALE_URL_PATTERNS = [
  /syllabus/i, /eligibility/i, /age-limit/i, /admit-card/i,
  /answer-key/i, /cut-off/i, /notification/i, /salary/i,
  /topper/i, /books/i, /coaching/i, /optional-subject/i,
  /how-to-prepare/i, /preparation-tips/i, /study-plan/i,
  /recruitment/i, /vacancy/i, /apply-online/i, /registration/i,
  /job-profile/i, /selection-process/i, /mock-test/i, /test-series/i,
  /exam-pattern/i, /exam-date/i, /exam-calendar/i, /result/i,
];

function isStaleOrIrrelevant(title: string, url: string): boolean {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  if (normalizedTitle.length < 15) return true;
  if (normalizedTitle.length > 200) return true;
  for (const pat of STALE_TITLE_PATTERNS) {
    if (pat.test(normalizedTitle)) return true;
  }
  for (const pat of STALE_URL_PATTERNS) {
    if (pat.test(url)) return true;
  }
  const yearMatch = normalizedTitle.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 1) return true;
  }
  return false;
}

async function scrapeDrishtiIAS(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.drishtiias.com/daily-updates/daily-news-editorials", cat: "current-affairs" },
    { url: "https://www.drishtiias.com/daily-updates/daily-news-analysis", cat: "current-affairs" },
    { url: "https://www.drishtiias.com/to-the-points", cat: "general" },
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
            (href.includes("daily-news") || href.includes("daily-updates") || href.includes("to-the-points"))) {
          const fullUrl = href.startsWith("http") ? href : `https://www.drishtiias.com${href}`;
          if (!links.find(l => l.href === fullUrl) && !isStaleOrIrrelevant(title, fullUrl)) {
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
            title: cleanTitle(link.title),
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
    { url: "https://vajiramandravi.com/upsc-daily-current-affairs/", cat: "current-affairs" },
    { url: "https://vajiramandravi.com/quest-upsc-notes/", cat: "general" },
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
          if (!links.find(l => l.href === fullUrl) && fullUrl !== section.url && !isStaleOrIrrelevant(title, fullUrl)) {
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
            title: cleanTitle(link.title),
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
        if (href && title && title.length > 15 && title.length < 200) {
          const fullUrl = href.startsWith("http") ? href : `https://www.visionias.in${href.startsWith("/") ? "" : "/"}${href}`;
          if (!links.find(l => l.href === fullUrl) && fullUrl !== section.url &&
              !fullUrl.includes("login") && !fullUrl.includes("signup") && !fullUrl.includes("cart") &&
              !isStaleOrIrrelevant(title, fullUrl)) {
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
            title: cleanTitle(link.title),
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
    { url: "https://www.adda247.com/upsc-exam/upsc-current-affairs/", cat: "current-affairs" },
    { url: "https://www.adda247.com/upsc-exam/", cat: "upsc-strategy" },
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
            !href.includes("mock-test") && !href.includes("test-series") &&
            !href.includes("/jobs/") && !href.includes("government-jobs")) {
          if (!links.find(l => l.href === href) && href !== section.url && !isStaleOrIrrelevant(title, href)) {
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
            title: cleanTitle(link.title),
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

async function scrapePhysicsWallah(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.pw.live/exams/upsc/upsc-current-affairs/", cat: "current-affairs" },
    { url: "https://www.pw.live/exams/upsc/", cat: "upsc-strategy" },
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
        if (href && title && title.length > 15 && title.length < 200 &&
            href.includes("pw.live") && !href.includes("login") && !href.includes("signup") &&
            !href.includes("batch") && !href.includes("test-series")) {
          const fullUrl = href.startsWith("http") ? href : `https://www.pw.live${href}`;
          if (!links.find(l => l.href === fullUrl) && fullUrl !== section.url && !isStaleOrIrrelevant(title, fullUrl)) {
            links.push({ href: fullUrl, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar, .advertisement, .ad-container, .social-share").remove();

        let content = page$(".article-content, .entry-content, .post-content, article, main, .blog-content, #content-area").first().text();
        if (!content || content.length < 200) {
          content = page$("body").text();
        }
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: cleanTitle(link.title),
            content: content.substring(0, 8000),
            url: link.href,
            source: "pw",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] Physics Wallah error:`, (e as Error).message);
    }
  }
  return articles;
}

async function scrapeStudyIQ(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.studyiq.com/articles/current-affairs/", cat: "current-affairs" },
    { url: "https://www.studyiq.com/articles/upsc-articles/", cat: "upsc-strategy" },
    { url: "https://www.studyiq.com/articles/", cat: "general" },
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
        if (href && title && title.length > 15 && title.length < 200 &&
            href.includes("studyiq.com") && !href.includes("login") && !href.includes("signup") &&
            !href.includes("test-series") && !href.includes("course")) {
          if (!links.find(l => l.href === href) && href !== section.url && !isStaleOrIrrelevant(title, href)) {
            links.push({ href, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar, .advertisement, .ad-wrapper, .social-share, .related-post").remove();

        let content = page$(".entry-content, .post-content, article, .article-content, main, #content-area, .blog-content").first().text();
        if (!content || content.length < 200) {
          content = page$("body").text();
        }
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: cleanTitle(link.title),
            content: content.substring(0, 8000),
            url: link.href,
            source: "studyiq",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] StudyIQ error:`, (e as Error).message);
    }
  }
  return articles;
}

async function scrapeNextIAS(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];
  const sections = [
    { url: "https://www.nextias.com/current-affairs/daily-current-affairs/", cat: "current-affairs" },
    { url: "https://www.nextias.com/current-affairs/", cat: "current-affairs" },
    { url: "https://www.nextias.com/blog/", cat: "general" },
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
        if (href && title && title.length > 15 && title.length < 200 &&
            href.includes("nextias.com") && !href.includes("login") && !href.includes("signup") &&
            !href.includes("test-series") && !href.includes("course")) {
          const fullUrl = href.startsWith("http") ? href : `https://www.nextias.com${href}`;
          if (!links.find(l => l.href === fullUrl) && fullUrl !== section.url && !isStaleOrIrrelevant(title, fullUrl)) {
            links.push({ href: fullUrl, title });
          }
        }
      });

      for (const link of links.slice(0, 5)) {
        const pageHtml = await fetchHtml(link.href);
        if (!pageHtml) continue;
        const page$ = cheerio.load(pageHtml);
        page$("script, style, nav, header, footer, .sidebar, .advertisement, .ad-container, .social-share, .related-articles").remove();

        let content = page$(".entry-content, .post-content, article, .article-content, main, .content-area, .blog-content").first().text();
        if (!content || content.length < 200) {
          content = page$("body").text();
        }
        content = cleanText(content);
        if (content.length > 300) {
          articles.push({
            title: cleanTitle(link.title),
            content: content.substring(0, 8000),
            url: link.href,
            source: "nextias",
            category: section.cat,
          });
        }
      }
    } catch (e) {
      console.error(`[Scraper] NextIAS error:`, (e as Error).message);
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
          if (!links.find(l => l.href === href) && !isStaleOrIrrelevant(title, href)) {
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
            title: cleanTitle(link.title),
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
  console.log("[Scraper] Starting to scrape all 8 sources...");

  const results = await Promise.allSettled([
    scrapeDrishtiIAS(),
    scrapeVajiramandravi(),
    scrapeVisionIAS(),
    scrapeAdda247(),
    scrapeSPMIAS(),
    scrapePhysicsWallah(),
    scrapeStudyIQ(),
    scrapeNextIAS(),
  ]);

  const allArticles: ScrapedArticle[] = [];
  const sourceNames = ["Drishti IAS", "Vajiram & Ravi", "Vision IAS", "Adda247", "SPM IAS", "Physics Wallah", "StudyIQ", "NextIAS"];
  const BLOCKED_NAMES = ["drishti", "vajiram", "vision", "adda247", "spm", "pw", "studyiq", "nextias"];

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
  "nextias", "next ias", "forum ias", "pw", "physics wallah", "physicswallah",
  "studyiq", "study iq",
];

function sanitizeContent(text: string): string {
  let result = text;
  for (const name of BLOCKED_NAMES) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, "leading coaching experts");
  }
  result = result.replace(/https?:\/\/(www\.)?(drishtiias|vajiramandravi|visionias|adda247|spmiasacademy|byju|unacademy|testbook|pw\.live|studyiq|nextias)\.[a-z.]+[^\s)"]*/gi, "");
  return result;
}

async function rewriteArticleWithAI(article: ScrapedArticle): Promise<InsertBlogPost | null> {
  const detectedCategory = detectCategory(article.title, article.content);

  const existingPosts = await db
    .select({ title: blogPosts.title, slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.published, true))
    .limit(20);
  const internalLinks = existingPosts.map(p => `[${p.title}](/blog/${p.slug})`).slice(0, 10);

  const prompt = `You are rewriting a research note into a data-driven, rank-worthy article. Your goal: be BETTER than the top 5 Google results for this topic. Not just well-written — differentiated with data, trends, and analysis no coaching site provides.

RULES:
1. NEVER mention any coaching institute, website, academy, or source name
2. NEVER copy sentences — completely rewrite with NEW data and analysis added
3. Target ONE specific search intent — do NOT mix motivational + strategic + explanatory
4. Write ONLY in English. NEVER use Hindi, Hinglish, or any Indian language script. If the source material is in Hindi, translate concepts to English.

ORIGINAL TITLE: "${article.title}"
RESEARCH MATERIAL (rewrite completely, add data):
${article.content}

=== BANNED LANGUAGE ===
Never use: "comprehensive", "holistic", "strategic blueprint", "foundational pillars", "crucial cornerstone", "navigating", "decoding", "stands as a pinnacle", "gauntlet", "in-depth analysis", "multifaceted", "paradigm", "synergy", "pivotal", "indispensable", "plethora", "myriad", "delve into", "it is worth noting", "in today's world", "the landscape of", "embark on", "tapestry", "beacon", "robust", "leverage", "key takeaways", "furthermore", "in conclusion", "nuanced", "underscore", "paradigm shift", "comprehensive overview", "needless to say", "game changer", "cutting edge", "cornerstone", "linchpin", "overarching", "interplay", "facets", "intricacies", "demystify", "unpack", "deep dive", "shed light on", "pave the way", "bolster", "spearhead"
No "Moreover", "Furthermore", "Additionally" at sentence starts. NEVER title it "Complete Guide" or "Strategic Guide".

=== ANTI-HALLUCINATION (CRITICAL — YMYL CATEGORY) ===
UPSC content is YMYL. Fabricated data of ANY kind triggers Google penalties.

YOU ARE AN AI. YOU CANNOT LOOK UP REAL DATA. ACCEPT THIS LIMITATION.

ABSOLUTE BANS:
- NEVER invent specific prices, costs, or monetary figures
- NEVER invent percentages or statistics
- NEVER invent data and attribute it to real sources (e.g., "compiled from Ministry data" — you didn't compile anything)
- NEVER write "studies show", "research indicates" without naming the EXACT study
- NEVER create fake data tables with invented numbers
- NEVER add disclaimers like "indicative averages" to justify invented numbers

THE CORE RULE: If you did not retrieve a number from an actual database or document, DO NOT write it.

WHAT YOU CAN DO IN TABLES:
- Structural/comparative tables WITHOUT invented numbers: features, pros/cons, scheme names, article numbers, timelines
- Qualitative comparisons: scope, mandate, jurisdiction, applicability
- Factual items you KNOW: Constitutional articles, scheme launch years, SC judgment names, Lok Sabha seats (543), etc.
- Data from training knowledge you're confident about (well-known budget allocations, election years, etc.)

ANECDOTAL FRAMING FOR UNCERTAIN DATA:
BAD: "price spread reaches 247%"
GOOD: "Price spreads for perishables can multiply several times between farmgate and retail during seasonal gluts"

NEVER position any method/tool as universally superior. Present trade-offs honestly.

=== DATA REQUIREMENTS ===
You MUST include:
1. TWO tables — structural/comparative with QUALITATIVE analysis, scheme comparisons, or Constitutional provisions. NOT tables with invented price/percentage data.
2. Specific years where confident (scheme launches, amendment years)
3. ONE trend analysis based on KNOWN policy shifts (not invented numbers)
4. ONE comparison (A vs B with structured reasoning)
5. UPSC question references ONLY if certain — otherwise say "UPSC has repeatedly asked about [topic] in GS-X Mains"

=== INTERNAL LINKING ===
${internalLinks.length > 0 ? 'Include 2-3 links to related articles:\n' + internalLinks.join('\n') : 'No existing articles yet.'}

=== WRITING STYLE ===
1. Open with a specific number or data point. Never a definition.
2. Direct, opinionated voice. Take positions. Point out common mistakes.
3. Headings with numbers: "5-Year Trend", "3 Reasons Why", "State-Wise Breakdown"
4. Max 3-line paragraphs. Bold key terms. Dash (-) bullets only.
5. ## and ### headings only. Min 6 H2 sections.
6. End with ## FAQs — 5 questions people actually Google (### headings, 2-3 sentences)
7. Target 2000-2500 words, data-dense.

=== OUTPUT ===
Return ONLY a JSON object:
{
  "title": "Data-specific title under 60 chars with a number or specific claim",
  "metaTitle": "SEO title under 60 chars",
  "metaDescription": "150-char hook with data point",
  "excerpt": "2 sentences under 180 chars with specific insight",
  "content": "Full markdown. Data tables. Trends. Internal links. Direct voice.",
  "tags": ["5-7 tags"],
  "coverImageAlt": "Descriptive alt text",
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
    jsonStr = jsonStr.replace(/\r/g, "");

    const fixNewlinesInStrings = (s: string): string => {
      let inString = false;
      let escaped = false;
      let result = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escaped) { result += ch; escaped = false; continue; }
        if (ch === "\\") { result += ch; escaped = true; continue; }
        if (ch === '"') { inString = !inString; result += ch; continue; }
        if (ch === "\n" && inString) { result += "\\n"; continue; }
        if (ch === "\t" && inString) { result += "\\t"; continue; }
        result += ch;
      }
      return result;
    };
    jsonStr = fixNewlinesInStrings(jsonStr);
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
    const prompt = `Create a professional blog thumbnail image for an educational article about UPSC/Civil Services preparation.

ARTICLE TITLE: "${title}"

DESIGN REQUIREMENTS:
- Use a HIGH-QUALITY, REALISTIC photograph as the main background that is directly relevant to the article topic
- The photo should be vivid, sharp, and professional (like stock photography from Getty or Shutterstock)
- Overlay the article title "${title}" in LARGE, BOLD white text with a subtle dark shadow for readability
- Place a "Learnpro AI" brand text or logo badge in the top-center area with a clean white or light background behind it
- The title text should be the dominant visual element, taking up 40-60% of the image
- Use a slight dark gradient overlay on the photo to ensure text readability
- Landscape orientation (16:9 aspect ratio)
- Professional, authoritative look similar to top news/educational platform thumbnails
- DO NOT use illustrations, cartoons, or clip art — only real photographs`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((part: any) => part.inlineData);
    if (!imagePart?.inlineData?.data) return null;

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const base64Data = imagePart.inlineData.data;

    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (bucketId) {
      const imageBuffer = Buffer.from(base64Data, "base64");
      const ext = mimeType.includes("jpeg") ? "jpg" : "png";
      const objectPath = `public/blog/${slug}.${ext}`;
      const bucket = objectStorageClient.bucket(bucketId);
      const file = bucket.file(objectPath);
      await file.save(imageBuffer, {
        contentType: mimeType,
        metadata: { cacheControl: "public, max-age=31536000" },
      });
      return `/api/blog/images/${slug}.${ext}`;
    }

    return `data:${mimeType};base64,${base64Data}`;
  } catch (e) {
    console.error(`[Scraper] Cover image failed for "${title}":`, (e as Error).message);
    return null;
  }
}

let isScraping = false;

export async function runContentScrapeAndPublish(maxPerSource: number = 5): Promise<number> {
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

    const newArticles = allArticles.filter(a => !existingUrlSet.has(a.url) && !isStaleOrIrrelevant(a.title, a.url));
    console.log(`[Scraper] ${newArticles.length} new articles after dedup+filter (${allArticles.length} total scraped)`);

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

        await db.insert(blogPosts).values(post);
        published++;
        console.log(`[Scraper] Published: "${post.title}"`);

        generateCoverImage(post.title, post.slug).then(async (imageUrl) => {
          if (imageUrl) {
            try {
              await db.update(blogPosts).set({ coverImageUrl: imageUrl }).where(eq(blogPosts.slug, post.slug));
              console.log(`[Scraper] Cover image updated for: "${post.title}"`);
            } catch (e) {
              console.error(`[Scraper] Cover DB update failed:`, (e as Error).message);
            }
          }
        }).catch(e => console.error(`[Scraper] Cover image failed:`, (e as Error).message));

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
  const INTERVAL_MS = 90 * 60 * 1000;

  console.log(`[Scraper] Scheduling auto-scrape every 90 minutes (${INTERVAL_MS}ms)`);

  setInterval(async () => {
    try {
      console.log("[Scraper] Starting scheduled scrape...");
      const count = await runContentScrapeAndPublish(5);
      console.log(`[Scraper] Scheduled scrape complete: ${count} articles published`);
    } catch (e) {
      console.error("[Scraper] Scheduled scrape failed:", e);
    }
  }, INTERVAL_MS);
}
