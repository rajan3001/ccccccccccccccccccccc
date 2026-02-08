import * as cheerio from "cheerio";

export interface ScrapedArticle {
  title: string;
  url: string;
  summary: string;
  section: string;
  source: string;
  pageNumber: number;
}

const SECTION_PAGE_MAP: Record<string, { page: number; category: string }> = {
  "front-page": { page: 1, category: "National" },
  "national": { page: 2, category: "National" },
  "international": { page: 10, category: "International" },
  "editorial": { page: 8, category: "Polity & Governance" },
  "lead": { page: 9, category: "Polity & Governance" },
  "opinion": { page: 9, category: "Polity & Governance" },
  "business": { page: 12, category: "Economy" },
  "economy": { page: 12, category: "Economy" },
  "science": { page: 11, category: "Science & Tech" },
  "sci-tech": { page: 11, category: "Science & Tech" },
  "sport": { page: 14, category: "Sports & Culture" },
  "entertainment": { page: 15, category: "Sports & Culture" },
  "life-and-style": { page: 15, category: "Social Issues" },
  "society": { page: 7, category: "Social Issues" },
  "environment": { page: 11, category: "Environment" },
  "states": { page: 5, category: "National" },
  "cities": { page: 6, category: "National" },
};

const SECTIONS_TO_SCRAPE = [
  { path: "/news/national/", section: "national", label: "National" },
  { path: "/news/international/", section: "international", label: "International" },
  { path: "/opinion/editorial/", section: "editorial", label: "Editorial" },
  { path: "/opinion/lead/", section: "lead", label: "Lead / Op-Ed" },
  { path: "/business/", section: "business", label: "Business" },
  { path: "/sci-tech/", section: "sci-tech", label: "Science & Tech" },
  { path: "/sport/", section: "sport", label: "Sports" },
  { path: "/news/cities/", section: "cities", label: "Cities" },
  { path: "/news/states/", section: "states", label: "States" },
];

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

function extractArticlesFromSection(html: string, section: string): ScrapedArticle[] {
  const $ = cheerio.load(html);
  const articles: ScrapedArticle[] = [];
  const sectionInfo = SECTION_PAGE_MAP[section] || { page: 1, category: "National" };

  $("div.story-card, div.element, article, div.story-card-news, div[class*='story'], div.Other-StoryCard, div.latest-news, div.TopstoryCard").each((_i, el) => {
    const $el = $(el);
    const titleEl = $el.find("h2 a, h3 a, h2, h3, a.story-card-heading, a[class*='title']").first();
    let title = titleEl.text().trim();
    let url = titleEl.attr("href") || titleEl.find("a").attr("href") || "";

    if (!title || title.length < 10) return;

    if (url && !url.startsWith("http")) {
      url = `https://www.thehindu.com${url}`;
    }

    const summaryEl = $el.find("p, div.story-card-text, div[class*='description'], span[class*='summary']").first();
    let summary = summaryEl.text().trim();
    if (summary.length > 500) summary = summary.substring(0, 500) + "...";

    if (articles.some(a => a.title === title)) return;

    articles.push({
      title,
      url,
      summary: summary || "",
      section,
      source: "The Hindu",
      pageNumber: sectionInfo.page,
    });
  });

  return articles;
}

export async function scrapeTheHindu(): Promise<ScrapedArticle[]> {
  const allArticles: ScrapedArticle[] = [];
  const errors: string[] = [];

  for (const section of SECTIONS_TO_SCRAPE) {
    try {
      const url = `https://www.thehindu.com${section.path}`;
      const html = await fetchPage(url);
      const articles = extractArticlesFromSection(html, section.section);
      allArticles.push(...articles);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err: any) {
      errors.push(`${section.label}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.warn("Hindu scraper warnings:", errors);
  }

  const seen = new Set<string>();
  const unique = allArticles.filter(a => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

export function getSectionPageMap() {
  return SECTION_PAGE_MAP;
}
