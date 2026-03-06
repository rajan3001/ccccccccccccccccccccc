import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { ObjectStorageService } from "./replit_integrations/object_storage";
import { db } from "./db";
import {
  pyqQuestions, pyqAttempts, PYQ_TOPICS, PYQ_SUBTOPICS, PYQ_EXAM_STAGES,
  type PyqQuestion, type PyqMainsFeedback
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, inArray, count } from "drizzle-orm";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
      throw new Error("AI_INTEGRATIONS_GEMINI_API_KEY is not set.");
    }
    _ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
    });
  }
  return _ai;
}
const ai = new Proxy({} as GoogleGenAI, { get(_t, p) { return (getAI() as any)[p]; } });

const objectStorage = new ObjectStorageService();

const uploadTracker = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(sessionKey: string): boolean {
  const now = Date.now();
  const entry = uploadTracker.get(sessionKey);
  if (!entry || now > entry.resetAt) {
    uploadTracker.set(sessionKey, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function hashText(text: string): string {
  return createHash("sha256").update(normalizeText(text)).digest("hex").substring(0, 64);
}

function fixNewlinesInStrings(s: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = ch.charCodeAt(0);
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\") { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      if (code < 0x20 || code === 0x7F) { continue; }
    }
    result += ch;
  }
  return result;
}

function parseAIJson(text: string): any {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  cleaned = cleaned.replace(/\r\n/g, "\n");
  try {
    return JSON.parse(fixNewlinesInStrings(cleaned));
  } catch {
    try {
      const escaped = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
      return JSON.parse(fixNewlinesInStrings(escaped));
    } catch {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try { return JSON.parse(fixNewlinesInStrings(arrayMatch[0])); } catch {}
      }
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try { return JSON.parse(fixNewlinesInStrings(objMatch[0])); } catch {}
      }
      throw new Error("Failed to parse AI response as JSON");
    }
  }
}

function cleanExtractedText(text: string): string {
  let cleaned = text.replace(/\r\n/g, "\n");
  cleaned = cleaned.replace(/Page \d+ of \d+/gi, "");
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");
  cleaned = cleaned.replace(/www\.\S+/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  return cleaned.trim();
}

function chunkByQuestions(text: string, chunkSize: number = 12): string[][] {
  const parts = text.split(/(?=(?:^|\n)\s*(?:Q\.?\s*)?\d+[\.\)]\s)/m);
  const questions = parts.filter(p => /(?:^|\n)\s*(?:Q\.?\s*)?\d+[\.\)]\s/.test(p.trim()) && p.trim().length > 10);
  const chunks: string[][] = [];
  for (let i = 0; i < questions.length; i += chunkSize) {
    chunks.push(questions.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) {
    const charLimit = 8000;
    for (let i = 0; i < text.length; i += charLimit) {
      chunks.push([text.substring(i, i + charLimit)]);
    }
  }
  return chunks.length > 0 ? chunks : [[text]];
}

interface ExtractedQuestion {
  questionNumber: number;
  questionText: string;
  options: string[] | null;
  questionType: "mcq" | "mains";
  correctIndex: number | null;
  marks: number;
}

interface ValidationResult {
  valid: ExtractedQuestion[];
  rejected: { question: any; reasons: string[] }[];
}

function validateQuestions(questions: any[], examStage: string): ValidationResult {
  const valid: ExtractedQuestion[] = [];
  const rejected: { question: any; reasons: string[] }[] = [];

  for (const q of questions) {
    const reasons: string[] = [];

    if (!q.questionNumber && q.questionNumber !== 0) {
      if (typeof q.question_number === "number") q.questionNumber = q.question_number;
      else if (typeof q.qno === "number") q.questionNumber = q.qno;
    }
    if (!q.questionText && typeof q.question_text === "string") q.questionText = q.question_text;
    if (!q.questionText && typeof q.question === "string") q.questionText = q.question;
    if (!q.questionType && typeof q.question_type === "string") q.questionType = q.question_type;

    if (!q.questionNumber || q.questionNumber < 1) reasons.push("Invalid questionNumber");
    if (!q.questionText || q.questionText.length < 15) reasons.push("questionText too short (< 15 chars)");

    const defaultMarks = examStage === "Prelims" ? 2 : 10;
    if (!q.marks || q.marks < 1) q.marks = defaultMarks;

    if (examStage === "Prelims" || q.questionType === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        reasons.push("MCQ must have 2-6 options");
      } else {
        q.options = q.options.filter((o: any) => typeof o === "string" && o.trim() !== "");
        if (q.options.length < 2) reasons.push("MCQ must have at least 2 non-empty options");
        while (q.options.length < 4) q.options.push("(option not available)");
      }
      if (q.correctIndex !== null && q.correctIndex !== undefined) {
        const maxIdx = Array.isArray(q.options) ? q.options.length - 1 : 3;
        if (q.correctIndex < 0 || q.correctIndex > maxIdx) {
          q.correctIndex = null;
        }
      }
    }

    if (examStage === "Mains" && q.questionType !== "mcq") {
      if (q.options && q.options !== null) {
        q.options = null;
      }
    }

    if (reasons.length === 0) {
      valid.push({
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options ? q.options.slice(0, 4) : null,
        questionType: examStage === "Prelims" ? "mcq" : (q.questionType || "mains"),
        correctIndex: q.correctIndex ?? null,
        marks: q.marks,
      });
    } else {
      rejected.push({ question: q, reasons });
    }
  }
  return { valid, rejected };
}

export async function pyqIngestCore(params: {
  fileObjectPath: string; examType: string; examStage: string; year: string; paperType: string;
  onProgress?: (msg: string) => void;
  isCancelled?: () => boolean;
}): Promise<any> {
  const { fileObjectPath, examType, examStage, year, paperType, onProgress, isCancelled } = params;
  const report = onProgress || (() => {});
  const checkCancel = () => { if (isCancelled?.()) throw new Error("Job cancelled by user"); };

  if (!fileObjectPath || !examType || !examStage || !year || !paperType) {
    throw Object.assign(new Error("Missing required fields"), { statusCode: 400 });
  }
  if (!PYQ_EXAM_STAGES.includes(examStage)) {
    throw Object.assign(new Error("examStage must be 'Prelims' or 'Mains'"), { statusCode: 400 });
  }

  report("Reading PDF file...");
  let fileData: Buffer;
  const localUploadsDir = path.resolve(process.cwd(), ".uploads");
  const localFileName = fileObjectPath.replace(/^\/objects\/uploads\//, "");
  const localFilePath = path.join(localUploadsDir, localFileName);

  if (fs.existsSync(localFilePath)) {
    fileData = fs.readFileSync(localFilePath);
  } else {
    try {
      const file = await objectStorage.getObjectEntityFile(fileObjectPath);
      const [downloaded] = await file.download();
      fileData = downloaded;
    } catch (e) {
      throw Object.assign(new Error("File not found. Please re-upload the PDF."), { statusCode: 404 });
    }
  }

  report("Extracting text from PDF...");
  let extractedText = "";
  try {
    const pdfMod = await import("pdf-parse");
    const PDFParseClass = pdfMod.PDFParse || pdfMod.default;
    if (PDFParseClass) {
      try {
        const parser = new PDFParseClass(fileData);
        const pdfResult = await parser.parse();
        extractedText = pdfResult.text || "";
      } catch {
        const pdfResult = await PDFParseClass(fileData);
        extractedText = (pdfResult?.text || pdfResult) as string;
      }
    }
  } catch (e) {
    console.log("pdf-parse failed, will use Gemini OCR:", e);
  }

  if (extractedText.length < 500) {
    report("Using Gemini OCR for text extraction...");
    console.log("Text too short or extraction failed, using Gemini OCR...");
    for (let ocrAttempt = 0; ocrAttempt < 2; ocrAttempt++) {
      try {
        if (ocrAttempt > 0) {
          report("Retrying OCR extraction...");
          await new Promise(r => setTimeout(r, 3000));
        }
        const ocrResult = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              { text: "Extract ALL text from this PDF exactly as written. Preserve EVERY question number, EVERY option, and ALL formatting. Do NOT skip any content. Return only the extracted text, no commentary." },
              { inlineData: { mimeType: "application/pdf", data: fileData.toString("base64") } },
            ],
          }],
          config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0 },
        });
        const ocrText = (ocrResult.text || "").trim();
        if (ocrText.length > extractedText.length) extractedText = ocrText;
        if (extractedText.length >= 500) break;
      } catch (e: any) {
        console.error("OCR attempt " + (ocrAttempt + 1) + " failed:", e.message);
      }
    }
  }

  extractedText = cleanExtractedText(extractedText);

  if (extractedText.length < 100) {
    throw Object.assign(new Error("Could not extract sufficient text from PDF"), { statusCode: 400 });
  }

  checkCancel();
  report("Splitting into chunks for AI processing...");
  const chunks = chunkByQuestions(extractedText, 12);
  let allExtracted: ExtractedQuestion[] = [];
  const errors: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    checkCancel();
    const chunkText = chunks[i].join("\n\n");
    const structurePrompt = `You are extracting questions from an official ${examStage} exam paper (${examType} ${year} ${paperType}).
CRITICAL: You MUST extract EVERY SINGLE question from this text. Do NOT skip any question. Missing even one question is unacceptable.
Return ONLY a raw JSON array. No markdown, no explanation, no wrapping.
Schema per question:
{ "questionNumber": number, "questionText": string, "options": [string,string,string,string] | null, "questionType": "mcq" | "mains", "correctIndex": 0-3 | null, "marks": number }
Rules:
- Extract ALL questions — do not skip any, even if poorly formatted or partially visible
- Preserve original question wording exactly — do not paraphrase
- Include the full question text including any statements, data, or context that precedes the actual question
- Do not merge or split questions
- Do not hallucinate or guess answers — if unsure about correctIndex, use null
- If marks are not specified, default to ${examStage === "Prelims" ? "2" : "10"}
- ${examStage === "Prelims" ? 'questionType must be "mcq", options must be exactly 4 strings, marks default 2' : 'questionType must be "mains", options must be null, marks as stated or default 10'}

Text to extract from:
${chunkText}`;

    report(`Extracting questions (chunk ${i + 1}/${chunks.length})...`);
    let chunkSuccess = false;
    for (let attempt = 0; attempt < 3 && !chunkSuccess; attempt++) {
      try {
        if (attempt > 0) {
          report(`Retrying chunk ${i + 1}/${chunks.length} (attempt ${attempt + 1}/3)...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: structurePrompt }] }],
          config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0 },
        });
        const parsed = parseAIJson(result.text || "");
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        allExtracted.push(...arr);
        chunkSuccess = true;
      } catch (e: any) {
        if (attempt === 2) {
          errors.push(`Chunk ${i + 1} FAILED after 3 attempts: ${e.message}`);
        }
      }
    }
  }

  const seenNumbers = new Set(allExtracted.map(q => q.questionNumber).filter(Boolean));
  const maxQ = Math.max(0, ...seenNumbers);
  const missingNums: number[] = [];
  for (let n = 1; n <= maxQ; n++) {
    if (!seenNumbers.has(n)) missingNums.push(n);
  }
  if (missingNums.length > 0 && missingNums.length <= 20) {
    report(`Detected ${missingNums.length} missing questions (${missingNums.join(",")}), attempting recovery...`);
    const recoveryPrompt = `The following question numbers are missing from a ${examStage} paper (${examType} ${year} ${paperType}): ${missingNums.join(", ")}
Search the text below carefully and extract ONLY the missing questions.
Return a raw JSON array with the same schema:
{ "questionNumber": number, "questionText": string, "options": [string,string,string,string] | null, "questionType": "${examStage === "Prelims" ? "mcq" : "mains"}", "correctIndex": 0-3 | null, "marks": number }
If a question truly does not exist in the text, do not fabricate it.

Full text:
${extractedText.substring(0, 30000)}`;
    try {
      const recoveryResult = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: recoveryPrompt }] }],
        config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0 },
      });
      const recovered = parseAIJson(recoveryResult.text || "");
      const recoveredArr = Array.isArray(recovered) ? recovered : [recovered];
      const newOnes = recoveredArr.filter((q: any) => q.questionNumber && !seenNumbers.has(q.questionNumber));
      if (newOnes.length > 0) {
        allExtracted.push(...newOnes);
        report(`Recovered ${newOnes.length} missing questions!`);
      }
    } catch (e: any) {
      errors.push(`Recovery pass failed: ${e.message}`);
    }
  }

  report(`Validating ${allExtracted.length} extracted questions...`);
  const { valid, rejected } = validateQuestions(allExtracted, examStage);

  let classified: { questionNumber: number; topic: string; subTopic: string | null; difficulty: string }[] = [];
  if (valid.length > 0) {
    report(`Classifying ${valid.length} questions by topic & difficulty...`);
    const topicList = PYQ_TOPICS.filter(t => t !== "Unclassified").join(", ");
    const subTopicInfo = Object.entries(PYQ_SUBTOPICS)
      .filter(([k]) => k !== "Unclassified")
      .map(([k, v]) => `${k}: [${v.join(", ")}]`)
      .join("\n");

    const classifyPrompt = `Classify each question. You MUST choose from the provided lists ONLY.
Topics: [${topicList}]
SubTopics by Topic:
${subTopicInfo}
If uncertain, use topic: "Unclassified", subTopic: null
Also classify difficulty: "Easy", "Moderate", or "Hard" based on concept depth and analytical requirement.
Return ONLY a raw JSON array: [{ "questionNumber": number, "topic": string, "subTopic": string|null, "difficulty": string }]

Questions:
${valid.map(q => `Q${q.questionNumber}: ${q.questionText.substring(0, 200)}`).join("\n")}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        const classResult = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: classifyPrompt }] }],
          config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0 },
        });
        classified = parseAIJson(classResult.text || "");
        if (!Array.isArray(classified)) classified = [];
        break;
      } catch (e: any) {
        if (attempt === 1) errors.push(`Classification failed after 2 attempts: ${e.message}`);
      }
    }
  }

  const classMap = new Map(classified.map(c => [c.questionNumber, c]));

  checkCancel();
  report(`Inserting ${valid.length} questions into database...`);
  let inserted = 0;
  let skipped = 0;

  for (const q of valid) {
    checkCancel();
    const cls = classMap.get(q.questionNumber);
    const topic = cls?.topic && (PYQ_TOPICS as readonly string[]).includes(cls.topic) ? cls.topic : "Unclassified";
    const subTopic = cls?.subTopic && PYQ_SUBTOPICS[topic]?.includes(cls.subTopic) ? cls.subTopic : null;
    const difficulty = cls?.difficulty && ["Easy", "Moderate", "Hard"].includes(cls.difficulty) ? cls.difficulty : null;
    const tHash = hashText(q.questionText);

    const existing = await db.select({ id: pyqQuestions.id })
      .from(pyqQuestions)
      .where(
        or(
          and(
            eq(pyqQuestions.examType, examType),
            eq(pyqQuestions.examStage, examStage),
            eq(pyqQuestions.year, Number(year)),
            eq(pyqQuestions.paperType, paperType),
            eq(pyqQuestions.questionNumber, q.questionNumber)
          ),
          eq(pyqQuestions.textHash, tHash)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      await db.insert(pyqQuestions).values({
        examType,
        examStage,
        year: Number(year),
        paperType,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctIndex: q.correctIndex,
        marks: q.marks,
        topic,
        subTopic,
        difficulty,
        textHash: tHash,
      });
      inserted++;
    } catch (e: any) {
      if (e.code === "23505") {
        skipped++;
      } else {
        errors.push(`Insert Q${q.questionNumber}: ${e.message}`);
      }
    }
  }

  return {
    totalExtracted: allExtracted.length,
    validated: valid.length,
    inserted,
    skipped,
    rejected: rejected.length,
    rejectedDetails: rejected.map(r => ({
      questionNumber: r.question?.questionNumber,
      text: r.question?.questionText?.substring(0, 100),
      reasons: r.reasons,
    })),
    errors,
  };
}

export function registerPyqRoutes(app: Express): void {

  const adminOrAuth = (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
      const [user, pass] = decoded.split(":");
      const ADMIN_USER = process.env.ADMIN_USER || "admin";
      const ADMIN_PASS = process.env.ADMIN_PASS || "admin@learnpro2026";
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        req.user = { claims: { sub: "admin" }, dbUser: { isAdmin: true } };
        return next();
      }
    }
    return isAuthenticated(req, res, next);
  };

  app.post("/api/pyq/ingest", adminOrAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const isAdmin = req.user?.dbUser?.isAdmin === true;
      if (!isAdmin) return res.status(403).json({ error: "Admin only" });

      if (!checkRateLimit(userId)) {
        return res.status(429).json({ error: "Rate limit exceeded. Max 5 uploads per hour." });
      }

      const result = await pyqIngestCore(req.body);
      res.json(result);
    } catch (error: any) {
      console.error("PYQ ingest error:", error);
      res.status(error.statusCode || 500).json({ error: error.message || "Failed to process PDF" });
    }
  });

  app.post("/api/pyq/bulk-import", isAuthenticated, async (req: any, res: Response) => {
    try {
      const isAdmin = req.user?.dbUser?.isAdmin === true;
      if (!isAdmin) return res.status(403).json({ error: "Admin only" });

      const { questions } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Provide a non-empty 'questions' array" });
      }

      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const q of questions) {
        if (!q.examType || !q.examStage || !q.year || !q.paperType || !q.questionNumber || !q.questionText || !q.questionType) {
          errors.push(`Q${q.questionNumber || "?"}: Missing required fields`);
          continue;
        }

        const tHash = hashText(q.questionText);
        const existing = await db.select({ id: pyqQuestions.id })
          .from(pyqQuestions)
          .where(
            or(
              and(
                eq(pyqQuestions.examType, q.examType),
                eq(pyqQuestions.examStage, q.examStage),
                eq(pyqQuestions.year, Number(q.year)),
                eq(pyqQuestions.paperType, q.paperType),
                eq(pyqQuestions.questionNumber, q.questionNumber)
              ),
              eq(pyqQuestions.textHash, tHash)
            )
          )
          .limit(1);

        if (existing.length > 0) { skipped++; continue; }

        const topic = q.topic && (PYQ_TOPICS as readonly string[]).includes(q.topic) ? q.topic : "Unclassified";
        const subTopic = q.subTopic && PYQ_SUBTOPICS[topic]?.includes(q.subTopic) ? q.subTopic : null;

        try {
          await db.insert(pyqQuestions).values({
            examType: q.examType,
            examStage: q.examStage,
            year: Number(q.year),
            paperType: q.paperType,
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || null,
            correctIndex: q.correctIndex ?? null,
            marks: q.marks || (q.examStage === "Prelims" ? 2 : 10),
            topic,
            subTopic,
            difficulty: q.difficulty || null,
            explanation: q.explanation || null,
            textHash: tHash,
          });
          inserted++;
        } catch (e: any) {
          if (e.code === "23505") skipped++;
          else errors.push(`Q${q.questionNumber}: ${e.message}`);
        }
      }

      res.json({ total: questions.length, inserted, skipped, errors });
    } catch (error: any) {
      console.error("PYQ bulk import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/admin/questions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const isAdmin = req.user?.dbUser?.isAdmin === true;
      if (!isAdmin) return res.status(403).json({ error: "Admin only" });

      const { examType, examStage, year, paperType, topic, page = "1", limit = "20" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [];
      if (examType) conditions.push(eq(pyqQuestions.examType, examType as string));
      if (examStage) conditions.push(eq(pyqQuestions.examStage, examStage as string));
      if (year) conditions.push(eq(pyqQuestions.year, Number(year)));
      if (paperType) conditions.push(eq(pyqQuestions.paperType, paperType as string));
      if (topic) conditions.push(eq(pyqQuestions.topic, topic as string));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
        .from(pyqQuestions)
        .where(where as any);

      const questions = await db.select()
        .from(pyqQuestions)
        .where(where as any)
        .orderBy(desc(pyqQuestions.year), pyqQuestions.questionNumber)
        .limit(limitNum)
        .offset(offset);

      res.json({ questions, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
      console.error("Admin PYQ list error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/pyq/admin/questions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const isAdmin = req.user?.dbUser?.isAdmin === true;
      if (!isAdmin) return res.status(403).json({ error: "Admin only" });

      const id = parseInt(req.params.id);
      const updates = req.body;
      delete updates.id;
      delete updates.createdAt;

      if (updates.questionText) {
        updates.textHash = hashText(updates.questionText);
      }

      const [updated] = await db.update(pyqQuestions)
        .set(updates)
        .where(eq(pyqQuestions.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Question not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Admin PYQ update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pyq/admin/questions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const isAdmin = req.user?.dbUser?.isAdmin === true;
      if (!isAdmin) return res.status(403).json({ error: "Admin only" });

      const id = parseInt(req.params.id);
      const [deleted] = await db.delete(pyqQuestions)
        .where(eq(pyqQuestions.id, id))
        .returning({ id: pyqQuestions.id });

      if (!deleted) return res.status(404).json({ error: "Question not found" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin PYQ delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/questions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const { examType, examStage, year, paperType, topic, difficulty, questionType, page = "1", limit = "20" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [];
      if (examType) conditions.push(eq(pyqQuestions.examType, examType as string));
      if (examStage) conditions.push(eq(pyqQuestions.examStage, examStage as string));
      if (year) conditions.push(eq(pyqQuestions.year, Number(year)));
      if (paperType) conditions.push(eq(pyqQuestions.paperType, paperType as string));
      if (topic) conditions.push(eq(pyqQuestions.topic, topic as string));
      if (difficulty) conditions.push(eq(pyqQuestions.difficulty, difficulty as string));
      if (questionType) conditions.push(eq(pyqQuestions.questionType, questionType as string));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
        .from(pyqQuestions)
        .where(where as any);

      const questions = await db.select()
        .from(pyqQuestions)
        .where(where as any)
        .orderBy(desc(pyqQuestions.year), pyqQuestions.questionNumber)
        .limit(limitNum)
        .offset(offset);

      const attemptedIds = userId ? await db.select({ questionId: pyqAttempts.questionId, isCorrect: pyqAttempts.isCorrect, aiScore: pyqAttempts.aiScore, aiMaxScore: pyqAttempts.aiMaxScore })
        .from(pyqAttempts)
        .where(and(
          eq(pyqAttempts.userId, userId),
          inArray(pyqAttempts.questionId, questions.map(q => q.id))
        )) : [];

      const attemptMap = new Map(attemptedIds.map(a => [a.questionId, a]));

      const result = questions.map(q => {
        const attempt = attemptMap.get(q.id);
        const isAttempted = !!attempt;
        return {
          ...q,
          correctIndex: isAttempted ? q.correctIndex : (q.questionType === "mcq" ? undefined : q.correctIndex),
          explanation: isAttempted ? q.explanation : undefined,
          attempted: isAttempted,
          attemptResult: attempt || null,
        };
      });

      res.json({ questions: result, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
      console.error("PYQ questions list error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/questions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const id = parseInt(req.params.id);

      const [question] = await db.select().from(pyqQuestions).where(eq(pyqQuestions.id, id));
      if (!question) return res.status(404).json({ error: "Question not found" });

      const attempts = await db.select()
        .from(pyqAttempts)
        .where(and(eq(pyqAttempts.questionId, id), eq(pyqAttempts.userId, userId)))
        .orderBy(desc(pyqAttempts.createdAt));

      const isAttempted = attempts.length > 0;

      res.json({
        ...question,
        correctIndex: isAttempted ? question.correctIndex : (question.questionType === "mcq" ? undefined : question.correctIndex),
        explanation: isAttempted ? question.explanation : undefined,
        attempted: isAttempted,
        attempts,
      });
    } catch (error: any) {
      console.error("PYQ question detail error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pyq/attempt", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const { questionId, userAnswer } = req.body;

      if (!questionId || !userAnswer) {
        return res.status(400).json({ error: "questionId and userAnswer are required" });
      }

      const [question] = await db.select().from(pyqQuestions).where(eq(pyqQuestions.id, questionId));
      if (!question) return res.status(404).json({ error: "Question not found" });

      if (question.questionType === "mcq") {
        const answerIndex = parseInt(userAnswer);
        const isCorrect = question.correctIndex !== null ? answerIndex === question.correctIndex : null;

        const [attempt] = await db.insert(pyqAttempts).values({
          userId,
          questionId,
          userAnswer: String(answerIndex),
          isCorrect,
        }).returning();

        return res.json({
          attempt,
          isCorrect,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
        });
      }

      const evalPrompt = `You are a strict UPSC Mains answer evaluator. Evaluate this answer for the following question.

Question (${question.marks} marks): ${question.questionText}

Student's Answer:
${userAnswer}

Evaluate strictly on these parameters:
1. Introduction (0-2): Opening relevance, thesis statement
2. Body (0-4): Arguments, examples, analysis depth, structure
3. Conclusion (0-2): Summary, forward-looking statement
4. Content Coverage (0-2): How well the answer covers the topic

Return ONLY a raw JSON object:
{
  "score": <total out of ${question.marks}>,
  "maxScore": ${question.marks},
  "evaluation": { "introduction": <0-2>, "body": <0-4>, "conclusion": <0-2>, "contentCoverage": <0-2> },
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "overallFeedback": "detailed paragraph feedback"
}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
        config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.2 },
      });

      let evalResult: any;
      try {
        evalResult = parseAIJson(result.text || "");
      } catch {
        evalResult = {
          score: 0, maxScore: question.marks,
          evaluation: { introduction: 0, body: 0, conclusion: 0, contentCoverage: 0 },
          strengths: [], improvements: ["Could not evaluate automatically"],
          overallFeedback: "AI evaluation failed. Please try again.",
        };
      }

      const feedback: PyqMainsFeedback = {
        introduction: evalResult.evaluation?.introduction ?? 0,
        body: evalResult.evaluation?.body ?? 0,
        conclusion: evalResult.evaluation?.conclusion ?? 0,
        contentCoverage: evalResult.evaluation?.contentCoverage ?? 0,
        strengths: evalResult.strengths || [],
        improvements: evalResult.improvements || [],
        overallFeedback: evalResult.overallFeedback || "",
      };

      const [attempt] = await db.insert(pyqAttempts).values({
        userId,
        questionId,
        userAnswer,
        isCorrect: null,
        aiScore: evalResult.score || 0,
        aiMaxScore: evalResult.maxScore || question.marks,
        aiFeedback: feedback,
      }).returning();

      res.json({ attempt, feedback, score: evalResult.score, maxScore: evalResult.maxScore });
    } catch (error: any) {
      console.error("PYQ attempt error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/history", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const { page = "1", limit = "20" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
        .from(pyqAttempts)
        .where(eq(pyqAttempts.userId, userId));

      const attempts = await db.select({
        attempt: pyqAttempts,
        question: {
          id: pyqQuestions.id,
          questionText: pyqQuestions.questionText,
          questionType: pyqQuestions.questionType,
          examType: pyqQuestions.examType,
          examStage: pyqQuestions.examStage,
          year: pyqQuestions.year,
          paperType: pyqQuestions.paperType,
          topic: pyqQuestions.topic,
          marks: pyqQuestions.marks,
          questionNumber: pyqQuestions.questionNumber,
        },
      })
        .from(pyqAttempts)
        .innerJoin(pyqQuestions, eq(pyqAttempts.questionId, pyqQuestions.id))
        .where(eq(pyqAttempts.userId, userId))
        .orderBy(desc(pyqAttempts.createdAt))
        .limit(limitNum)
        .offset(offset);

      res.json({ attempts, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
      console.error("PYQ history error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/trends", isAuthenticated, async (req: any, res: Response) => {
    try {
      const allQuestions = await db.select({
        topic: pyqQuestions.topic,
        examStage: pyqQuestions.examStage,
        year: pyqQuestions.year,
        examType: pyqQuestions.examType,
      }).from(pyqQuestions);

      function calculateTrends(questions: typeof allQuestions) {
        const topicMap = new Map<string, { years: Set<number>; exams: Set<string> }>();

        for (const q of questions) {
          if (!topicMap.has(q.topic)) {
            topicMap.set(q.topic, { years: new Set(), exams: new Set() });
          }
          const entry = topicMap.get(q.topic)!;
          entry.years.add(q.year);
          entry.exams.add(q.examType);
        }

        if (topicMap.size === 0) return [];

        const allYears = questions.map(q => q.year);
        const maxYear = Math.max(...allYears);
        const minYear = Math.min(...allYears);
        const yearRange = maxYear - minYear || 1;

        const results = Array.from(topicMap.entries()).map(([topic, data]) => {
          const sortedYears = Array.from(data.years).sort((a, b) => b - a);
          const totalAppearances = questions.filter(q => q.topic === topic).length;
          const lastAppearance = sortedYears[0];

          let streak = 0;
          for (let y = maxYear; y >= minYear; y--) {
            if (data.years.has(y)) streak++;
            else break;
          }

          const maxAppearances = Math.max(...Array.from(topicMap.values()).map(d =>
            questions.filter(q => q.topic === Array.from(topicMap.entries()).find(([, v]) => v === d)?.[0]).length
          ));

          const normalizedFreq = maxAppearances > 0 ? totalAppearances / maxAppearances : 0;
          const normalizedRecency = yearRange > 0 ? (lastAppearance - minYear) / yearRange : 1;
          const maxStreak = maxYear - minYear + 1;
          const normalizedStreak = maxStreak > 0 ? streak / maxStreak : 0;

          const trendScore = (normalizedFreq * 0.6) + (normalizedRecency * 0.3) + (normalizedStreak * 0.1);
          const prediction = trendScore > 0.7 ? "High" : trendScore >= 0.4 ? "Medium" : "Low";

          return {
            topic,
            totalAppearances,
            lastAppearance,
            streak,
            prediction,
            trendScore: Math.round(trendScore * 100) / 100,
            years: sortedYears,
            exams: Array.from(data.exams),
          };
        });

        return results.sort((a, b) => b.totalAppearances - a.totalAppearances);
      }

      const prelimsQs = allQuestions.filter(q => q.examStage === "Prelims");
      const mainsQs = allQuestions.filter(q => q.examStage === "Mains");

      res.json({
        prelims: calculateTrends(prelimsQs),
        mains: calculateTrends(mainsQs),
      });
    } catch (error: any) {
      console.error("PYQ trends error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/stats", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;

      const allAttempts = await db.select({
        attempt: pyqAttempts,
        questionType: pyqQuestions.questionType,
        examStage: pyqQuestions.examStage,
        topic: pyqQuestions.topic,
        paperType: pyqQuestions.paperType,
      })
        .from(pyqAttempts)
        .innerJoin(pyqQuestions, eq(pyqAttempts.questionId, pyqQuestions.id))
        .where(eq(pyqAttempts.userId, userId));

      const prelimsAttempts = allAttempts.filter(a => a.examStage === "Prelims");
      const mainsAttempts = allAttempts.filter(a => a.examStage === "Mains");

      const prelimsCorrect = prelimsAttempts.filter(a => a.attempt.isCorrect === true).length;
      const mainsScores = mainsAttempts
        .filter(a => a.attempt.aiScore !== null && a.attempt.aiMaxScore !== null)
        .map(a => (a.attempt.aiScore! / a.attempt.aiMaxScore!) * 10);
      const mainsAvgScore = mainsScores.length > 0
        ? Math.round((mainsScores.reduce((s, v) => s + v, 0) / mainsScores.length) * 10) / 10
        : 0;

      const topicStats = new Map<string, { attempted: number; correct: number }>();
      for (const a of allAttempts) {
        if (!topicStats.has(a.topic)) topicStats.set(a.topic, { attempted: 0, correct: 0 });
        const ts = topicStats.get(a.topic)!;
        ts.attempted++;
        if (a.attempt.isCorrect === true) ts.correct++;
      }

      const paperStats = new Map<string, { attempted: number; correct: number }>();
      for (const a of allAttempts) {
        if (!paperStats.has(a.paperType)) paperStats.set(a.paperType, { attempted: 0, correct: 0 });
        const ps = paperStats.get(a.paperType)!;
        ps.attempted++;
        if (a.attempt.isCorrect === true) ps.correct++;
      }

      res.json({
        prelims: {
          attempted: prelimsAttempts.length,
          correct: prelimsCorrect,
          accuracy: prelimsAttempts.length > 0 ? Math.round((prelimsCorrect / prelimsAttempts.length) * 100) : 0,
        },
        mains: {
          attempted: mainsAttempts.length,
          avgScore: mainsAvgScore,
        },
        accuracyByTopic: Array.from(topicStats.entries()).map(([topic, s]) => ({
          topic, attempted: s.attempted, correct: s.correct,
          accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
        })),
        accuracyByPaper: Array.from(paperStats.entries()).map(([paperType, s]) => ({
          paperType, attempted: s.attempted, correct: s.correct,
          accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
        })),
      });
    } catch (error: any) {
      console.error("PYQ stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/years", isAuthenticated, async (req: any, res: Response) => {
    try {
      const data = await db.select({
        examType: pyqQuestions.examType,
        examStage: pyqQuestions.examStage,
        year: pyqQuestions.year,
        paperType: pyqQuestions.paperType,
        count: sql<number>`count(*)::int`,
      })
        .from(pyqQuestions)
        .groupBy(pyqQuestions.examType, pyqQuestions.examStage, pyqQuestions.year, pyqQuestions.paperType);

      const examMap = new Map<string, Map<string, Map<number, { papers: Set<string>; count: number }>>>();

      for (const row of data) {
        if (!examMap.has(row.examType)) examMap.set(row.examType, new Map());
        const stageMap = examMap.get(row.examType)!;
        if (!stageMap.has(row.examStage)) stageMap.set(row.examStage, new Map());
        const yearMap = stageMap.get(row.examStage)!;
        if (!yearMap.has(row.year)) yearMap.set(row.year, { papers: new Set(), count: 0 });
        const entry = yearMap.get(row.year)!;
        entry.papers.add(row.paperType);
        entry.count += row.count;
      }

      const result = Array.from(examMap.entries()).map(([examType, stageMap]) => ({
        examType,
        stages: Array.from(stageMap.entries()).map(([stage, yearMap]) => ({
          stage,
          years: Array.from(yearMap.entries())
            .map(([year, info]) => ({
              year,
              papers: Array.from(info.papers),
              questionCount: info.count,
            }))
            .sort((a, b) => b.year - a.year),
        })),
      }));

      res.json(result);
    } catch (error: any) {
      console.error("PYQ years error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/matches", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { topic } = req.query;
      if (!topic) return res.json([]);

      const matches = await db.select({
        id: pyqQuestions.id,
        examType: pyqQuestions.examType,
        examStage: pyqQuestions.examStage,
        year: pyqQuestions.year,
        paperType: pyqQuestions.paperType,
        questionNumber: pyqQuestions.questionNumber,
        topic: pyqQuestions.topic,
      })
        .from(pyqQuestions)
        .where(or(
          ilike(pyqQuestions.topic, `%${topic}%`),
          ilike(pyqQuestions.subTopic, `%${topic}%`)
        ))
        .orderBy(desc(pyqQuestions.year))
        .limit(5);

      res.json(matches);
    } catch (error: any) {
      console.error("PYQ matches error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pyq/topic-counts", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { topics } = req.query;
      if (!topics) return res.json({});

      const topicList = (topics as string).split(",").map(t => t.trim()).filter(Boolean);
      if (topicList.length === 0) return res.json({});

      const conditions = topicList.map(t => ilike(pyqQuestions.topic, `%${t}%`));
      const results = await db.select({
        topic: pyqQuestions.topic,
        count: sql<number>`count(*)::int`,
      })
        .from(pyqQuestions)
        .where(or(...conditions))
        .groupBy(pyqQuestions.topic);

      const countsMap: Record<string, number> = {};
      for (const t of topicList) {
        const matching = results.filter(r => r.topic.toLowerCase().includes(t.toLowerCase()));
        countsMap[t] = matching.reduce((sum, r) => sum + r.count, 0);
      }

      res.json(countsMap);
    } catch (error: any) {
      console.error("PYQ topic counts error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
