import jsPDF from "jspdf";
import logoUrl from "@assets/favicon_final_1770477519331.png";

let logoDataUrl: string | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrl) return logoDataUrl;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Failed to get canvas context"));
      ctx.drawImage(img, 0, 0);
      logoDataUrl = canvas.toDataURL("image/png");
      resolve(logoDataUrl);
    };
    img.onerror = reject;
    img.src = logoUrl;
  });
}

export interface PDFSection {
  type: "heading" | "subheading" | "text" | "boldText" | "bulletList" | "numberedList" | "scoreLine" | "divider" | "badge" | "spacer";
  text?: string;
  items?: string[];
  label?: string;
  value?: string;
  color?: string;
}

interface PDFOptions {
  title: string;
  subtitle?: string;
  sections: PDFSection[];
  fileName: string;
}

function addPageBranding(doc: jsPDF, logo: string, pageWidth: number, pageHeight: number) {
  doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
  const wmSize = 70;
  doc.addImage(logo, "PNG", (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2, wmSize, wmSize);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.addImage(logo, "PNG", 20, 8, 10, 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 33, 33);
  doc.text("Learnpro", 32, 14);
  doc.setTextColor(59, 130, 246);
  doc.text("AI", 32 + doc.getTextWidth("Learnpro") + 2, 14);
  doc.setTextColor(33, 33, 33);

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 22, pageWidth - 20, 22);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(140, 140, 140);
  doc.text("This is an AI generated PDF by Learnpro AI", pageWidth / 2, pageHeight - 10, { align: "center" });
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  doc.text(dateStr, pageWidth - 20, pageHeight - 10, { align: "right" });
  doc.text(`Page ${doc.getNumberOfPages()}`, 20, pageHeight - 10);
}

function renderTextWithBold(doc: jsPDF, text: string, x: number, y: number, fontSize: number, normalColor: [number, number, number], boldColor: [number, number, number]) {
  doc.setFontSize(fontSize);
  let currentX = x;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...boldColor);
      doc.text(boldText, currentX, y);
      currentX += doc.getTextWidth(boldText);
    } else if (part) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...normalColor);
      doc.text(part, currentX, y);
      currentX += doc.getTextWidth(part);
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...normalColor);
}

function parseMarkdownToSections(markdown: string): PDFSection[] {
  const sections: PDFSection[] = [];
  const lines = markdown.split("\n");
  let i = 0;
  let textBuffer = "";

  const flushText = () => {
    if (textBuffer.trim()) {
      sections.push({ type: "text", text: textBuffer.trim() });
      textBuffer = "";
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushText();
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushText();
      sections.push({ type: "heading", text: trimmed.slice(2).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushText();
      sections.push({ type: "heading", text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushText();
      sections.push({ type: "subheading", text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("#### ") || trimmed.startsWith("##### ") || trimmed.startsWith("###### ")) {
      flushText();
      const headingText = trimmed.replace(/^#{1,6}\s*/, "");
      sections.push({ type: "subheading", text: headingText });
      i++;
      continue;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+/);
    if (numberedMatch) {
      flushText();
      const items: string[] = [];
      while (i < lines.length) {
        const nLine = lines[i].trim();
        const nMatch = nLine.match(/^(\d+)\.\s+(.*)/);
        if (nMatch) {
          items.push(nMatch[2]);
          i++;
        } else if (nLine.startsWith("   ") || nLine.startsWith("\t")) {
          if (items.length > 0) {
            items[items.length - 1] += " " + nLine.trim();
          }
          i++;
        } else {
          break;
        }
      }
      sections.push({ type: "numberedList", items });
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ")) {
      flushText();
      const items: string[] = [];
      while (i < lines.length) {
        const bLine = lines[i].trim();
        if (bLine.startsWith("- ") || bLine.startsWith("* ") || bLine.startsWith("+ ")) {
          items.push(bLine.slice(2).trim());
          i++;
        } else if (bLine.startsWith("  ") || bLine.startsWith("\t")) {
          if (items.length > 0) {
            items[items.length - 1] += " " + bLine.trim();
          }
          i++;
        } else {
          break;
        }
      }
      sections.push({ type: "bulletList", items });
      continue;
    }

    if (trimmed.startsWith("---") || trimmed.startsWith("***") || trimmed.startsWith("___")) {
      flushText();
      sections.push({ type: "divider" });
      i++;
      continue;
    }

    if (textBuffer) {
      textBuffer += " " + trimmed;
    } else {
      textBuffer = trimmed;
    }
    i++;
  }
  flushText();
  return sections;
}

export async function generatePDF(options: PDFOptions): Promise<void> {
  const logo = await getLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const topMargin = 28;
  const bottomMargin = 18;
  let y = topMargin;

  addPageBranding(doc, logo, pageWidth, pageHeight);

  const checkNewPage = (needed: number) => {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      addPageBranding(doc, logo, pageWidth, pageHeight);
      y = topMargin;
    }
  };

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  const titleLines = doc.splitTextToSize(options.title, contentWidth);
  checkNewPage(titleLines.length * 7 + 4);
  doc.text(titleLines, marginLeft, y);
  y += titleLines.length * 7 + 2;

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const subLines = doc.splitTextToSize(options.subtitle, contentWidth);
    doc.text(subLines, marginLeft, y);
    y += subLines.length * 5 + 4;
  }

  y += 4;

  for (const section of options.sections) {
    switch (section.type) {
      case "heading": {
        checkNewPage(14);
        y += 2;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        const cleanedHeading = (section.text || "").replace(/\*\*(.*?)\*\*/g, "$1");
        const hLines = doc.splitTextToSize(cleanedHeading, contentWidth);
        doc.text(hLines, marginLeft, y);
        y += hLines.length * 6 + 2;
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, y, marginLeft + 30, y);
        doc.setLineWidth(0.2);
        y += 3;
        break;
      }
      case "subheading": {
        checkNewPage(10);
        y += 1;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        const cleanedSub = (section.text || "").replace(/\*\*(.*?)\*\*/g, "$1");
        const shLines = doc.splitTextToSize(cleanedSub, contentWidth);
        doc.text(shLines, marginLeft, y);
        y += shLines.length * 5 + 2;
        break;
      }
      case "text": {
        const rawText = section.text || "";
        doc.setFontSize(10);
        doc.setTextColor(35, 35, 35);
        doc.setFont("helvetica", "normal");
        const plainText = rawText.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
        const textLines = doc.splitTextToSize(plainText, contentWidth);
        for (const tl of textLines) {
          checkNewPage(5);
          doc.text(tl, marginLeft, y);
          y += 4.5;
        }
        y += 2;
        break;
      }
      case "boldText": {
        checkNewPage(6);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        const btLines = doc.splitTextToSize(section.text || "", contentWidth);
        for (const btl of btLines) {
          checkNewPage(5);
          doc.text(btl, marginLeft, y);
          y += 4.5;
        }
        y += 2;
        break;
      }
      case "bulletList": {
        doc.setFontSize(10);
        doc.setTextColor(35, 35, 35);
        for (const item of section.items || []) {
          const cleanItem = item.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
          const bulletLines = doc.splitTextToSize(cleanItem, contentWidth - 8);
          for (let bi = 0; bi < bulletLines.length; bi++) {
            checkNewPage(5);
            if (bi === 0) {
              doc.setFont("helvetica", "normal");
              doc.text("\u2022", marginLeft + 2, y);
              doc.text(bulletLines[bi], marginLeft + 7, y);
            } else {
              doc.text(bulletLines[bi], marginLeft + 7, y);
            }
            y += 4.5;
          }
        }
        y += 2;
        break;
      }
      case "numberedList": {
        doc.setFontSize(10);
        doc.setTextColor(35, 35, 35);
        const items = section.items || [];
        for (let ni = 0; ni < items.length; ni++) {
          const cleanItem = items[ni].replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
          const numPrefix = `${ni + 1}. `;
          const numLines = doc.splitTextToSize(cleanItem, contentWidth - 10);
          for (let nli = 0; nli < numLines.length; nli++) {
            checkNewPage(5);
            if (nli === 0) {
              doc.setFont("helvetica", "bold");
              doc.text(numPrefix, marginLeft + 2, y);
              doc.setFont("helvetica", "normal");
              doc.text(numLines[nli], marginLeft + 2 + doc.getTextWidth(numPrefix), y);
            } else {
              doc.text(numLines[nli], marginLeft + 10, y);
            }
            y += 4.5;
          }
        }
        y += 2;
        break;
      }
      case "scoreLine": {
        checkNewPage(8);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(section.label || "", marginLeft, y);
        doc.setFont("helvetica", "bold");
        if (section.color === "green") doc.setTextColor(22, 163, 74);
        else if (section.color === "amber") doc.setTextColor(217, 119, 6);
        else if (section.color === "red") doc.setTextColor(220, 38, 38);
        else doc.setTextColor(20, 20, 20);
        doc.text(section.value || "", pageWidth - marginRight, y, { align: "right" });
        y += 6;
        break;
      }
      case "badge": {
        checkNewPage(8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(59, 130, 246);
        doc.text(section.text || "", marginLeft, y);
        y += 5;
        break;
      }
      case "divider": {
        checkNewPage(6);
        y += 1;
        doc.setDrawColor(200, 200, 200);
        doc.line(marginLeft, y, pageWidth - marginRight, y);
        y += 4;
        break;
      }
      case "spacer": {
        y += 4;
        break;
      }
    }
  }

  doc.save(options.fileName);
}

export function chatMessageToPDFSections(content: string): PDFSection[] {
  return parseMarkdownToSections(content);
}

export function chatToPDFSections(messages: Array<{ role: string; content: string }>): PDFSection[] {
  const sections: PDFSection[] = [];
  for (const msg of messages) {
    sections.push({
      type: "subheading",
      text: msg.role === "user" ? "You" : "Learnpro Assistant",
    });
    const parsed = parseMarkdownToSections(msg.content);
    sections.push(...parsed);
    sections.push({ type: "divider" });
  }
  return sections;
}

export function currentAffairsToPDFSections(
  topics: Array<{ title: string; summary: string; category: string; gsCategory: string; relevance?: string | null; revised: boolean }>
): PDFSection[] {
  const sections: PDFSection[] = [];
  const grouped: Record<string, typeof topics> = {};
  for (const t of topics) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }
  for (const [category, catTopics] of Object.entries(grouped)) {
    sections.push({ type: "heading", text: category });
    for (const topic of catTopics) {
      sections.push({ type: "subheading", text: topic.title });
      sections.push({ type: "badge", text: `[${topic.gsCategory}]` });
      const parsed = parseMarkdownToSections(topic.summary);
      sections.push(...parsed);
      if (topic.relevance) {
        sections.push({ type: "boldText", text: `Relevance: ${topic.relevance}` });
      }
      sections.push({ type: "divider" });
    }
  }
  return sections;
}

interface EvalData {
  examType: string;
  paperType: string;
  fileName: string;
  totalScore: number | null;
  maxScore: number | null;
  totalMarks: number | null;
  totalQuestions: number | null;
  questionsAttempted: number | null;
  overallFeedback: string | null;
  competencyFeedback: Array<{ name: string; score?: number; strengths: string[]; improvements: string[] }> | null;
  questions: Array<{
    questionNumber: string;
    questionText: string;
    score: number;
    maxScore: number;
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
    introductionFeedback: string | null;
    bodyFeedback: string | null;
    conclusionFeedback: string | null;
  }>;
}

export function evaluationToPDFSections(data: EvalData): PDFSection[] {
  const sections: PDFSection[] = [];
  const scoreColor = data.totalScore && data.maxScore
    ? (data.totalScore / data.maxScore) >= 0.7 ? "green" : (data.totalScore / data.maxScore) >= 0.5 ? "amber" : "red"
    : undefined;

  sections.push({ type: "spacer" });
  sections.push({
    type: "scoreLine",
    label: "Overall Score",
    value: `${data.totalScore?.toFixed(1) || "N/A"} / ${data.maxScore || "N/A"}`,
    color: scoreColor,
  });

  if (data.totalMarks != null) {
    sections.push({ type: "scoreLine", label: "Total Marks", value: String(data.totalMarks) });
  }
  if (data.totalQuestions != null) {
    sections.push({ type: "scoreLine", label: "Questions", value: `${data.questionsAttempted ?? "?"} / ${data.totalQuestions}` });
  }
  sections.push({ type: "divider" });

  if (data.overallFeedback) {
    sections.push({ type: "heading", text: "Overall Feedback" });
    const feedbackSections = parseMarkdownToSections(data.overallFeedback);
    sections.push(...feedbackSections);
    sections.push({ type: "divider" });
  }

  if (data.competencyFeedback && data.competencyFeedback.length > 0) {
    sections.push({ type: "heading", text: "Parameter-wise Analysis" });
    sections.push({ type: "spacer" });
    for (const comp of data.competencyFeedback) {
      const cColor = comp.score !== undefined
        ? comp.score >= 7 ? "green" : comp.score >= 5 ? "amber" : "red"
        : undefined;
      sections.push({
        type: "scoreLine",
        label: comp.name,
        value: comp.score !== undefined ? `${comp.score}/10` : "N/A",
        color: cColor,
      });
      if (comp.strengths.length > 0) {
        sections.push({ type: "boldText", text: "Strengths:" });
        sections.push({ type: "bulletList", items: comp.strengths });
      }
      if (comp.improvements.length > 0) {
        sections.push({ type: "boldText", text: "Areas for Improvement:" });
        sections.push({ type: "bulletList", items: comp.improvements });
      }
      sections.push({ type: "spacer" });
    }
    sections.push({ type: "divider" });
  }

  if (data.questions.length > 0) {
    sections.push({ type: "heading", text: "Question-wise Evaluation" });
    sections.push({ type: "spacer" });
    for (const q of data.questions) {
      const qColor = (q.score / q.maxScore) >= 0.7 ? "green" : (q.score / q.maxScore) >= 0.5 ? "amber" : "red";
      sections.push({
        type: "scoreLine",
        label: `${q.questionNumber}${q.questionText ? ` - ${q.questionText}` : ""}`,
        value: `${q.score.toFixed(1)}/${q.maxScore}`,
        color: qColor,
      });
      if (q.detailedFeedback) {
        const detailSections = parseMarkdownToSections(q.detailedFeedback);
        sections.push(...detailSections);
      }
      if (q.strengths.length > 0) {
        sections.push({ type: "boldText", text: "Strengths:" });
        sections.push({ type: "bulletList", items: q.strengths });
      }
      if (q.improvements.length > 0) {
        sections.push({ type: "boldText", text: "Areas for Improvement:" });
        sections.push({ type: "bulletList", items: q.improvements });
      }
      if (q.introductionFeedback) {
        sections.push({ type: "subheading", text: "Introduction" });
        const introSections = parseMarkdownToSections(q.introductionFeedback);
        sections.push(...introSections);
      }
      if (q.bodyFeedback) {
        sections.push({ type: "subheading", text: "Body" });
        const bodySections = parseMarkdownToSections(q.bodyFeedback);
        sections.push(...bodySections);
      }
      if (q.conclusionFeedback) {
        sections.push({ type: "subheading", text: "Conclusion" });
        const concSections = parseMarkdownToSections(q.conclusionFeedback);
        sections.push(...concSections);
      }
      sections.push({ type: "divider" });
    }
  }

  return sections;
}

export function noteToPDFSections(note: { title: string; content: string; gsCategory?: string | null; tags?: string[] }): PDFSection[] {
  const sections: PDFSection[] = [];
  if (note.gsCategory) {
    sections.push({ type: "badge", text: `[${note.gsCategory}]` });
  }
  if (note.tags && note.tags.length > 0) {
    sections.push({ type: "badge", text: `Tags: ${note.tags.join(", ")}` });
  }
  const parsed = parseMarkdownToSections(note.content);
  sections.push(...parsed);
  return sections;
}
