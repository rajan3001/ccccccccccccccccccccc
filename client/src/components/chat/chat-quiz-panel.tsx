import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generatePDF } from "@/lib/pdf-generator";
import type { PDFSection } from "@/lib/pdf-generator";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  Send,
  Trophy,
  Target,
  BookOpen,
} from "lucide-react";

interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

function parseMCQContent(content: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  const qBlocks = content.split(/(?=\*\*(?:Question|Q)\s*\d+)/i);

  for (const block of qBlocks) {
    if (!block.trim()) continue;

    const qNumMatch = block.match(/\*\*(?:Question|Q)\s*(\d+)[:\.\)]?\*\*/i);
    if (!qNumMatch) continue;

    const questionNumber = parseInt(qNumMatch[1]);

    const answerSplit = block.split(/\*\*Answer[:\s]*\(?([a-d])\)?\*\*/i);
    if (answerSplit.length < 2) continue;

    const questionPart = answerSplit[0];
    const correctAnswer = answerSplit[1].trim().toLowerCase();
    const explanationPart = answerSplit.slice(2).join("");

    const afterHeader = questionPart.replace(/\*\*(?:Question|Q)\s*\d+[:\.\)]?\*\*/i, "").trim();

    const optionRegex = /\(([a-d])\)\s*(.+?)(?=\n\s*\([a-d]\)|\n|$)/gi;
    const optionMatches: RegExpExecArray[] = [];
    let optMatch: RegExpExecArray | null;
    while ((optMatch = optionRegex.exec(afterHeader)) !== null) {
      optionMatches.push(optMatch);
    }

    if (optionMatches.length === 0) continue;

    const firstOptionIndex = afterHeader.indexOf(optionMatches[0][0]);
    const questionText = afterHeader.substring(0, firstOptionIndex).replace(/\n+$/, "").trim();

    const options = optionMatches.map((m) => ({
      label: m[1].toLowerCase(),
      text: m[2].trim().replace(/\n+/g, " ").replace(/\s+/g, " "),
    }));

    let explanation = "";
    const expMatch = explanationPart.match(/\*\*Explanation[:\s]*\*\*\s*([\s\S]*?)(?=---|\*\*(?:Question|Q)\s*\d+|$)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
    } else {
      explanation = explanationPart.replace(/^[:\s]*/, "").trim();
    }

    questions.push({
      questionNumber,
      questionText,
      options,
      correctAnswer,
      explanation,
    });
  }

  return questions;
}

interface ChatQuizPanelProps {
  content: string;
  onClose: () => void;
  isOpen: boolean;
}

export function ChatQuizPanel({ content, onClose, isOpen }: ChatQuizPanelProps) {
  const questions = parseMCQContent(content);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSelectedAnswers({});
      setIsSubmitted(false);
      setShowExplanation({});
    }
  }, [isOpen, content]);

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === totalQuestions;

  const score = isSubmitted
    ? questions.reduce((acc, q, i) => (selectedAnswers[i] === q.correctAnswer ? acc + 1 : acc), 0)
    : 0;

  const handleSelectOption = (optionLabel: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionLabel }));
  };

  const handleSubmit = () => {
    if (!allAnswered) {
      toast({ title: "Please answer all questions before submitting", variant: "destructive" });
      return;
    }
    setIsSubmitted(true);
    setCurrentIndex(0);
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setShowExplanation({});
    setCurrentIndex(0);
  };

  const handleDownloadPDF = async () => {
    try {
      const sections: PDFSection[] = [];
      sections.push({ type: "heading", text: "Practice MCQ Quiz" });
      sections.push({ type: "text", text: `Score: ${score}/${totalQuestions} (${Math.round((score / totalQuestions) * 100)}%)` });
      sections.push({ type: "divider" });

      for (const q of questions) {
        sections.push({ type: "subheading", text: `Question ${q.questionNumber}` });
        sections.push({ type: "text", text: q.questionText });
        sections.push({
          type: "bulletList",
          items: q.options.map((o) => `(${o.label}) ${o.text}`),
        });
        sections.push({ type: "boldText", text: `Correct Answer: (${q.correctAnswer})` });
        if (q.explanation) {
          sections.push({ type: "text", text: `Explanation: ${q.explanation.replace(/\*+/g, "").replace(/\n+/g, " ").trim().slice(0, 500)}` });
        }
        sections.push({ type: "divider" });
      }

      await generatePDF({
        title: "Practice MCQ Quiz",
        subtitle: `Learnpro AI - ${new Date().toLocaleDateString("en-IN")}`,
        sections,
        fileName: `learnpro-mcq-quiz-${Date.now()}.pdf`,
      });
      toast({ title: "PDF downloaded successfully" });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const getOptionStyle = (optionLabel: string) => {
    if (!isSubmitted) {
      if (selectedAnswers[currentIndex] === optionLabel) {
        return "border-primary bg-primary/10 ring-2 ring-primary/30";
      }
      return "border-border hover-elevate cursor-pointer";
    }

    const isCorrect = optionLabel === currentQ.correctAnswer;
    const isSelected = selectedAnswers[currentIndex] === optionLabel;

    if (isCorrect) return "border-green-500 bg-green-50 dark:bg-green-950/30";
    if (isSelected && !isCorrect) return "border-red-500 bg-red-50 dark:bg-red-950/30";
    return "border-border opacity-60";
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full bg-background border-l border-border shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out w-full sm:w-[480px]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      data-testid="chat-quiz-panel"
    >
      <div className="flex items-center justify-between gap-2 p-4 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base">Practice Quiz</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-quiz-panel"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {isSubmitted && currentIndex === 0 && (
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-quiz-score">
                {score}/{totalQuestions}
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round((score / totalQuestions) * 100)}% correct
              </div>
            </div>
          </div>
          <Progress value={(score / totalQuestions) * 100} className="h-2" />
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="text-green-600 border-green-300 dark:border-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" /> {score} Correct
            </Badge>
            <Badge variant="outline" className="text-red-600 border-red-300 dark:border-red-600 dark:text-red-400">
              <XCircle className="h-3 w-3 mr-1" /> {totalQuestions - score} Wrong
            </Badge>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Badge variant="secondary" data-testid="text-question-counter">
            Q{currentIndex + 1} of {totalQuestions}
          </Badge>
          {!isSubmitted && (
            <span className="text-xs text-muted-foreground">
              {answeredCount}/{totalQuestions} answered
            </span>
          )}
        </div>

        <div className="mb-5">
          <p className="text-sm leading-relaxed font-medium" data-testid="text-question">
            {currentQ.questionText}
          </p>
        </div>

        <div className="space-y-2.5">
          {currentQ.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSelectOption(opt.label)}
              disabled={isSubmitted}
              className={cn(
                "w-full text-left p-3.5 rounded-md border-2 transition-all duration-200",
                getOptionStyle(opt.label)
              )}
              data-testid={`option-${opt.label}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5",
                    isSubmitted && opt.label === currentQ.correctAnswer
                      ? "border-green-500 bg-green-500 text-white"
                      : isSubmitted && selectedAnswers[currentIndex] === opt.label && opt.label !== currentQ.correctAnswer
                        ? "border-red-500 bg-red-500 text-white"
                        : selectedAnswers[currentIndex] === opt.label
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                  )}
                >
                  {isSubmitted && opt.label === currentQ.correctAnswer ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isSubmitted && selectedAnswers[currentIndex] === opt.label && opt.label !== currentQ.correctAnswer ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : (
                    opt.label.toUpperCase()
                  )}
                </span>
                <span className="text-sm leading-relaxed">{opt.text}</span>
              </div>
            </button>
          ))}
        </div>

        {isSubmitted && currentQ.explanation && (
          <div className="mt-4">
            <button
              onClick={() => setShowExplanation((prev) => ({ ...prev, [currentIndex]: !prev[currentIndex] }))}
              className="flex items-center gap-2 text-sm font-medium text-primary mb-2 cursor-pointer"
              data-testid="button-toggle-explanation"
            >
              <BookOpen className="h-4 w-4" />
              {showExplanation[currentIndex] ? "Hide Explanation" : "View Explanation"}
            </button>
            {showExplanation[currentIndex] && (
              <Card className="p-3.5 bg-muted/50 border-primary/10">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {currentQ.explanation.replace(/\*+/g, "").replace(/\s{2,}/g, "\n").trim()}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            data-testid="button-prev-question"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>

          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  currentIndex === i
                    ? "bg-primary"
                    : isSubmitted
                      ? selectedAnswers[i] === questions[i].correctAnswer
                        ? "bg-green-500"
                        : "bg-red-500"
                      : selectedAnswers[i]
                        ? "bg-primary/50"
                        : "bg-muted-foreground/20"
                )}
                data-testid={`dot-${i}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
            disabled={currentIndex === totalQuestions - 1}
            data-testid="button-next-question"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {!isSubmitted ? (
          <Button
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={!allAnswered}
            data-testid="button-submit-quiz"
          >
            <Send className="h-4 w-4" />
            Submit Answers ({answeredCount}/{totalQuestions})
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleRetry}
              data-testid="button-retry-quiz"
            >
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleDownloadPDF}
              data-testid="button-download-quiz-pdf"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={onClose}
              data-testid="button-back-to-chat"
            >
              Back to Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function detectMCQContent(content: string): boolean {
  const hasQuestionFormat = /\*\*(?:Question|Q)\s*\d+/i.test(content);
  const hasOptions = /\([a-d]\)\s+/i.test(content);
  const hasAnswer = /\*\*Answer[:\s]*\(?[a-d]\)?\*\*/i.test(content);
  return hasQuestionFormat && hasOptions && hasAnswer;
}
