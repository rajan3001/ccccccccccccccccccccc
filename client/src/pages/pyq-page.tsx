import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/i18n/context";
import { InlineLanguageButton } from "@/components/inline-language-button";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { PYQ_TOPICS } from "@shared/schema";
import type { PyqQuestion, PyqMainsFeedback } from "@shared/schema";
import {
  ScrollText, ChevronLeft, ChevronRight, Filter, RotateCcw,
  Check, X, ArrowRight, TrendingUp, BarChart3, Target, Award,
  FileText, Loader2, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from "recharts";

type StageTab = "Prelims" | "Mains";
type SubTab = "browse" | "trends" | "stats";

function mergeQuestionLines(raw: string): string[] {
  const rawLines = raw.split('\n');
  const merged: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line === '') { merged.push(''); continue; }

    const isStructural =
      /^\d+\.\s/.test(line) ||
      /^\(?[a-d]\)\s/i.test(line) ||
      /^select the correct/i.test(line) ||
      /^which of the/i.test(line) ||
      /^how many of the/i.test(line) ||
      /^consider the following/i.test(line) ||
      /^with reference to/i.test(line);

    if (isStructural || merged.length === 0) {
      merged.push(line);
    } else {
      const prev = merged[merged.length - 1];
      const prevIsEmpty = prev === '';
      const prevIsStructural =
        /^\d+\.\s/.test(prev) ||
        /^\(?[a-d]\)\s/i.test(prev);

      if (prevIsEmpty) {
        merged.push(line);
      } else if (prevIsStructural) {
        merged[merged.length - 1] = prev + ' ' + line;
      } else {
        const prevEndsClean = /[.?!:;,)\]]$/.test(prev.trim());
        if (prevEndsClean) {
          merged.push(line);
        } else {
          merged[merged.length - 1] = prev + ' ' + line;
        }
      }
    }
  }

  return merged.filter(l => l !== '');
}

function FormattedQuestionText({ text, className, prefix, hasOptions }: { text: string; className?: string; prefix?: string; hasOptions?: boolean }) {
  const parts = useMemo(() => {
    let lines = mergeQuestionLines(text);
    if (hasOptions) {
      const optionLines = lines.filter(l => /^\(?[a-d]\)\s/i.test(l.trim()));
      const nonOptionLines = lines.filter(l => !/^\(?[a-d]\)\s/i.test(l.trim()));
      if (nonOptionLines.length > 0) {
        lines = nonOptionLines;
      }
    }
    const elements: React.ReactNode[] = [];
    let i = 0;
    let prefixUsed = false;

    const addPrefix = () => {
      if (prefix && !prefixUsed) {
        prefixUsed = true;
        return <span className="font-semibold">{prefix} </span>;
      }
      return null;
    };

    while (i < lines.length) {
      const line = lines[i].trim();
      if (line === '') { i++; continue; }

      const hasColonPairs = (() => {
        if (i + 2 >= lines.length) return false;
        let pairCount = 0;
        for (let j = i; j < Math.min(i + 8, lines.length); j++) {
          if (/^\(?[a-d]\)?\s+.+\s*:\s*.+/i.test(lines[j].trim())) pairCount++;
        }
        return pairCount >= 2;
      })();

      if (hasColonPairs) {
        const headerLine = lines[i]?.trim();
        let headerCols: [string, string] | null = null;
        const headerMatch = headerLine.match(/^(.+?)\s{2,}(.+)$/);
        if (headerMatch && !/^\(?[a-d]\)/i.test(headerLine)) {
          headerCols = [headerMatch[1].trim(), headerMatch[2].trim()];
          i++;
        }

        const rows: [string, string, string][] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          const m = l.match(/^\(?([a-d])\)?\s+(.+?)\s*:\s*(.+)/i);
          if (m) {
            rows.push([m[1], m[2].trim(), m[3].trim()]);
            i++;
          } else break;
        }

        if (rows.length >= 2) {
          elements.push(
            <div key={`tbl-${elements.length}`} className="my-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                {headerCols && (
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-3 py-1.5 text-left font-semibold w-8"></th>
                      <th className="border border-border px-3 py-1.5 text-left font-semibold">{headerCols[0]}</th>
                      <th className="border border-border px-3 py-1.5 text-left font-semibold">{headerCols[1]}</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri} className={ri % 2 === 1 ? "bg-muted/30" : ""}>
                      <td className="border border-border px-3 py-1.5 text-center font-medium">({r[0]})</td>
                      <td className="border border-border px-3 py-1.5">{r[1]}</td>
                      <td className="border border-border px-3 py-1.5">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        const items: { num: string; text: string }[] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          const nm = l.match(/^(\d+)\.\s+(.+)/);
          if (nm) {
            items.push({ num: nm[1], text: nm[2] });
            i++;
          } else break;
        }
        elements.push(
          <div key={`list-${elements.length}`} className="my-2 ml-1 space-y-1">
            {items.map((item, ii) => (
              <div key={ii} className="flex gap-2">
                <span className="text-muted-foreground font-medium flex-shrink-0 w-5 text-right">{item.num}.</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        );
        continue;
      }

      const optionLineMatch = line.match(/^\(?([a-d])\)\s+(.+)/i);
      if (optionLineMatch) {
        const opts: { letter: string; text: string }[] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          const om = l.match(/^\(?([a-d])\)\s+(.+)/i);
          if (om) {
            opts.push({ letter: om[1], text: om[2] });
            i++;
          } else break;
        }
        elements.push(
          <div key={`opts-${elements.length}`} className="my-2 ml-1 space-y-0.5">
            {opts.map((o, oi) => (
              <div key={oi} className="flex gap-2">
                <span className="text-muted-foreground font-medium flex-shrink-0">({o.letter})</span>
                <span>{o.text}</span>
              </div>
            ))}
          </div>
        );
        continue;
      }

      const p = addPrefix();
      elements.push(<span key={`line-${elements.length}`}>{p}{line}{'\n'}</span>);
      i++;
    }

    if (!prefixUsed && prefix) {
      elements.unshift(<span key="prefix-only" className="font-semibold">{prefix} </span>);
    }

    return elements;
  }, [text, prefix, hasOptions]);

  return <div className={className}>{parts}</div>;
}

function formatOptionText(text: string): React.ReactNode {
  if (!text.includes('\n')) return text;
  return <span style={{ whiteSpace: 'pre-line' }}>{text}</span>;
}

interface QuestionWithAttempt extends PyqQuestion {
  attempted: boolean;
  attemptResult: {
    questionId: number;
    isCorrect: boolean | null;
    aiScore: number | null;
    aiMaxScore: number | null;
  } | null;
}

interface QuestionsResponse {
  questions: QuestionWithAttempt[];
  total: number;
  page: number;
  totalPages: number;
}

interface TrendItem {
  topic: string;
  totalAppearances: number;
  lastAppearance: number;
  streak: number;
  prediction: "High" | "Medium" | "Low";
  trendScore: number;
  years: number[];
}

interface TrendsResponse {
  prelims: TrendItem[];
  mains: TrendItem[];
}

interface StatsResponse {
  prelims: { attempted: number; correct: number; accuracy: number };
  mains: { attempted: number; avgScore: number };
  accuracyByTopic: { topic: string; attempted: number; correct: number; accuracy: number }[];
  accuracyByPaper: { paperType: string; attempted: number; correct: number; accuracy: number }[];
}

interface YearsResponse {
  examType: string;
  stages: {
    stage: string;
    years: { year: number; papers: string[]; questionCount: number }[];
  }[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  Hard: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const PREDICTION_COLORS: Record<string, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  Low: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
};

export default function PyqPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [stageTab, setStageTab] = useState<StageTab>("Prelims");
  const [subTab, setSubTab] = useState<SubTab>("browse");

  const [filters, setFilters] = useState({
    year: "",
    topic: "",
    difficulty: "",
    paperType: "",
    page: 1,
  });

  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<QuestionWithAttempt[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [mcqResult, setMcqResult] = useState<{ isCorrect: boolean; correctIndex: number | null; explanation: string | null } | null>(null);
  const [mainsAnswer, setMainsAnswer] = useState("");
  const [mainsResult, setMainsResult] = useState<{ score: number; maxScore: number; feedback: PyqMainsFeedback } | null>(null);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [practiceResults, setPracticeResults] = useState<{ questionId: number; isCorrect: boolean | null; score?: number; maxScore?: number }[]>([]);

  const queryParams = new URLSearchParams();
  queryParams.set("examStage", stageTab);
  if (filters.year) queryParams.set("year", filters.year);
  if (filters.topic) queryParams.set("topic", filters.topic);
  if (filters.difficulty) queryParams.set("difficulty", filters.difficulty);
  if (filters.paperType && stageTab === "Mains") queryParams.set("paperType", filters.paperType);
  queryParams.set("page", String(filters.page));
  queryParams.set("limit", "20");

  const { data: questionsData, isLoading: questionsLoading } = useQuery<QuestionsResponse>({
    queryKey: ["/api/pyq/questions", `?${queryParams.toString()}`],
    enabled: subTab === "browse" && !practiceMode,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery<TrendsResponse>({
    queryKey: ["/api/pyq/trends"],
    enabled: subTab === "trends",
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/pyq/stats"],
    enabled: subTab === "stats",
  });

  const { data: yearsData } = useQuery<YearsResponse[]>({
    queryKey: ["/api/pyq/years"],
  });

  const attemptMutation = useMutation({
    mutationFn: async (body: { questionId: number; userAnswer: string }) => {
      const res = await apiRequest("POST", "/api/pyq/attempt", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pyq/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pyq/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pyq/history"] });
    },
  });

  const availableYears = useMemo(() => {
    if (!yearsData) return [];
    const years = new Set<number>();
    for (const exam of yearsData) {
      for (const stage of exam.stages) {
        if (stage.stage === stageTab) {
          for (const y of stage.years) years.add(y.year);
        }
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [yearsData, stageTab]);

  const availablePapers = useMemo(() => {
    if (stageTab === "Prelims") return ["GS"];
    return ["GS-I", "GS-II", "GS-III", "GS-IV", "Essay"];
  }, [stageTab]);

  const currentQuestion = practiceQuestions[currentQIndex];
  const wordCount = mainsAnswer.trim().split(/\s+/).filter(Boolean).length;

  const resetFilters = () => {
    setFilters({ year: "", topic: "", difficulty: "", paperType: "", page: 1 });
  };

  const startPractice = (questions: QuestionWithAttempt[]) => {
    setPracticeQuestions(questions);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setMcqResult(null);
    setMainsAnswer("");
    setMainsResult(null);
    setPracticeCompleted(false);
    setPracticeResults([]);
    setPracticeMode(true);
  };

  const handleMcqSubmit = () => {
    if (selectedOption === null || !currentQuestion) return;
    attemptMutation.mutate(
      { questionId: currentQuestion.id, userAnswer: String(selectedOption) },
      {
        onSuccess: (data) => {
          setMcqResult({
            isCorrect: data.isCorrect,
            correctIndex: data.correctIndex,
            explanation: data.explanation,
          });
          setSubmitted(true);
          setPracticeResults(prev => [...prev, {
            questionId: currentQuestion.id,
            isCorrect: data.isCorrect,
          }]);
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleMainsSubmit = () => {
    if (!mainsAnswer.trim() || !currentQuestion) return;
    attemptMutation.mutate(
      { questionId: currentQuestion.id, userAnswer: mainsAnswer },
      {
        onSuccess: (data) => {
          setMainsResult({
            score: data.score,
            maxScore: data.maxScore,
            feedback: data.feedback,
          });
          setSubmitted(true);
          setPracticeResults(prev => [...prev, {
            questionId: currentQuestion.id,
            isCorrect: null,
            score: data.score,
            maxScore: data.maxScore,
          }]);
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 >= practiceQuestions.length) {
      setPracticeCompleted(true);
      return;
    }
    setCurrentQIndex(prev => prev + 1);
    setSelectedOption(null);
    setSubmitted(false);
    setMcqResult(null);
    setMainsAnswer("");
    setMainsResult(null);
  };

  const exitPractice = () => {
    setPracticeMode(false);
    setPracticeQuestions([]);
    setCurrentQIndex(0);
    setPracticeCompleted(false);
    setPracticeResults([]);
  };

  const handleTrendTopicClick = (topic: string) => {
    setFilters({ year: "", topic, difficulty: "", paperType: "", page: 1 });
    setSubTab("browse");
  };

  const stageTrends = stageTab === "Prelims" ? trendsData?.prelims : trendsData?.mains;
  const top15Trends = stageTrends?.slice(0, 15) || [];

  if (practiceMode && practiceCompleted) {
    const correctCount = practiceResults.filter(r => r.isCorrect === true).length;
    const totalMcq = practiceResults.filter(r => r.isCorrect !== null).length;
    const mainsResults = practiceResults.filter(r => r.score !== undefined);
    const mainsAvg = mainsResults.length > 0
      ? Math.round(mainsResults.reduce((s, r) => s + (r.score || 0), 0) / mainsResults.length * 10) / 10
      : 0;

    return (
      <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <CardTitle data-testid="text-practice-complete">Practice Set Complete</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-foreground" data-testid="text-total-questions">{practiceResults.length}</div>
                      <div className="text-sm text-muted-foreground">Questions</div>
                    </CardContent>
                  </Card>
                  {totalMcq > 0 && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-emerald-600" data-testid="text-correct-count">{correctCount}/{totalMcq}</div>
                        <div className="text-sm text-muted-foreground">Correct ({Math.round((correctCount / totalMcq) * 100)}%)</div>
                      </CardContent>
                    </Card>
                  )}
                  {mainsResults.length > 0 && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-amber-600" data-testid="text-mains-avg">{mainsAvg}/10</div>
                        <div className="text-sm text-muted-foreground">Avg AI Score</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={exitPractice} data-testid="button-back-to-browse">
                    Back to Browse
                  </Button>
                  <Button variant="outline" onClick={() => startPractice(practiceQuestions)} data-testid="button-retry-set">
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Retry Set
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (practiceMode && currentQuestion) {
    const isMcq = currentQuestion.questionType === "mcq";
    const suggestedWords = Math.round((currentQuestion.marks / 10) * 200);

    return (
      <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <Button variant="ghost" size="sm" onClick={exitPractice} data-testid="button-exit-practice">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Exit Practice
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-progress">
                Question {currentQIndex + 1} of {practiceQuestions.length}
              </div>
            </div>

            {practiceQuestions.length > 1 && (
              <Progress
                value={((currentQIndex + 1) / practiceQuestions.length) * 100}
                className="mb-4 h-2"
                data-testid="progress-bar"
              />
            )}

            <Card className="mb-4">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-exam-info">
                    {currentQuestion.examType} {currentQuestion.year}
                  </Badge>
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-stage">
                    {currentQuestion.examStage}
                  </Badge>
                  {currentQuestion.paperType && (
                    <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-paper">
                      {currentQuestion.paperType}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-marks">
                    {currentQuestion.marks} marks
                  </Badge>
                </div>
                <div className="text-base font-medium text-foreground leading-relaxed" data-testid="text-question">
                  <FormattedQuestionText text={currentQuestion.questionText} prefix={`Q${currentQuestion.questionNumber}.`} hasOptions={!!currentQuestion.options?.length} />
                </div>
              </CardContent>
            </Card>

            {isMcq ? (
              <div className="space-y-3 mb-4">
                {currentQuestion.options?.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = mcqResult?.correctIndex === idx;
                  const isWrong = submitted && isSelected && !mcqResult?.isCorrect;

                  return (
                    <button
                      key={idx}
                      onClick={() => !submitted && setSelectedOption(idx)}
                      disabled={submitted}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-all",
                        submitted
                          ? isCorrect
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                            : isWrong
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : "border-border"
                          : isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover-elevate cursor-pointer"
                      )}
                      data-testid={`option-${idx}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold border",
                          submitted && isCorrect
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : submitted && isWrong
                              ? "bg-red-500 text-white border-red-500"
                              : isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border"
                        )}>
                          {submitted && isCorrect ? <Check className="h-4 w-4" /> :
                           submitted && isWrong ? <X className="h-4 w-4" /> :
                           String.fromCharCode(65 + idx)}
                        </div>
                        <span className={cn(
                          "text-sm",
                          submitted && isWrong && "line-through text-muted-foreground"
                        )}>
                          {formatOptionText(option)}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {!submitted && (
                  <Button
                    className="w-full"
                    disabled={selectedOption === null || attemptMutation.isPending}
                    onClick={handleMcqSubmit}
                    data-testid="button-submit-answer"
                  >
                    {attemptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Submit Answer
                  </Button>
                )}

                {submitted && mcqResult && (
                  <Card className={cn(
                    "border-l-4",
                    mcqResult.isCorrect ? "border-l-emerald-500" : "border-l-red-500"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {mcqResult.isCorrect
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          : <XCircle className="h-5 w-5 text-red-500" />
                        }
                        <span className={cn("font-semibold", mcqResult.isCorrect ? "text-emerald-600" : "text-red-600")} data-testid="text-result">
                          {mcqResult.isCorrect ? t.pyq.correctResult : t.pyq.incorrectResult}
                        </span>
                      </div>
                      {mcqResult.explanation && (
                        <p className="text-sm text-muted-foreground" data-testid="text-explanation">{mcqResult.explanation}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {currentQuestion.topic && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-topic">{currentQuestion.topic}</Badge>
                        )}
                        {currentQuestion.difficulty && (
                          <Badge className={cn("no-default-hover-elevate no-default-active-elevate", DIFFICULTY_COLORS[currentQuestion.difficulty])} data-testid="badge-difficulty">
                            {currentQuestion.difficulty}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {!submitted && (
                  <>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">Write your answer below</span>
                        <span className="text-xs text-muted-foreground" data-testid="text-suggested-length">
                          Suggested: {suggestedWords - 50}-{suggestedWords + 50} words
                        </span>
                      </div>
                      <Textarea
                        value={mainsAnswer}
                        onChange={(e) => setMainsAnswer(e.target.value)}
                        rows={12}
                        className="resize-y text-sm"
                        data-testid="textarea-mains-answer"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground" data-testid="text-word-count">{wordCount} words</span>
                        <span className="text-xs text-muted-foreground">{mainsAnswer.length} characters</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!mainsAnswer.trim() || attemptMutation.isPending}
                      onClick={handleMainsSubmit}
                      data-testid="button-submit-evaluation"
                    >
                      {attemptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                      {attemptMutation.isPending ? t.pyq.evaluatingAnswer : t.pyq.submitForEvaluation}
                    </Button>
                  </>
                )}

                {attemptMutation.isPending && submitted === false && (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Evaluating your answer...</p>
                    </CardContent>
                  </Card>
                )}

                {submitted && mainsResult && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-center mb-4">
                          <div className="relative h-24 w-24">
                            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none" stroke="currentColor" strokeWidth="3" className="text-primary"
                                strokeDasharray={`${(mainsResult.score / mainsResult.maxScore) * 100}, 100`} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold" data-testid="text-ai-score">{mainsResult.score}</span>
                              <span className="text-xs text-muted-foreground">/{mainsResult.maxScore}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            { label: t.pyq.introduction, value: mainsResult.feedback.introduction, max: 2 },
                            { label: t.pyq.body, value: mainsResult.feedback.body, max: 4 },
                            { label: t.pyq.conclusion, value: mainsResult.feedback.conclusion, max: 2 },
                            { label: t.pyq.contentCoverage, value: mainsResult.feedback.contentCoverage, max: 2 },
                          ].map((item) => (
                            <div key={item.label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium" data-testid={`text-rubric-${item.label.toLowerCase().replace(/\s/g, "-")}`}>{item.label}</span>
                                <span className="text-xs text-muted-foreground">{item.value}/{item.max}</span>
                              </div>
                              <Progress value={(item.value / item.max) * 100} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {mainsResult.feedback.strengths.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2" data-testid="text-strengths-title">{t.pyq.strengths}</h4>
                          <ul className="space-y-1.5">
                            {mainsResult.feedback.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span data-testid={`text-strength-${i}`}>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {mainsResult.feedback.improvements.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2" data-testid="text-improvements-title">{t.pyq.areasToImprove}</h4>
                          <ul className="space-y-1.5">
                            {mainsResult.feedback.improvements.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span data-testid={`text-improvement-${i}`}>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {mainsResult.feedback.overallFeedback && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold mb-2" data-testid="text-overall-title">{t.pyq.overallFeedback}</h4>
                          <p className="text-sm text-muted-foreground" data-testid="text-overall-feedback">{mainsResult.feedback.overallFeedback}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {submitted && (
              <div className="flex flex-wrap gap-2">
                {!isMcq && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setMainsAnswer("");
                      setMainsResult(null);
                    }}
                    data-testid="button-try-again"
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    {t.pyq.tryAgain}
                  </Button>
                )}
                <Button onClick={handleNextQuestion} data-testid="button-next-question">
                  {currentQIndex + 1 >= practiceQuestions.length ? t.pyq.finish : t.pyq.nextQuestion}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-5 pb-20">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">{t.pyq.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t.pyq.browse}</p>
            </div>
            <InlineLanguageButton />
          </div>

          <div className="flex items-center gap-1 mb-4 border-b">
            {(["Prelims", "Mains"] as StageTab[]).map(stage => (
              <button
                key={stage}
                onClick={() => {
                  setStageTab(stage);
                  setSubTab("browse");
                  resetFilters();
                }}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
                  stageTab === stage
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-${stage.toLowerCase()}`}
              >
                {stage === "Prelims" ? t.pyq.prelimsPyqs : t.pyq.mainsPyqs}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 mb-5">
            {(["browse", "trends", "stats"] as SubTab[]).map(tab => (
              <Button
                key={tab}
                variant={subTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setSubTab(tab)}
                data-testid={`subtab-${tab}`}
              >
                {tab === "browse" && <FileText className="h-3.5 w-3.5 mr-1.5" />}
                {tab === "trends" && <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
                {tab === "stats" && <BarChart3 className="h-3.5 w-3.5 mr-1.5" />}
                {tab === "browse" ? t.pyq.browse : tab === "trends" ? t.pyq.trends : t.pyq.myStats}
              </Button>
            ))}
          </div>

          {subTab === "browse" && (
            <BrowseView
              stageTab={stageTab}
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              questionsData={questionsData}
              questionsLoading={questionsLoading}
              availableYears={availableYears}
              availablePapers={availablePapers}
              startPractice={startPractice}
            />
          )}

          {subTab === "trends" && (
            <TrendsView
              trends={stageTrends || []}
              top15={top15Trends}
              isLoading={trendsLoading}
              stageTab={stageTab}
              onTopicClick={handleTrendTopicClick}
            />
          )}

          {subTab === "stats" && (
            <StatsView
              stats={statsData}
              isLoading={statsLoading}
              stageTab={stageTab}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function BrowseView({
  stageTab, filters, setFilters, resetFilters,
  questionsData, questionsLoading,
  availableYears, availablePapers, startPractice,
}: {
  stageTab: StageTab;
  filters: { year: string; topic: string; difficulty: string; paperType: string; page: number };
  setFilters: (f: any) => void;
  resetFilters: () => void;
  questionsData: QuestionsResponse | undefined;
  questionsLoading: boolean;
  availableYears: number[];
  availablePapers: string[];
  startPractice: (q: QuestionWithAttempt[]) => void;
}) {
  const { t } = useLanguage();
  const hasFilters = filters.year || filters.topic || filters.difficulty || filters.paperType;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">{t.pyq.year}</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value, page: 1 })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            data-testid="select-year"
          >
            <option value="">{t.pyq.allYears}</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">{t.pyq.topic}</label>
          <select
            value={filters.topic}
            onChange={(e) => setFilters({ ...filters, topic: e.target.value, page: 1 })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            data-testid="select-topic"
          >
            <option value="">{t.pyq.allTopics}</option>
            {PYQ_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">{t.pyq.difficulty}</label>
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            data-testid="select-difficulty"
          >
            <option value="">{t.pyq.all}</option>
            <option value="Easy">{t.pyq.easy}</option>
            <option value="Moderate">{t.pyq.moderate}</option>
            <option value="Hard">{t.pyq.hard}</option>
          </select>
        </div>

        {stageTab === "Mains" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">{t.pyq.paper}</label>
            <select
              value={filters.paperType}
              onChange={(e) => setFilters({ ...filters, paperType: e.target.value, page: 1 })}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              data-testid="select-paper"
            >
              <option value="">{t.pyq.allPapers}</option>
              {availablePapers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t.pyq.reset}
          </Button>
        )}
      </div>

      {questionsData && questionsData.questions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-sm text-muted-foreground" data-testid="text-total-results">
            {questionsData.total} {questionsData.total !== 1 ? t.pyq.questionsFound : t.pyq.questionFound}
          </span>
          <Button
            size="sm"
            onClick={() => startPractice(questionsData.questions)}
            data-testid="button-start-practice"
          >
            <Target className="h-3.5 w-3.5 mr-1.5" />
            {t.pyq.practiceAllStage} {filters.year ? `${filters.year} ${stageTab}` : filters.topic ? `${filters.topic} ${stageTab}` : stageTab}
          </Button>
        </div>
      )}

      {questionsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : questionsData && questionsData.questions.length > 0 ? (
        <>
          <div className="space-y-2.5">
            {questionsData.questions.map((q) => (
              <Card
                key={q.id}
                className="hover-elevate cursor-pointer"
                onClick={() => startPractice([q])}
                data-testid={`card-question-${q.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">Q{q.questionNumber}</span>
                        <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                          {q.examType} {q.year}
                        </Badge>
                        {stageTab === "Mains" && q.paperType && (
                          <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                            {q.paperType}
                          </Badge>
                        )}
                        {q.topic && (
                          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                            {q.topic}
                          </Badge>
                        )}
                        {q.difficulty && (
                          <Badge className={cn("text-[10px] no-default-hover-elevate no-default-active-elevate", DIFFICULTY_COLORS[q.difficulty])}>
                            {q.difficulty}
                          </Badge>
                        )}
                        {stageTab === "Mains" && (
                          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                            {q.marks}m
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2" data-testid={`text-question-preview-${q.id}`}>
                        {q.questionText}
                      </p>
                    </div>
                    {q.attempted && (
                      <div className="flex-shrink-0">
                        {q.attemptResult?.isCorrect === true ? (
                          <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center" data-testid={`icon-attempted-${q.id}`}>
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        ) : q.attemptResult?.isCorrect === false ? (
                          <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center" data-testid={`icon-attempted-${q.id}`}>
                            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                        ) : q.attemptResult?.aiScore != null ? (
                          <div className="text-center" data-testid={`icon-attempted-${q.id}`}>
                            <div className="text-xs font-bold text-primary">{q.attemptResult!.aiScore}/{q.attemptResult!.aiMaxScore}</div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {questionsData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                Page {questionsData.page} of {questionsData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= questionsData.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-empty-browse">No Questions Found</h3>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Try adjusting your filters to find questions."
                : `No ${stageTab} questions available yet. Check back after admin uploads PYQ papers.`}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters} data-testid="button-reset-filters-empty">
                {t.pyq.resetFilters}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TrendsView({
  trends, top15, isLoading, stageTab, onTopicClick,
}: {
  trends: TrendItem[];
  top15: TrendItem[];
  isLoading: boolean;
  stageTab: StageTab;
  onTopicClick: (topic: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-empty-trends">No Trend Data</h3>
          <p className="text-sm text-muted-foreground">
            Trend analysis will appear once {stageTab} PYQ data is available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = top15.map(t => ({
    topic: t.topic.length > 15 ? t.topic.slice(0, 13) + ".." : t.topic,
    fullTopic: t.topic,
    appearances: t.totalAppearances,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base" data-testid="text-trends-chart-title">
            Top Topics — {stageTab}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                <XAxis
                  dataKey="topic"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 10 }}
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  formatter={(value: number) => [value, "Appearances"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="appearances" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={`hsl(35, ${70 + (index % 3) * 10}%, ${45 + (index % 4) * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-trends">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Topic</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Appearances</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Last Appeared</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Streak</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Prediction</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t) => (
                  <tr
                    key={t.topic}
                    className="border-b last:border-b-0 hover-elevate cursor-pointer"
                    onClick={() => onTopicClick(t.topic)}
                    data-testid={`row-trend-${t.topic}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{t.topic}</td>
                    <td className="text-center px-3 py-3" data-testid={`text-appearances-${t.topic}`}>{t.totalAppearances}</td>
                    <td className="text-center px-3 py-3 text-muted-foreground">{t.lastAppearance}</td>
                    <td className="text-center px-3 py-3 text-muted-foreground">{t.streak} yr{t.streak !== 1 ? "s" : ""}</td>
                    <td className="text-center px-3 py-3">
                      <Badge className={cn("no-default-hover-elevate no-default-active-elevate", PREDICTION_COLORS[t.prediction])} data-testid={`badge-prediction-${t.topic}`}>
                        {t.prediction}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsView({
  stats, isLoading, stageTab,
}: {
  stats: StatsResponse | undefined;
  isLoading: boolean;
  stageTab: StageTab;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-empty-stats">No Stats Yet</h3>
          <p className="text-sm text-muted-foreground">Start practicing questions to see your stats here.</p>
        </CardContent>
      </Card>
    );
  }

  const isPrelims = stageTab === "Prelims";
  const stageStats = isPrelims ? stats.prelims : stats.mains;
  const topicData = stats.accuracyByTopic.filter(t => t.attempted > 0);
  const paperData = stats.accuracyByPaper.filter(p => p.attempted > 0);

  if ((isPrelims && stats.prelims.attempted === 0) || (!isPrelims && stats.mains.attempted === 0)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-empty-stage-stats">No {stageTab} Attempts</h3>
          <p className="text-sm text-muted-foreground">
            Start practicing {stageTab} questions to track your performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="text-stat-attempted">
              {isPrelims ? stats.prelims.attempted : stats.mains.attempted}
            </div>
            <div className="text-sm text-muted-foreground">Total Attempted</div>
          </CardContent>
        </Card>
        {isPrelims ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600" data-testid="text-stat-correct">
                  {stats.prelims.correct}
                </div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary" data-testid="text-stat-accuracy">
                  {stats.prelims.accuracy}%
                </div>
                <div className="text-sm text-muted-foreground">MCQ Accuracy</div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600" data-testid="text-stat-avg-score">
                {stats.mains.avgScore}/10
              </div>
              <div className="text-sm text-muted-foreground">Mains Average Score</div>
            </CardContent>
          </Card>
        )}
      </div>

      {topicData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base" data-testid="text-accuracy-by-topic">Accuracy by Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topicData.map(t => (
                <div key={t.topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{t.topic}</span>
                    <span className="text-xs text-muted-foreground">{t.accuracy}% ({t.correct}/{t.attempted})</span>
                  </div>
                  <Progress value={t.accuracy} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isPrelims && paperData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base" data-testid="text-accuracy-by-paper">Accuracy by Paper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paperData.map(p => (
                <div key={p.paperType}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.paperType}</span>
                    <span className="text-xs text-muted-foreground">{p.accuracy}% ({p.correct}/{p.attempted})</span>
                  </div>
                  <Progress value={p.accuracy} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
