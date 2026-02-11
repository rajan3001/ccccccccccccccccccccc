import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuthenticated } from "./replit_integrations/auth";
import { ObjectStorageService } from "./replit_integrations/object_storage";
import { db } from "./db";
import { evaluationSessions, evaluationQuestions, createEvaluationSchema, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { CompetencyFeedback } from "@shared/models/evaluation";
import { getLanguageName, getLanguageInstruction } from "./language-utils";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const objectStorage = new ObjectStorageService();

function buildEvaluationPrompt(
  examType: string,
  paperType: string,
  totalMarks: number | null | undefined,
  totalQuestions: number | null | undefined,
  questionsAttempted: number | null | undefined,
  hasQuestionPaper: boolean,
  langCode?: string
): string {
  let paperDetailsSection: string;

  if (hasQuestionPaper) {
    paperDetailsSection = `PAPER DETAILS:
- Exam: ${examType} - ${paperType}
- A QUESTION PAPER has been uploaded along with the answer sheet. The second file/image is the QUESTION PAPER.
- Extract the total marks, total questions, and number of questions attempted by analyzing BOTH the question paper and the answer sheet.
- Use the question paper to understand what each question asks, its marks allocation, and evaluate the answers accordingly.
- If the question paper specifies marks per question, use those. Otherwise, infer from the total marks visible on the question paper.`;
  } else {
    paperDetailsSection = `PAPER DETAILS PROVIDED BY STUDENT:
- Exam: ${examType} - ${paperType}
- Total Marks of Paper: ${totalMarks}
- Total Questions in Paper: ${totalQuestions}
- Questions Attempted by Student: ${questionsAttempted}

Use these details to understand the marking scheme. The student should have written question numbers and individual marks on their answer sheet. If marks per question are not visible, distribute ${totalMarks} marks proportionally across ${questionsAttempted} attempted questions.`;
  }

  return `You are an expert ${examType} Mains answer evaluator with decades of experience. Evaluate the uploaded answer sheet strictly as per ${examType} ${paperType} evaluation norms.

${paperDetailsSection}

EVALUATE EACH ANSWER ON THESE 7 PARAMETERS:
1. **Contextual Understanding** - Did the student understand what the question is actually asking? Did they address the directive word (Discuss/Analyze/Examine/Critically Evaluate/Comment) correctly? Did they cover all dimensions of the question?
2. **Introduction Proficiency** - Is the introduction relevant, crisp, and sets the right context? Does it define key terms? Does it hook the reader into the answer?
3. **Language** - Grammar, sentence structure, vocabulary, clarity of expression, formal tone appropriate for civil services examination
4. **Word Limit Adherence** - Is the answer within expected word limit for the marks allotted? Is it too brief (underdeveloped) or too long (rambling)?
5. **Conclusion** - Does the conclusion provide a forward-looking perspective? Does it give policy recommendations, a balanced view, or a constructive way forward? (Not just restating the introduction)
6. **Value Addition** - Use of relevant examples, data, statistics, reports (e.g., NITI Aayog, Economic Survey, UN reports), case studies, current affairs references, committee recommendations, court judgments
7. **Presentation** - Use of headings, subheadings, bullet points, diagrams, flowcharts, maps, tables where appropriate. Overall neatness and structure of the answer

OVERALL FEEDBACK RULES:
- Overall feedback MUST be in pointwise format (bullet points), NOT generic paragraphs
- Each point should be a specific, actionable observation
- Be direct and straightforward - tell the student exactly what they did well and what they need to fix
- Do NOT write vague statements like "generally good" or "needs improvement" - be specific

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "totalScore": <number - total marks scored across all questions>,
  "maxScore": ${hasQuestionPaper ? "<total marks extracted from question paper>" : totalMarks},
  "overallFeedback": "- Point 1: Specific observation about overall performance\\n- Point 2: Another specific observation\\n- Point 3: Key strength across answers\\n- Point 4: Most critical area needing improvement\\n- Point 5: Specific strategy to improve scores\\n- Point 6: Final actionable recommendation",
  "competencyFeedback": [
    {
      "name": "Contextual Understanding",
      "score": <number 1-10>,
      "strengths": ["specific strength with example from their answer"],
      "improvements": ["specific improvement with what they should have written instead"]
    },
    {
      "name": "Introduction Proficiency",
      "score": <number 1-10>,
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Language",
      "score": <number 1-10>,
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Word Limit Adherence",
      "score": <number 1-10>,
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Conclusion",
      "score": <number 1-10>,
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Value Addition",
      "score": <number 1-10>,
      "strengths": ["..."],
      "improvements": ["..."]
    },
    {
      "name": "Presentation",
      "score": <number 1-10>,
      "strengths": ["..."],
      "improvements": ["..."]
    }
  ],
  "questions": [
    {
      "questionNumber": "Q1",
      "questionText": "<the question as read from the sheet>",
      "score": <number>,
      "maxScore": <marks for this question>,
      "strengths": ["specific strength 1", "specific strength 2"],
      "improvements": ["specific improvement with example of what to write", "another specific suggestion"],
      "detailedFeedback": "- Point 1: ...\\n- Point 2: ...\\n- Point 3: ...",
      "introductionFeedback": "<specific feedback on this answer's introduction>",
      "bodyFeedback": "<specific feedback on this answer's body/content>",
      "conclusionFeedback": "<specific feedback on this answer's conclusion>"
    }
  ]
}

CRITICAL RULES:
- Be strict but fair, like a real ${examType} examiner
- Give SPECIFIC, ACTIONABLE suggestions - mention exact schemes, articles, judgments, data the student missed
- Reference specific government schemes, constitutional provisions, court judgments, committee reports, or statistics
- If a question has sub-parts (a, b, c), evaluate each sub-part separately
- Score using 0.5 increments
- The "score" field in competencyFeedback is a rating out of 10 for that parameter across all answers
- Respond with ONLY the JSON object, no other text${langCode && langCode !== "en" ? `\n\nIMPORTANT LANGUAGE INSTRUCTION: Write ALL feedback text (overallFeedback, strengths, improvements, detailedFeedback, introductionFeedback, bodyFeedback, conclusionFeedback) in ${getLanguageName(langCode)} language. Only keep proper nouns, technical terms, article numbers, act names, and scheme names in English. The JSON structure and field names must remain in English.` : ""}`;
}

export function registerEvaluationRoutes(app: Express): void {
  app.post("/api/evaluations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = createEvaluationSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { examType, paperType, fileName, fileObjectPath, totalMarks, totalQuestions, questionsAttempted, questionPaperObjectPath } = parsed.data;

      const [session] = await db.insert(evaluationSessions).values({
        userId,
        examType,
        paperType,
        fileName,
        fileObjectPath,
        totalMarks: totalMarks ?? null,
        totalQuestions: totalQuestions ?? null,
        questionsAttempted: questionsAttempted ?? null,
        questionPaperObjectPath: questionPaperObjectPath ?? null,
        status: "processing",
      }).returning();

      res.json({ sessionId: session.id, status: "processing" });

      const userLangCode = req.user?.dbUser?.language || "en";
      processEvaluation(session.id, fileObjectPath, fileName, examType, paperType, totalMarks, totalQuestions, questionsAttempted, questionPaperObjectPath, userLangCode).catch(err => {
        console.error("Evaluation processing failed:", err);
        db.update(evaluationSessions)
          .set({ status: "failed", overallFeedback: "Evaluation failed. Please try again." })
          .where(eq(evaluationSessions.id, session.id))
          .execute();
      });
    } catch (error) {
      console.error("Error creating evaluation:", error);
      res.status(500).json({ error: "Failed to create evaluation" });
    }
  });

  app.get("/api/evaluations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await db.select().from(evaluationSessions)
        .where(eq(evaluationSessions.userId, userId))
        .orderBy(desc(evaluationSessions.createdAt));
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      res.status(500).json({ error: "Failed to fetch evaluations" });
    }
  });

  app.get("/api/evaluations/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const [session] = await db.select().from(evaluationSessions)
        .where(eq(evaluationSessions.id, id));

      if (!session) {
        return res.status(404).json({ error: "Evaluation not found" });
      }

      if (session.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const questions = await db.select().from(evaluationQuestions)
        .where(eq(evaluationQuestions.sessionId, id));

      res.json({ ...session, questions });
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      res.status(500).json({ error: "Failed to fetch evaluation" });
    }
  });
}

async function processEvaluation(
  sessionId: number,
  fileObjectPath: string,
  fileName: string,
  examType: string,
  paperType: string,
  totalMarks: number | null | undefined,
  totalQuestions: number | null | undefined,
  questionsAttempted: number | null | undefined,
  questionPaperObjectPath?: string | null,
  langCode?: string
): Promise<void> {
  const file = await objectStorage.getObjectEntityFile(fileObjectPath);
  const [fileData] = await file.download();
  const [metadata] = await file.getMetadata();

  const contentType = metadata.contentType || guessContentType(fileName);
  const hasQuestionPaper = !!questionPaperObjectPath;
  const prompt = buildEvaluationPrompt(examType, paperType, totalMarks, totalQuestions, questionsAttempted, hasQuestionPaper, langCode);

  const parts: any[] = [{ text: prompt }];

  if (contentType.startsWith("image/")) {
    parts.push({
      inlineData: {
        mimeType: contentType,
        data: fileData.toString("base64"),
      },
    });
  } else if (contentType === "application/pdf") {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: fileData.toString("base64"),
      },
    });
  } else {
    const textContent = fileData.toString("utf-8").substring(0, 50000);
    parts.push({ text: `\n\n--- Answer Sheet Content ---\n${textContent}\n--- End ---` });
  }

  if (questionPaperObjectPath) {
    const qpFile = await objectStorage.getObjectEntityFile(questionPaperObjectPath);
    const [qpData] = await qpFile.download();
    const [qpMetadata] = await qpFile.getMetadata();
    const qpContentType = qpMetadata.contentType || "application/pdf";

    parts.push({ text: "\n\n--- QUESTION PAPER (uploaded by student) ---" });

    if (qpContentType.startsWith("image/")) {
      parts.push({
        inlineData: {
          mimeType: qpContentType,
          data: qpData.toString("base64"),
        },
      });
    } else if (qpContentType === "application/pdf") {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: qpData.toString("base64"),
        },
      });
    } else {
      const textContent = qpData.toString("utf-8").substring(0, 50000);
      parts.push({ text: textContent });
    }
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.3,
    },
  });

  const responseText = (result.text || "").trim();

  let evaluationData: any;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    evaluationData = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    console.error("Raw response:", responseText.substring(0, 500));
    await db.update(evaluationSessions)
      .set({ status: "failed", overallFeedback: "Failed to parse evaluation results. Please try again with a clearer image." })
      .where(eq(evaluationSessions.id, sessionId));
    return;
  }

  if (evaluationData.questions && Array.isArray(evaluationData.questions)) {
    for (const q of evaluationData.questions) {
      await db.insert(evaluationQuestions).values({
        sessionId,
        questionNumber: q.questionNumber || "Q?",
        questionText: q.questionText || "",
        score: q.score || 0,
        maxScore: q.maxScore || 10,
        strengths: q.strengths || [],
        improvements: q.improvements || [],
        detailedFeedback: q.detailedFeedback || "",
        introductionFeedback: q.introductionFeedback || null,
        bodyFeedback: q.bodyFeedback || null,
        conclusionFeedback: q.conclusionFeedback || null,
      });
    }
  }

  await db.update(evaluationSessions)
    .set({
      status: "completed",
      totalScore: evaluationData.totalScore || 0,
      maxScore: evaluationData.maxScore || 250,
      overallFeedback: evaluationData.overallFeedback || "",
      competencyFeedback: (evaluationData.competencyFeedback || []) as CompetencyFeedback[],
    })
    .where(eq(evaluationSessions.id, sessionId));
}

function guessContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext || ""] || "application/octet-stream";
}
