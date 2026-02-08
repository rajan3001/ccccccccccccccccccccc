import { useState, useRef, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import {
  useCurrentAffairs,
  useGenerateCurrentAffairs,
  useToggleRevision,
  useRevisionStats,
  useCurrentAffairsDates,
} from "@/hooks/use-current-affairs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Loader2,
  Sparkles,
  Check,
  BookOpen,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CalendarDays,
  Landmark,
  Globe,
  TrendingUp,
  Microscope,
  Trees,
  Scale,
  Users,
  Trophy,
  MapPin,
  Download,
  Newspaper,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePDF, currentAffairsToPDFSections } from "@/lib/pdf-generator";

const GS_COLORS: Record<string, string> = {
  "GS-I": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "GS-II": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "GS-III": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "GS-IV": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Prelims": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const CATEGORY_ICONS: Record<string, typeof Landmark> = {
  "National": Landmark,
  "International": Globe,
  "Economy": TrendingUp,
  "Science & Tech": Microscope,
  "Environment": Trees,
  "Polity & Governance": Scale,
  "Social Issues": Users,
  "Sports & Culture": Trophy,
  "State": MapPin,
};

const STATE_FILTERS = [
  { value: "none", label: "National Only (UPSC)" },
  { value: "Jharkhand", label: "Jharkhand (JPSC)" },
  { value: "Bihar", label: "Bihar (BPSC)" },
  { value: "Jammu & Kashmir", label: "J&K (JKPSC)" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh (UPPSC)" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh (MPPSC)" },
  { value: "Rajasthan", label: "Rajasthan (RPSC)" },
  { value: "Odisha", label: "Odisha (OPSC)" },
  { value: "Haryana", label: "Haryana (HPSC)" },
  { value: "Uttarakhand", label: "Uttarakhand (UKPSC)" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh (HPPSC)" },
  { value: "Assam", label: "Assam (APSC)" },
  { value: "Meghalaya", label: "Meghalaya PSC" },
  { value: "Sikkim", label: "Sikkim PSC" },
  { value: "Tripura", label: "Tripura PSC" },
  { value: "Arunachal Pradesh", label: "Arunachal PSC" },
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CurrentAffairsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [stateFilter, setStateFilter] = useState("none");
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);
  const [detailContent, setDetailContent] = useState<Record<number, string>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const dateStr = formatDate(selectedDate);
  const { data, isLoading } = useCurrentAffairs(dateStr);
  const generateMutation = useGenerateCurrentAffairs();
  const toggleRevision = useToggleRevision();
  const { data: stats } = useRevisionStats();
  const { data: availableDates } = useCurrentAffairsDates();

  const topics = data?.topics || [];
  const hasDigest = !!data?.digest;

  const revisedCount = topics.filter((t) => t.revised).length;
  const totalCount = topics.length;

  const handleGenerate = () => {
    generateMutation.mutate({ date: dateStr, stateFilter: stateFilter === "none" ? null : stateFilter });
  };

  const handleToggleRevised = (topicId: number, currentState: boolean) => {
    toggleRevision.mutate({ topicId, revised: !currentState });
  };

  const handleReadInDetail = useCallback((topicId: number) => {
    if (expandedTopicId === topicId) {
      setExpandedTopicId(null);
      return;
    }

    setExpandedTopicId(topicId);

    if (topicId in detailContent) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoadingDetail(topicId);
    setDetailContent((prev) => ({ ...prev, [topicId]: "" }));

    fetch(`/api/current-affairs/topics/${topicId}/detail`, {
      signal: controller.signal,
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to fetch");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const parsed = JSON.parse(dataLine.slice(6));
              if (parsed.text) {
                setDetailContent((prev) => ({
                  ...prev,
                  [topicId]: (prev[topicId] || "") + parsed.text,
                }));
              }
              if (parsed.done) {
                setLoadingDetail((prev) => prev === topicId ? null : prev);
                abortControllerRef.current = null;
              }
              if (parsed.error) {
                toast({ title: parsed.error, variant: "destructive" });
                setLoadingDetail((prev) => prev === topicId ? null : prev);
                abortControllerRef.current = null;
              }
            } catch {}
          }
        }
        setLoadingDetail((prev) => prev === topicId ? null : prev);
        abortControllerRef.current = null;
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          toast({ title: "Failed to load details", variant: "destructive" });
          setLoadingDetail((prev) => prev === topicId ? null : prev);
        }
        abortControllerRef.current = null;
      });
  }, [expandedTopicId, detailContent, toast]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const today = new Date();
    if (next <= today) {
      setSelectedDate(next);
    }
  };

  const availableDateSet = new Set(availableDates?.map((d) => d.date) || []);
  const isToday = formatDate(new Date()) === dateStr;

  const groupedByCategory = topics.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, typeof topics>);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6 pb-20">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold" data-testid="text-page-title">
                  Daily Current Affairs
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
                  Curated from The Hindu, Indian Express &amp; leading state newspapers
                </p>
              </div>

              {stats && stats.total > 0 && (
                <div className="hidden sm:flex">
                  <Card className="p-3 flex items-center gap-3 min-w-[200px]">
                    <BarChart3 className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">
                        Overall Revision
                      </div>
                      <Progress
                        value={(stats.revised / stats.total) * 100}
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {stats.revised}/{stats.total} topics
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              data-testid="button-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowCalendar(!showCalendar)}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm"
              data-testid="button-toggle-calendar"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="font-medium truncate max-w-[180px] sm:max-w-none">{formatDisplayDate(dateStr)}</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              disabled={isToday}
              data-testid="button-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                data-testid="button-go-today"
              >
                Today
              </Button>
            )}
          </div>

          {showCalendar && (
            <Card className="mb-6 p-4 inline-block">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                modifiers={{
                  hasDigest: (date: Date) => availableDateSet.has(formatDate(date)),
                }}
                modifiersClassNames={{
                  hasDigest: "bg-primary/20 font-bold",
                }}
              />
            </Card>
          )}

          {totalCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>
                  {revisedCount}/{totalCount} revised
                </span>
              </div>
              <Progress
                value={totalCount > 0 ? (revisedCount / totalCount) * 100 : 0}
                className="h-2 flex-1 max-w-[200px]"
              />
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-download-ca-pdf"
                onClick={async () => {
                  try {
                    const sections = currentAffairsToPDFSections(topics);
                    await generatePDF({
                      title: `Daily Current Affairs - ${formatDisplayDate(dateStr)}`,
                      subtitle: "AI-curated UPSC-relevant topics by Learnpro AI",
                      sections,
                      fileName: `learnpro-current-affairs-${dateStr}.pdf`,
                    });
                    toast({ title: "PDF downloaded successfully" });
                  } catch {
                    toast({ title: "Failed to generate PDF", variant: "destructive" });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download PDF
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : !hasDigest ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No digest for {formatDisplayDate(dateStr)}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md">
                Generate a daily digest of important news from The Hindu, Indian Express and leading state newspapers, curated for UPSC and State PSC exam preparation.
              </p>

              <div className="w-full max-w-xs mb-6">
                <label className="text-sm font-medium flex items-center gap-2 mb-2 justify-center">
                  <MapPin className="h-4 w-4" />
                  Include State-Specific News
                </label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger data-testid="select-state-filter">
                    <SelectValue placeholder="Select state focus" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_FILTERS.map((s) => (
                      <SelectItem key={s.value} value={s.value} data-testid={`option-state-${s.value}`}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="gap-2"
                data-testid="button-generate-digest"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Daily Digest{stateFilter !== "none" ? ` + ${stateFilter} News` : ""}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByCategory).map(([category, categoryTopics]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    {(() => {
                      const Icon = CATEGORY_ICONS[category];
                      return Icon ? <Icon className="h-4 w-4" /> : null;
                    })()}
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryTopics.map((topic) => {
                      const isExpanded = expandedTopicId === topic.id;
                      const isLoadingThis = loadingDetail === topic.id;
                      const content = detailContent[topic.id] || "";

                      return (
                        <Card
                          key={topic.id}
                          data-testid={`card-topic-${topic.id}`}
                          className={cn(
                            "transition-all",
                            topic.revised && "border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-900/10"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="font-semibold text-base flex-1">{topic.title}</h4>
                              <Badge
                                className={cn(
                                  "text-xs flex-shrink-0 no-default-hover-elevate no-default-active-elevate",
                                  GS_COLORS[topic.gsCategory] || "bg-secondary text-secondary-foreground"
                                )}
                              >
                                {topic.gsCategory}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {topic.summary}
                            </p>

                            {topic.relevance && (
                              <p className="text-xs text-primary/80 italic mb-3">
                                Exam relevance: {topic.relevance}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant={topic.revised ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleToggleRevised(topic.id, topic.revised)}
                                  disabled={toggleRevision.isPending}
                                  className={cn(
                                    "gap-1",
                                    topic.revised && "bg-green-600 border-green-600 text-white"
                                  )}
                                  data-testid={`button-revise-${topic.id}`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  {topic.revised ? "Revised" : "Mark Revised"}
                                </Button>

                                <Button
                                  variant={isExpanded ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleReadInDetail(topic.id)}
                                  disabled={isLoadingThis}
                                  className="gap-1"
                                  data-testid={`button-read-detail-${topic.id}`}
                                >
                                  {isLoadingThis ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <BookOpenCheck className="h-3.5 w-3.5" />
                                  )}
                                  Read in Detail
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>

                              {topic.source && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-source-${topic.id}`}>
                                  <Newspaper className="h-3 w-3" />
                                  {topic.source}
                                </span>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t" data-testid={`detail-panel-${topic.id}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                                    <BookOpenCheck className="h-4 w-4" />
                                    Detailed Analysis
                                  </h5>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setExpandedTopicId(null)}
                                    data-testid={`button-close-detail-${topic.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                {isLoadingThis && !content && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating detailed analysis...
                                  </div>
                                )}

                                {content && (
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:text-foreground prose-h2:text-lg prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-1.5 prose-p:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-strong:font-bold">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                    {isLoadingThis && (
                                      <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
