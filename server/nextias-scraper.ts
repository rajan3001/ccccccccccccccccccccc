import * as cheerio from "cheerio";

export interface NextIASArticle {
  title: string;
  url: string;
  slug: string;
  summary: string;
  gsCategory: string;
  category: string;
  source: string;
  fullContent: string;
  pageNumber: number | null;
}

const GS_CATEGORY_MAP: Record<string, string> = {
  "gs1": "GS-I",
  "gs2": "GS-II",
  "gs3": "GS-III",
  "gs4": "GS-IV",
};

const CATEGORY_MAP: Record<string, { category: string; pageNumber: number }> = {
  "polity": { category: "Polity & Governance", pageNumber: 8 },
  "governance": { category: "Polity & Governance", pageNumber: 8 },
  "economy": { category: "Economy", pageNumber: 12 },
  "science": { category: "Science & Tech", pageNumber: 11 },
  "technology": { category: "Science & Tech", pageNumber: 11 },
  "environment": { category: "Environment", pageNumber: 11 },
  "ecology": { category: "Environment", pageNumber: 11 },
  "biodiversity": { category: "Environment", pageNumber: 11 },
  "international": { category: "International", pageNumber: 10 },
  "ir": { category: "International", pageNumber: 10 },
  "history": { category: "National", pageNumber: 2 },
  "culture": { category: "Sports & Culture", pageNumber: 15 },
  "art": { category: "Sports & Culture", pageNumber: 15 },
  "society": { category: "Social Issues", pageNumber: 7 },
  "social": { category: "Social Issues", pageNumber: 7 },
  "defence": { category: "National", pageNumber: 2 },
  "security": { category: "National", pageNumber: 2 },
  "geography": { category: "Environment", pageNumber: 11 },
  "disaster": { category: "Environment", pageNumber: 11 },
  "ethics": { category: "Polity & Governance", pageNumber: 8 },
  "cyber": { category: "Science & Tech", pageNumber: 11 },
  "mineral": { category: "Economy", pageNumber: 12 },
  "energy": { category: "Economy", pageNumber: 12 },
  "agriculture": { category: "Economy", pageNumber: 12 },
};

function parseGsSyllabus(syllabusText: string): { gsCategory: string; category: string; pageNumber: number } {
  const lower = syllabusText.toLowerCase();

  let gsCategory = "Prelims";
  for (const [key, value] of Object.entries(GS_CATEGORY_MAP)) {
    if (lower.includes(key)) {
      gsCategory = value;
      break;
    }
  }

  let category = "National";
  let pageNumber = 2;
  for (const [key, mapping] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) {
      category = mapping.category;
      pageNumber = mapping.pageNumber;
      break;
    }
  }

  return { gsCategory, category, pageNumber };
}

function parseSourceName(sourceText: string): string {
  const lower = sourceText.toLowerCase().trim();
  if (lower.includes("thehindu") || lower.includes("the hindu") || lower.includes("hindu")) return "The Hindu";
  if (lower.includes("indianexpress") || lower.includes("indian express") || lower.includes("/ie")) return "Indian Express";
  if (lower.includes("livemint") || lower.includes("mint")) return "Livemint";
  if (lower.includes("pib")) return "PIB";
  if (lower.includes("bbc")) return "BBC";
  if (lower.includes("reuters")) return "Reuters";
  if (lower.includes("economictimes") || lower.includes("economic times")) return "Economic Times";
  if (lower.includes("ndtv")) return "NDTV";
  if (lower.includes("business-standard") || lower.includes("business standard")) return "Business Standard";
  if (lower.includes("hindustantimes") || lower.includes("hindustan times")) return "Hindustan Times";
  if (lower.includes("downtoearth") || lower.includes("down to earth")) return "Down To Earth";
  return "The Hindu";
}

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

function extractArticleLinksFromListing(html: string, dateStr: string): { title: string; url: string; slug: string }[] {
  const $ = cheerio.load(html);
  const articles: { title: string; url: string; slug: string }[] = [];

  const seenSlugs = new Set<string>();

  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const ddmmyyyy = dateStr;

    if (href.includes(`/ca/current-affairs/${ddmmyyyy}/`) && !href.endsWith(`/${ddmmyyyy}`) && !href.endsWith(`/${ddmmyyyy}/`)) {
      const slugMatch = href.match(/\/([^/]+)\/?$/);
      const slug = slugMatch ? slugMatch[1] : "";

      if (seenSlugs.has(slug)) return;

      let title = $(el).find("h2, h3").first().text().trim() || $(el).text().trim();
      title = title.replace(/\s+/g, " ").trim();

      if (!title || title.length < 5) return;
      if (title.toLowerCase() === "read more") return;
      if (title.toLowerCase().includes("load more")) return;

      let fullUrl = href.trim();
      if (!fullUrl.startsWith("http")) {
        fullUrl = `https://www.nextias.com${fullUrl}`;
      }

      seenSlugs.add(slug);
      articles.push({ title, url: fullUrl, slug });
    }
  });

  return articles;
}

function extractArticleContent(html: string): { summary: string; syllabusTag: string; source: string; fullContent: string } {
  const $ = cheerio.load(html);

  let syllabusTag = "";
  const bodyText = $("body").text();
  const syllabusMatch = bodyText.match(/Syllabus\s*:\s*([^\n]+)/i) || bodyText.match(/Syllabus\s*([^\n]+)/i);
  if (syllabusMatch) {
    syllabusTag = syllabusMatch[1].trim();
  }

  let summary = "";
  const inNewsHeader = $("h2:contains('In News'), h3:contains('In News'), strong:contains('In News'), b:contains('In News')").first();
  if (inNewsHeader.length) {
    const nextElements: string[] = [];
    let current = inNewsHeader.closest("h2, h3, p, div, li").length ? inNewsHeader.closest("h2, h3, p, div, li") : inNewsHeader;
    let sibling = current.next();
    let count = 0;
    while (sibling.length && count < 3) {
      const text = sibling.text().trim();
      if (text && !text.startsWith("Syllabus") && sibling.prop("tagName") !== "H2" && sibling.prop("tagName") !== "H3") {
        nextElements.push(text);
        count++;
      }
      if (sibling.prop("tagName") === "H2" || sibling.prop("tagName") === "H3") break;
      sibling = sibling.next();
    }
    summary = nextElements.join(" ").substring(0, 500);
  }

  const contextHeader = $("h2:contains('Context'), h3:contains('Context'), strong:contains('Context'), b:contains('Context')").first();
  if (!summary && contextHeader.length) {
    let current = contextHeader.closest("h2, h3, p, div, li").length ? contextHeader.closest("h2, h3, p, div, li") : contextHeader;
    let sibling = current.next();
    const nextElements: string[] = [];
    let count = 0;
    while (sibling.length && count < 3) {
      const text = sibling.text().trim();
      if (text && !text.startsWith("Syllabus") && sibling.prop("tagName") !== "H2" && sibling.prop("tagName") !== "H3") {
        nextElements.push(text);
        count++;
      }
      if (sibling.prop("tagName") === "H2" || sibling.prop("tagName") === "H3") break;
      sibling = sibling.next();
    }
    summary = nextElements.join(" ").substring(0, 500);
  }

  if (!summary) {
    $("p, li").each((_i, el) => {
      if (summary) return;
      const text = $(el).text().trim();
      if (text.length > 50 && !text.startsWith("Syllabus") && !text.includes("Read More") && !text.includes("Load More")) {
        summary = text.substring(0, 500);
      }
    });
  }

  let source = "The Hindu";
  const sourceEl = $("a[href]:contains('Source'), p:contains('Source'), div:contains('Source :'), div:contains('Source:')").last();
  if (sourceEl.length) {
    const sourceLink = sourceEl.find("a[href]").first();
    if (sourceLink.length) {
      const href = sourceLink.attr("href") || "";
      source = parseSourceName(href);
    } else {
      const sourceText = sourceEl.text();
      const sourceMatch = sourceText.match(/Source\s*:\s*\[?\s*(\w+)/i);
      if (sourceMatch) {
        source = parseSourceName(sourceMatch[1]);
      }
    }
  }

  let fullContent = "";
  const mainContent = $("article, .blog-content, .content-area, main").first();
  if (mainContent.length) {
    fullContent = mainContent.text().trim().substring(0, 3000);
  } else {
    const paragraphs: string[] = [];
    $("p").each((_i, el) => {
      const text = $(el).text().trim();
      if (text.length > 30 && !text.includes("Subscribe") && !text.includes("Join the newsletter")) {
        paragraphs.push(text);
      }
    });
    fullContent = paragraphs.join("\n\n").substring(0, 3000);
  }

  return { summary, syllabusTag, source, fullContent };
}

export async function scrapeNextIAS(dateStr: string): Promise<NextIASArticle[]> {
  const ddmmyyyy = dateStr.split("-").reverse().join("-");

  console.log(`[NextIAS Scraper] Fetching daily listing for ${ddmmyyyy}...`);
  const listingUrl = `https://www.nextias.com/ca/current-affairs/${ddmmyyyy}`;
  const listingHtml = await fetchPage(listingUrl);
  const articleLinks = extractArticleLinksFromListing(listingHtml, ddmmyyyy);

  console.log(`[NextIAS Scraper] Found ${articleLinks.length} article links`);

  if (articleLinks.length === 0) {
    throw new Error(`No articles found for date ${ddmmyyyy}`);
  }

  const articles: NextIASArticle[] = [];

  for (const link of articleLinks) {
    try {
      if (link.slug.startsWith("news-in-short")) {
        continue;
      }

      console.log(`[NextIAS Scraper] Fetching article: ${link.title.substring(0, 60)}...`);
      const articleHtml = await fetchPage(link.url);
      const { summary, syllabusTag, source, fullContent } = extractArticleContent(articleHtml);
      const { gsCategory, category, pageNumber } = parseGsSyllabus(syllabusTag);

      articles.push({
        title: link.title,
        url: link.url,
        slug: link.slug,
        summary: summary || `${link.title} - Read more for detailed analysis.`,
        gsCategory,
        category,
        source,
        fullContent,
        pageNumber,
      });

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err: any) {
      console.warn(`[NextIAS Scraper] Failed to fetch article "${link.title}": ${err.message}`);
    }
  }

  console.log(`[NextIAS Scraper] Successfully scraped ${articles.length} articles`);
  return articles;
}
