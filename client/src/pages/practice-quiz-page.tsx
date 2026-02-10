import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  useQuizHistory,
  useQuizAnalytics,
  useQuiz,
  useGenerateQuiz,
  useSubmitQuiz,
  type QuizAttempt,
  type QuizQuestion,
} from "@/hooks/use-quiz";
import {
  Brain,
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  BarChart3,
  ListChecks,
  Sparkles,
  RotateCcw,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function renderQuizText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const EXAM_TYPES = [
  { value: "UPSC", label: "UPSC (Union Public Service Commission)", group: "National" },
  { value: "JPSC", label: "JPSC (Jharkhand)", group: "State PSC" },
  { value: "BPSC", label: "BPSC (Bihar)", group: "State PSC" },
  { value: "JKPSC", label: "JKPSC (Jammu & Kashmir)", group: "State PSC" },
  { value: "UPPSC", label: "UPPSC (Uttar Pradesh)", group: "State PSC" },
  { value: "MPPSC", label: "MPPSC (Madhya Pradesh)", group: "State PSC" },
  { value: "RPSC", label: "RPSC (Rajasthan)", group: "State PSC" },
  { value: "OPSC", label: "OPSC (Odisha)", group: "State PSC" },
  { value: "HPSC", label: "HPSC (Haryana)", group: "State PSC" },
  { value: "UKPSC", label: "UKPSC (Uttarakhand)", group: "State PSC" },
  { value: "HPPSC", label: "HPPSC (Himachal Pradesh)", group: "State PSC" },
  { value: "APSC_Assam", label: "APSC (Assam)", group: "State PSC (NE)" },
  { value: "MeghalayaPSC", label: "Meghalaya PSC", group: "State PSC (NE)" },
  { value: "SikkimPSC", label: "Sikkim PSC", group: "State PSC (NE)" },
  { value: "TripuraPSC", label: "Tripura PSC", group: "State PSC (NE)" },
  { value: "ArunachalPSC", label: "Arunachal Pradesh PSC", group: "State PSC (NE)" },
];

const EXAM_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  UPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT (Aptitude & Reasoning)" },
    { value: "GS-I", label: "Mains GS-I: History, Geography, Society" },
    { value: "GS-II", label: "Mains GS-II: Polity, Governance, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Environment" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics, Integrity, Aptitude" },
  ],
  JPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains Paper I: History, Culture, Geography" },
    { value: "GS-II", label: "Mains Paper II: Governance, Polity, Social" },
    { value: "GS-III", label: "Mains Paper III: Science, Tech, Environment" },
    { value: "Jharkhand-Special", label: "Jharkhand Special: State History, Geography, Economy, Tribal Culture" },
  ],
  BPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies (Single Paper)" },
    { value: "GS-I", label: "Mains GS-I: Indian Culture, History, Geography" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, Social Justice, IR" },
    { value: "Bihar-Special", label: "Bihar Special: Ancient History, Champaran, Bihar Movement, State Economy" },
  ],
  JKPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Geography, Society" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Environment" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "JK-Special", label: "J&K Special: History, Geography, Culture, Governance" },
  ],
  UPPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Culture, Geography" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Security" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "UP-Special-I", label: "UP Special I: State History, Culture, Geography" },
    { value: "UP-Special-II", label: "UP Special II: State Economy, Governance" },
  ],
  MPPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - General Aptitude (CSAT)" },
    { value: "GS-I", label: "Mains GS-I: History, Culture, MP Heritage" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, Security" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Environment" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics, Psychology" },
    { value: "MP-Special", label: "MP Special: State History, Geography, Economy, Tribal Areas" },
  ],
  RPSC: [
    { value: "Prelims-GK", label: "Prelims - GK & General Science (Single Paper)" },
    { value: "Paper-I", label: "Mains Paper I: History, Economics, Sociology" },
    { value: "Paper-II", label: "Mains Paper II: Science, Tech, Ethics" },
    { value: "Paper-III", label: "Mains Paper III: Polity, Public Admin, Current Affairs" },
    { value: "Rajasthan-Special", label: "Rajasthan Special: Rajput History, Desert Geography, Arts, Culture" },
  ],
  OPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Culture, Geography" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Security" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "Odisha-Special", label: "Odisha Special: Kalinga History, Geography, Odia Culture" },
  ],
  HPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Culture, Geography, Haryana" },
    { value: "GS-II", label: "Mains GS-II: Polity, Governance, IR, Haryana Admin" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Environment, Haryana" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
  ],
  UKPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Geography, Society" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, Economy" },
    { value: "GS-III", label: "Mains GS-III: Science, Tech, Environment, Security" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "UK-Special-I", label: "Uttarakhand Special I: State History, Culture, Polity" },
    { value: "UK-Special-II", label: "Uttarakhand Special II: Geography, Economy, Current Affairs" },
  ],
  HPPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - General Aptitude" },
    { value: "GS-I", label: "Mains GS-I: History, Culture, Heritage" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity" },
    { value: "GS-III", label: "Mains GS-III: Economy, Social Development" },
    { value: "HP-Special", label: "Himachal Special: State History, Geography, Culture, Governance" },
  ],
  APSC_Assam: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Geography, Society" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Environment" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "Assam-Special", label: "Assam Special: Ahom Dynasty, Brahmaputra Valley, Tea Industry, Culture" },
  ],
  MeghalayaPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: Culture, History, Geography" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Security" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "Meghalaya-Special", label: "Meghalaya Special: Khasi, Garo & Jaintia Tribes, State Governance" },
  ],
  SikkimPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "Prelims-Aptitude", label: "Prelims - Aptitude & Reasoning" },
    { value: "CurrentAffairs-Analytical", label: "Mains Paper I: Current Affairs & Analytical Ability" },
    { value: "Sikkim-Special", label: "Sikkim Special: History, Geography, Customs, Tribal Culture" },
  ],
  TripuraPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies (Single Paper)" },
    { value: "GS-I", label: "Mains GS-I: GK, Current Affairs, History" },
    { value: "Constitution-Polity", label: "Mains Paper IV: Constitution & Political System" },
    { value: "Economy-Planning", label: "Mains Paper V: Economic Development & Planning" },
    { value: "Tripura-Special", label: "Tripura Special: State History (1857-1949), Tribes, Geography" },
  ],
  ArunachalPSC: [
    { value: "Prelims-GS", label: "Prelims - General Studies" },
    { value: "CSAT", label: "Prelims - CSAT" },
    { value: "GS-I", label: "Mains GS-I: History, Culture, Geography" },
    { value: "GS-II", label: "Mains GS-II: Governance, Polity, IR" },
    { value: "GS-III", label: "Mains GS-III: Economy, Science, Environment" },
    { value: "GS-IV", label: "Mains GS-IV: Ethics" },
    { value: "Arunachal-Special", label: "Arunachal & NE Special: Administrative Evolution, Tribal Culture" },
  ],
};

const DEFAULT_CATEGORIES = [
  { value: "Prelims-GS", label: "Prelims - General Studies" },
  { value: "CSAT", label: "Prelims - CSAT" },
  { value: "GS-I", label: "General Studies I" },
  { value: "GS-II", label: "General Studies II" },
  { value: "GS-III", label: "General Studies III" },
];

function getCategoriesForExam(examType: string) {
  return EXAM_CATEGORIES[examType] || DEFAULT_CATEGORIES;
}

function getExamLabel(examType: string) {
  return EXAM_TYPES.find(e => e.value === examType)?.label || examType;
}

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const QUESTION_COUNTS = [
  { value: "5", label: "5 Questions" },
  { value: "10", label: "10 Questions" },
  { value: "15", label: "15 Questions" },
  { value: "20", label: "20 Questions" },
];

type ViewMode = "create" | "quiz" | "results" | "history" | "analytics";

export default function PracticeQuizPage() {
  const searchString = useSearch();
  const [view, setView] = useState<ViewMode>("create");
  const [examType, setExamType] = useState("UPSC");
  const [gsCategory, setGsCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const attemptId = params.get("attemptId");
    if (attemptId) {
      const id = parseInt(attemptId);
      if (!isNaN(id) && id > 0) {
        setActiveQuizId(id);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setView("quiz");
      }
    }
  }, [searchString]);
  const generateMutation = useGenerateQuiz();
  const submitMutation = useSubmitQuiz();
  const { data: quizData, isLoading: quizLoading } = useQuiz(activeQuizId);
  const { data: history, isLoading: historyLoading } = useQuizHistory();
  const { data: analyticsData, isLoading: analyticsLoading } = useQuizAnalytics();

  const handleGenerate = () => {
    if (!gsCategory || !difficulty) {
      toast({ title: "Please select all options", variant: "destructive" });
      return;
    }
    generateMutation.mutate(
      { examType, gsCategory, difficulty, numQuestions: parseInt(numQuestions) },
      {
        onSuccess: (data) => {
          setActiveQuizId(data.attempt.id);
          setCurrentQuestionIndex(0);
          setSelectedAnswers({});
          setView("quiz");
        },
        onError: () => {
          toast({ title: "Failed to generate quiz", description: "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    if (quizData?.attempt.score !== null) return;
    setSelectedAnswers((prev) => ({ ...prev, [String(questionId)]: optionIndex }));
  };

  const handleSubmit = () => {
    if (!activeQuizId) return;
    submitMutation.mutate(
      { id: activeQuizId, answers: selectedAnswers },
      {
        onSuccess: () => {
          setView("results");
          setCurrentQuestionIndex(0);
        },
        onError: () => {
          toast({ title: "Failed to submit quiz", variant: "destructive" });
        },
      }
    );
  };

  const handleReviewAttempt = (attempt: QuizAttempt) => {
    setActiveQuizId(attempt.id);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setView("results");
  };

  const handleNewQuiz = () => {
    setActiveQuizId(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setView("create");
  };

  const questions = quizData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isCompleted = quizData?.attempt.score !== null;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 flex-wrap bg-background sticky top-0 z-40">
          <div className="flex items-center gap-2 sm:gap-3">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h1 className="text-lg sm:text-xl font-bold" data-testid="text-quiz-title">Practice Quiz</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={view === "create" || view === "quiz" || view === "results" ? "default" : "ghost"}
              size="sm"
              onClick={handleNewQuiz}
              data-testid="button-new-quiz"
            >
              <Sparkles className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">New Quiz</span>
            </Button>
            <Button
              variant={view === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("history")}
              data-testid="button-quiz-history"
            >
              <ListChecks className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant={view === "analytics" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("analytics")}
              data-testid="button-quiz-analytics"
            >
              <BarChart3 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-4 sm:p-6">
            {view === "create" && (
              <CreateQuizView
                examType={examType}
                setExamType={(v) => { setExamType(v); setGsCategory(""); }}
                gsCategory={gsCategory}
                setGsCategory={setGsCategory}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                numQuestions={numQuestions}
                setNumQuestions={setNumQuestions}
                onGenerate={handleGenerate}
                isGenerating={generateMutation.isPending}
              />
            )}

            {view === "quiz" && (
              quizLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : currentQuestion ? (
                <QuizView
                  attempt={quizData!.attempt}
                  questions={questions}
                  currentIndex={currentQuestionIndex}
                  selectedAnswers={selectedAnswers}
                  onSelectAnswer={handleSelectAnswer}
                  onSelectQuestion={(i) => setCurrentQuestionIndex(i)}
                  onPrev={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  onNext={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
                  onSubmit={handleSubmit}
                  isSubmitting={submitMutation.isPending}
                  answeredCount={answeredCount}
                />
              ) : null
            )}

            {view === "results" && (
              quizLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : quizData ? (
                <ResultsView
                  attempt={quizData.attempt}
                  questions={quizData.questions}
                  currentIndex={currentQuestionIndex}
                  onSelectQuestion={(i) => setCurrentQuestionIndex(i)}
                  onNewQuiz={handleNewQuiz}
                />
              ) : null
            )}

            {view === "history" && (
              <HistoryView
                history={history || []}
                isLoading={historyLoading}
                onReview={handleReviewAttempt}
              />
            )}

            {view === "analytics" && (
              <AnalyticsView
                data={analyticsData}
                isLoading={analyticsLoading}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function CreateQuizView({
  examType,
  setExamType,
  gsCategory,
  setGsCategory,
  difficulty,
  setDifficulty,
  numQuestions,
  setNumQuestions,
  onGenerate,
  isGenerating,
}: {
  examType: string;
  setExamType: (v: string) => void;
  gsCategory: string;
  setGsCategory: (v: string) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
  numQuestions: string;
  setNumQuestions: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const categories = getCategoriesForExam(examType);
  const nationalExams = EXAM_TYPES.filter(e => e.group === "National");
  const stateExams = EXAM_TYPES.filter(e => e.group === "State PSC");
  const neExams = EXAM_TYPES.filter(e => e.group === "State PSC (NE)");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" data-testid="text-create-heading">Create a Practice Quiz</h2>
        <p className="text-muted-foreground">Generate exam-style MCQs powered by AI for UPSC & State PSC exams</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Select Exam
            </label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger data-testid="select-exam-type">
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">National</div>
                {nationalExams.map((exam) => (
                  <SelectItem key={exam.value} value={exam.value} data-testid={`option-exam-${exam.value}`}>
                    {exam.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">State PSC</div>
                {stateExams.map((exam) => (
                  <SelectItem key={exam.value} value={exam.value} data-testid={`option-exam-${exam.value}`}>
                    {exam.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">North-East PSC</div>
                {neExams.map((exam) => (
                  <SelectItem key={exam.value} value={exam.value} data-testid={`option-exam-${exam.value}`}>
                    {exam.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject / Paper</label>
            <Select value={gsCategory} onValueChange={setGsCategory}>
              <SelectTrigger data-testid="select-gs-category">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} data-testid={`option-gs-${cat.value}`}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty Level</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger data-testid="select-difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value} data-testid={`option-difficulty-${d.value}`}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Questions</label>
            <Select value={numQuestions} onValueChange={setNumQuestions}>
              <SelectTrigger data-testid="select-num-questions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_COUNTS.map((q) => (
                  <SelectItem key={q.value} value={q.value} data-testid={`option-count-${q.value}`}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onGenerate}
            disabled={isGenerating || !gsCategory || !difficulty}
            className="w-full"
            data-testid="button-generate-quiz"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating {getExamLabel(examType)} Quiz...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Quiz
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuizView({
  attempt,
  questions,
  currentIndex,
  selectedAnswers,
  onSelectAnswer,
  onSelectQuestion,
  onPrev,
  onNext,
  onSubmit,
  isSubmitting,
  answeredCount,
}: {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  currentIndex: number;
  selectedAnswers: Record<string, number>;
  onSelectAnswer: (qId: number, optIdx: number) => void;
  onSelectQuestion: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  answeredCount: number;
}) {
  const q = questions[currentIndex];
  const selectedOption = selectedAnswers[String(q.id)];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">{attempt.examType || "UPSC"}</Badge>
          <Badge variant="secondary">{attempt.gsCategory}</Badge>
          <Badge variant="outline" className="capitalize">{attempt.difficulty}</Badge>
        </div>
        <span className="text-sm text-muted-foreground" data-testid="text-quiz-progress">
          {answeredCount} of {questions.length} answered
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelectQuestion(i)}
            className={cn(
              "w-8 h-8 rounded-md text-xs font-medium border transition-colors flex items-center justify-center",
              i === currentIndex
                ? "bg-primary text-primary-foreground border-primary"
                : selectedAnswers[String(questions[i].id)] !== undefined
                ? "bg-primary/20 border-primary/30 text-foreground"
                : "bg-background border-border text-muted-foreground"
            )}
            data-testid={`button-question-nav-${i}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">Question {currentIndex + 1} of {questions.length}</p>
          <p className="text-base font-medium mb-5" data-testid="text-question">{renderQuizText(q.question)}</p>

          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => onSelectAnswer(q.id, i)}
                className={cn(
                  "w-full text-left p-3 rounded-md border text-sm transition-colors flex items-start gap-3",
                  selectedOption === i
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-background border-border text-foreground hover-elevate"
                )}
                data-testid={`button-option-${i}`}
              >
                <span className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold",
                  selectedOption === i
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{renderQuizText(opt)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={currentIndex === 0}
          data-testid="button-prev-question"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button onClick={onNext} data-testid="button-next-question">
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || answeredCount === 0}
            data-testid="button-submit-quiz"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Quiz ({answeredCount}/{questions.length})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultsView({
  attempt,
  questions,
  currentIndex,
  onSelectQuestion,
  onNewQuiz,
}: {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  currentIndex: number;
  onSelectQuestion: (i: number) => void;
  onNewQuiz: () => void;
}) {
  const score = attempt.score ?? 0;
  const total = attempt.totalQuestions;
  const percentage = Math.round((score / total) * 100);
  const q = questions[currentIndex];

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-xl font-bold" data-testid="text-results-heading">Quiz Results</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default">{attempt.examType || "UPSC"}</Badge>
                <Badge variant="secondary">{attempt.gsCategory}</Badge>
                <Badge variant="outline" className="capitalize">{attempt.difficulty}</Badge>
              </div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-3xl font-bold",
                percentage >= 70 ? "text-green-600 dark:text-green-400" : percentage >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
              )} data-testid="text-score">
                {score}/{total}
              </div>
              <p className="text-sm text-muted-foreground">{percentage}% accuracy</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={onNewQuiz} data-testid="button-new-quiz-from-results">
              <RotateCcw className="h-4 w-4 mr-2" />
              New Quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1.5 flex-wrap">
        {questions.map((quest, i) => (
          <button
            key={i}
            onClick={() => onSelectQuestion(i)}
            className={cn(
              "w-8 h-8 rounded-md text-xs font-medium border transition-colors flex items-center justify-center",
              i === currentIndex
                ? "ring-2 ring-primary ring-offset-1"
                : "",
              quest.isCorrect === true
                ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                : quest.isCorrect === false
                ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                : "bg-muted border-border text-muted-foreground"
            )}
            data-testid={`button-review-nav-${i}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {q && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Question {currentIndex + 1} of {total}</p>
            <p className="text-base font-medium mb-5" data-testid="text-review-question">{renderQuizText(q.question)}</p>

            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctIndex;
                const isUserAnswer = i === q.userAnswer;
                const isWrongAnswer = isUserAnswer && !isCorrect;

                return (
                  <div
                    key={i}
                    className={cn(
                      "w-full p-3 rounded-md border text-sm flex items-start gap-3",
                      isCorrect
                        ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                        : isWrongAnswer
                        ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                        : "bg-background border-border"
                    )}
                    data-testid={`review-option-${i}`}
                  >
                    <span className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold",
                      isCorrect
                        ? "bg-green-500 text-white border-green-500"
                        : isWrongAnswer
                        ? "bg-red-500 text-white border-red-500"
                        : "border-muted-foreground/30"
                    )}>
                      {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : isWrongAnswer ? <XCircle className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{renderQuizText(opt)}</span>
                    {isCorrect && <Badge variant="secondary" className="ml-auto flex-shrink-0">Correct</Badge>}
                    {isWrongAnswer && <Badge variant="destructive" className="ml-auto flex-shrink-0">Your Answer</Badge>}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div className="mt-4 p-4 rounded-md bg-muted/50 border border-border">
                <p className="text-sm font-medium mb-1 text-muted-foreground">Explanation</p>
                <p className="text-sm" data-testid="text-explanation">{q.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => onSelectQuestion(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          data-testid="button-review-prev"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => onSelectQuestion(Math.min(questions.length - 1, currentIndex + 1))}
          disabled={currentIndex === questions.length - 1}
          data-testid="button-review-next"
        >
          Next
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function HistoryView({
  history,
  isLoading,
  onReview,
}: {
  history: QuizAttempt[];
  isLoading: boolean;
  onReview: (a: QuizAttempt) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-history-heading">Quiz History</h2>
      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No quizzes taken yet. Create your first quiz!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((attempt) => {
            const isComplete = attempt.score !== null;
            const percentage = isComplete ? Math.round(((attempt.score ?? 0) / attempt.totalQuestions) * 100) : 0;

            return (
              <Card
                key={attempt.id}
                className="cursor-pointer hover-elevate"
                onClick={() => isComplete && onReview(attempt)}
                data-testid={`card-history-${attempt.id}`}
              >
                <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center",
                      isComplete
                        ? percentage >= 70
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : percentage >= 40
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isComplete ? <Trophy className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">{attempt.examType || "UPSC"}</Badge>
                        <span className="font-medium text-sm">{attempt.gsCategory}</span>
                        <Badge variant="outline" className="capitalize text-xs">{attempt.difficulty}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.createdAt).toLocaleDateString()} - {attempt.totalQuestions} questions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isComplete ? (
                      <>
                        <span className={cn(
                          "text-lg font-bold",
                          percentage >= 70 ? "text-green-600 dark:text-green-400" : percentage >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                        )} data-testid={`text-score-${attempt.id}`}>
                          {attempt.score}/{attempt.totalQuestions}
                        </span>
                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                      </>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsView({
  data,
  isLoading,
}: {
  data: { analytics: any[]; recentTrend: any[] } | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const analytics = data?.analytics || [];
  const recentTrend = data?.recentTrend || [];

  const overallQuestions = analytics.reduce((s, a) => s + (a.totalQuestions || 0), 0);
  const overallCorrect = analytics.reduce((s, a) => s + (a.totalCorrect || 0), 0);
  const overallAttempts = analytics.reduce((s, a) => s + (a.totalAttempts || 0), 0);
  const overallAccuracy = overallQuestions > 0 ? Math.round((overallCorrect / overallQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold" data-testid="text-analytics-heading">Performance Analytics</h2>

      {analytics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Complete some quizzes to see your performance analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold" data-testid="text-overall-accuracy">{overallAccuracy}%</p>
                <p className="text-sm text-muted-foreground">Overall Accuracy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <ListChecks className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold" data-testid="text-total-quizzes">{overallAttempts}</p>
                <p className="text-sm text-muted-foreground">Quizzes Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Brain className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold" data-testid="text-total-questions">{overallQuestions}</p>
                <p className="text-sm text-muted-foreground">Questions Answered</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accuracy by Exam & Paper</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.map((a, idx) => (
                  <div key={`${a.examType}-${a.gsCategory}-${idx}`} data-testid={`analytics-category-${a.gsCategory}`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">{a.examType || "UPSC"}</Badge>
                        <span className="text-sm font-medium">{a.gsCategory}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {a.totalCorrect}/{a.totalQuestions} ({a.avgScore}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          a.avgScore >= 70
                            ? "bg-green-500"
                            : a.avgScore >= 40
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(a.avgScore, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.totalAttempts} quiz{a.totalAttempts !== 1 ? "zes" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {recentTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Performance (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTrend.map((r, i) => {
                    const pct = Math.round((r.score / r.totalQuestions) * 100);
                    return (
                      <div key={i} className="flex items-center justify-between gap-4 py-1.5 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-xs">{r.examType || "UPSC"}</Badge>
                          <Badge variant="secondary" className="text-xs">{r.gsCategory}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          pct >= 70 ? "text-green-600 dark:text-green-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {r.score}/{r.totalQuestions} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
