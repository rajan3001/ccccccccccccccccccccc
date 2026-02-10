import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Newspaper,
  Brain,
  FileCheck,
  NotebookPen,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const TOUR_STEPS = [
  {
    icon: MessageSquare,
    color: "#3b82f6",
    bg: "#dbeafe",
    title: "AI Chat Mentor",
    subtitle: "Ask any UPSC doubt",
    description: "Get instant, exam-relevant answers from your personal AI mentor. Attach PDFs, ask follow-up questions, and save useful responses as notes.",
    features: ["Streaming AI responses", "File attachments", "Save to Notes"],
  },
  {
    icon: Newspaper,
    color: "#f59e0b",
    bg: "#fef3c7",
    title: "Daily Current Affairs",
    subtitle: "Stay updated, effortlessly",
    description: "AI-curated daily digest mapped to GS papers. Never miss an important topic. Covers national, international, and state-level news.",
    features: ["GS paper mapping", "365 days coverage", "State-specific news"],
  },
  {
    icon: Brain,
    color: "#10b981",
    bg: "#d1fae5",
    title: "Practice Quizzes",
    subtitle: "Test yourself daily",
    description: "AI-generated MCQs tailored to your target exam. Get detailed explanations, track accuracy, and identify weak areas automatically.",
    features: ["16 exams supported", "Detailed explanations", "Performance analytics"],
  },
  {
    icon: FileCheck,
    color: "#8b5cf6",
    bg: "#ede9fe",
    title: "Answer Evaluation",
    subtitle: "UPSC-standard feedback",
    description: "Upload your handwritten answer sheets and get AI evaluation across 7 competency parameters. Know exactly where you stand.",
    features: ["7 parameter scoring", "Per-question feedback", "PDF reports"],
  },
  {
    icon: NotebookPen,
    color: "#f97316",
    bg: "#ffedd5",
    title: "Smart Notes",
    subtitle: "Never forget what you learn",
    description: "Save important AI responses as structured notes. Organize with folders and tags. Built-in spaced repetition ensures long-term retention.",
    features: ["Folders & tags", "Spaced repetition", "Markdown support"],
  },
  {
    icon: CalendarDays,
    color: "#06b6d4",
    bg: "#cffafe",
    title: "Study Planner",
    subtitle: "Stay on track every day",
    description: "Build weekly timetables, set daily goals, and track your syllabus progress. AI can generate personalized schedules based on your pace.",
    features: ["AI timetable generation", "Syllabus tracking", "Daily goals"],
  },
];

interface HowItWorksTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorksTour({ open, onOpenChange }: HowItWorksTourProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  const goNext = useCallback(() => {
    if (isLast) {
      onOpenChange(false);
      setStep(0);
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }, [isLast, onOpenChange]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }, [isFirst]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => setStep(0), 300);
  }, [onOpenChange]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-md border-0 [&>button]:hidden" data-testid="dialog-tour">
        <VisuallyHidden><DialogTitle>How It Works Tour</DialogTitle></VisuallyHidden>
        <div className="relative flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Quick Tour</span>
              <span className="text-[10px] text-muted-foreground/60 ml-1">{step + 1} / {TOUR_STEPS.length}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleClose}
              data-testid="button-tour-close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="px-4 pb-1">
            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: i <= step ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    opacity: i <= step ? 1 : 0.4,
                  }}
                  data-testid={`tour-progress-${i}`}
                />
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] sm:min-h-[360px] overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="px-5 sm:px-6 py-4"
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.4, type: "spring", stiffness: 200 }}
                    className="relative mb-5"
                  >
                    <div
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center"
                      style={{ background: current.bg }}
                    >
                      <current.icon
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        style={{ color: current.color }}
                      />
                    </div>
                    <motion.div
                      className="absolute -inset-2 rounded-2xl pointer-events-none"
                      style={{ border: `2px solid ${current.color}20` }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg sm:text-xl font-bold text-foreground mb-1"
                    data-testid="text-tour-title"
                  >
                    {current.title}
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-xs font-medium mb-3"
                    style={{ color: current.color }}
                  >
                    {current.subtitle}
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm"
                    data-testid="text-tour-desc"
                  >
                    {current.description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {current.features.map((feat, fi) => (
                      <motion.div
                        key={feat}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + fi * 0.08 }}
                      >
                        <Badge variant="secondary" className="text-[10px] sm:text-[11px] no-default-hover-elevate no-default-active-elevate">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" style={{ color: current.color }} />
                          {feat}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pb-5 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-xs text-muted-foreground"
              data-testid="button-tour-skip"
            >
              Skip Tour
            </Button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  data-testid="button-tour-prev"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={goNext}
                data-testid="button-tour-next"
              >
                {isLast ? "Get Started" : "Next"}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
