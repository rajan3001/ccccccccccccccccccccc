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

interface PDFSection {
  type: "heading" | "subheading" | "text" | "bulletList" | "scoreLine" | "divider" | "badge" | "spacer";
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
  doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
  const wmSize = 60;
  doc.addImage(logo, "PNG", (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2, wmSize, wmSize);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.addImage(logo, "PNG", 14, 8, 10, 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 33, 33);
  doc.text("Learnpro", 26, 14);
  doc.setTextColor(59, 130, 246);
  doc.text("AI", 26 + doc.getTextWidth("Learnpro") + 2, 14);
  doc.setTextColor(33, 33, 33);

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 22, pageWidth - 14, 22);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(140, 140, 140);
  doc.text("This is an AI generated PDF by Learnpro AI", pageWidth / 2, pageHeight - 8, { align: "center" });
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  doc.text(dateStr, pageWidth - 14, pageHeight - 8, { align: "right" });
  doc.text(`Page ${doc.getNumberOfPages()}`, 14, pageHeight - 8);
}

export async function generatePDF(options: PDFOptions): Promise<void> {
  const logo = await getLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const topMargin = 28;
  const bottomMargin = 16;
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
  doc.setTextColor(33, 33, 33);
  const titleLines = doc.splitTextToSize(options.title, contentWidth);
  checkNewPage(titleLines.length * 7 + 4);
  doc.text(titleLines, marginLeft, y);
  y += titleLines.length * 7 + 2;

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const subLines = doc.splitTextToSize(options.subtitle, contentWidth);
    doc.text(subLines, marginLeft, y);
    y += subLines.length * 5 + 4;
  }

  y += 4;

  for (const section of options.sections) {
    switch (section.type) {
      case "heading": {
        checkNewPage(12);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        const hLines = doc.splitTextToSize(section.text || "", contentWidth);
        doc.text(hLines, marginLeft, y);
        y += hLines.length * 6 + 3;
        break;
      }
      case "subheading": {
        checkNewPage(10);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        const shLines = doc.splitTextToSize(section.text || "", contentWidth);
        doc.text(shLines, marginLeft, y);
        y += shLines.length * 5 + 2;
        break;
      }
      case "text": {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const cleaned = (section.text || "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/#{1,6}\s*/g, "")
          .replace(/^[-*]\s+/gm, "  - ");
        const textLines = doc.splitTextToSize(cleaned, contentWidth);
        for (let i = 0; i < textLines.length; i++) {
          checkNewPage(5);
          doc.text(textLines[i], marginLeft, y);
          y += 4.5;
        }
        y += 2;
        break;
      }
      case "bulletList": {
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        for (const item of section.items || []) {
          const bulletLines = doc.splitTextToSize(`  \u2022  ${item}`, contentWidth - 4);
          for (let i = 0; i < bulletLines.length; i++) {
            checkNewPage(5);
            doc.text(bulletLines[i], marginLeft + 2, y);
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
        doc.setTextColor(80, 80, 80);
        doc.text(section.label || "", marginLeft, y);
        doc.setFont("helvetica", "bold");
        if (section.color === "green") doc.setTextColor(22, 163, 74);
        else if (section.color === "amber") doc.setTextColor(217, 119, 6);
        else if (section.color === "red") doc.setTextColor(220, 38, 38);
        else doc.setTextColor(33, 33, 33);
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
        doc.setDrawColor(220, 220, 220);
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

export function chatToPDFSections(messages: Array<{ role: string; content: string }>): PDFSection[] {
  const sections: PDFSection[] = [];
  for (const msg of messages) {
    sections.push({
      type: "subheading",
      text: msg.role === "user" ? "You" : "Learnpro Assistant",
    });
    sections.push({ type: "text", text: msg.content });
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
      sections.push({ type: "text", text: topic.summary });
      if (topic.relevance) {
        sections.push({ type: "text", text: `Relevance: ${topic.relevance}` });
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
    sections.push({ type: "text", text: data.overallFeedback });
    sections.push({ type: "divider" });
  }

  if (data.competencyFeedback && data.competencyFeedback.length > 0) {
    sections.push({ type: "heading", text: "Parameter-wise Analysis" });
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
        sections.push({ type: "subheading", text: "Strengths" });
        sections.push({ type: "bulletList", items: comp.strengths });
      }
      if (comp.improvements.length > 0) {
        sections.push({ type: "subheading", text: "Areas for Improvement" });
        sections.push({ type: "bulletList", items: comp.improvements });
      }
      sections.push({ type: "spacer" });
    }
    sections.push({ type: "divider" });
  }

  if (data.questions.length > 0) {
    sections.push({ type: "heading", text: "Question-wise Evaluation" });
    for (const q of data.questions) {
      const qColor = (q.score / q.maxScore) >= 0.7 ? "green" : (q.score / q.maxScore) >= 0.5 ? "amber" : "red";
      sections.push({
        type: "scoreLine",
        label: `${q.questionNumber}${q.questionText ? ` - ${q.questionText}` : ""}`,
        value: `${q.score.toFixed(1)}/${q.maxScore}`,
        color: qColor,
      });
      if (q.detailedFeedback) {
        sections.push({ type: "text", text: q.detailedFeedback });
      }
      if (q.strengths.length > 0) {
        sections.push({ type: "subheading", text: "Strengths" });
        sections.push({ type: "bulletList", items: q.strengths });
      }
      if (q.improvements.length > 0) {
        sections.push({ type: "subheading", text: "Areas for Improvement" });
        sections.push({ type: "bulletList", items: q.improvements });
      }
      if (q.introductionFeedback) {
        sections.push({ type: "subheading", text: "Introduction" });
        sections.push({ type: "text", text: q.introductionFeedback });
      }
      if (q.bodyFeedback) {
        sections.push({ type: "subheading", text: "Body" });
        sections.push({ type: "text", text: q.bodyFeedback });
      }
      if (q.conclusionFeedback) {
        sections.push({ type: "subheading", text: "Conclusion" });
        sections.push({ type: "text", text: q.conclusionFeedback });
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
  sections.push({ type: "text", text: note.content });
  return sections;
}
