import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import {
  useCurrentAffairs,
  useGenerateCurrentAffairs,
  useToggleRevision,
  useCurrentAffairsDates,
  useLatestAvailableDate,
} from "@/hooks/use-current-affairs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  MapPin,
  Newspaper,
  Check,
  BookOpen,
  Clock,
  FileText,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePDF, currentAffairsToPDFSections } from "@/lib/pdf-generator";

const GS_CATEGORIES = ["All", "GS-I", "GS-II", "GS-III", "GS-IV", "Prelims"] as const;

const GS_BADGE_COLORS: Record<string, string> = {
  "GS-I": "border-amber-400 text-amber-600 dark:border-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
  "GS-II": "border-emerald-400 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  "GS-III": "border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  "GS-IV": "border-pink-400 text-pink-600 dark:border-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30",
  "Prelims": "border-violet-400 text-violet-600 dark:border-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  "International Relations": "border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  "Economy": "border-emerald-400 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  "Science & Technology": "border-purple-400 text-purple-600 dark:border-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
  "Science & Tech": "border-purple-400 text-purple-600 dark:border-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
  "Social Justice": "border-rose-400 text-rose-600 dark:border-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30",
  "Social Issues": "border-rose-400 text-rose-600 dark:border-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30",
  "Environment": "border-green-400 text-green-600 dark:border-green-500 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
  "Polity & Governance": "border-teal-400 text-teal-600 dark:border-teal-500 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30",
  "National": "border-sky-400 text-sky-600 dark:border-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30",
  "Sports & Culture": "border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
  "State": "border-indigo-400 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", { weekday: "short" });
}

function getDayNumber(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return String(date.getDate());
}

function getMonthName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", { month: "short" });
}

function getGsBadgeLabel(gs: string, category: string): string {
  const gsNum = gs.replace("GS-", "");
  const romanMap: Record<string, string> = { "I": "1", "II": "2", "III": "3", "IV": "4" };
  const num = romanMap[gsNum] || gsNum;
  if (gs === "Prelims") return "Prelims";
  return `GS ${num}`;
}

function getDateRange(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export default function CurrentAffairsPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [gsFilter, setGsFilter] = useState<string>("All");
  const [stateFilter, setStateFilter] = useState("none");
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const dateStripRef = useRef<HTMLDivElement>(null);

  const { data: latestDate, isLoading: latestLoading } = useLatestAvailableDate();
  const { data: availableDates } = useCurrentAffairsDates();
  const generateMutation = useGenerateCurrentAffairs();

  const availableDateSet = new Set(availableDates?.map((d) => d.date) || []);
  const todayStr = formatDate(new Date());

  useEffect(() => {
    if (!selectedDate && latestDate?.date) {
      setSelectedDate(latestDate.date);
    } else if (!selectedDate && !latestLoading && !latestDate?.date) {
      setSelectedDate(todayStr);
    }
  }, [latestDate, latestLoading, selectedDate, todayStr]);

  const dateStr = selectedDate || todayStr;
  const { data, isLoading } = useCurrentAffairs(selectedDate ? dateStr : "");
  const dateReady = !!selectedDate;
  const toggleRevision = useToggleRevision();

  const topics = data?.topics || [];
  const hasDigest = !!data?.digest;
  const filteredTopics = gsFilter === "All" ? topics : topics.filter(t => t.gsCategory === gsFilter);

  const revisedCount = topics.filter((t) => t.revised).length;
  const totalCount = topics.length;

  const allDates = getDateRange();
  const dateRange = allDates.filter((d) => {
    const day = new Date(d + "T00:00:00").getDay();
    return day !== 0;
  });

  useEffect(() => {
    if (dateStripRef.current && selectedDate) {
      const activeEl = dateStripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedDate]);

  const handleGenerate = () => {
    generateMutation.mutate(
      { date: dateStr, stateFilter: stateFilter === "none" ? null : stateFilter },
      {
        onSuccess: () => {
          setShowGeneratePanel(false);
        },
        onError: (error: Error) => {
          toast({
            title: "Not Available",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const groupedByCategory = filteredTopics.reduce((acc, topic) => {
    const cat = topic.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(topic);
    return acc;
  }, {} as Record<string, typeof topics>);

  const isFutureOrToday = (d: string) => d >= todayStr;
  const isDateAvailable = (d: string) => availableDateSet.has(d);
  const isDateClickable = (d: string) => isDateAvailable(d) || (!isFutureOrToday(d));

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-5 pb-20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Daily News Analysis</h1>
              <p className="text-sm text-muted-foreground mt-0.5">UPSC & State PSC Current Affairs</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/practice-quiz">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-practice-tab">
                  <FileText className="h-3.5 w-3.5" />
                  Practice MCQs
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-b mb-5">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => {
                  if (dateStripRef.current) {
                    dateStripRef.current.scrollBy({ left: -400, behavior: "smooth" });
                  }
                }}
                data-testid="button-date-scroll-left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div
                ref={dateStripRef}
                className="flex items-center gap-1 overflow-x-auto pb-3 pt-1 scrollbar-hide flex-1"
                data-testid="date-strip"
              >
                {dateRange.map((d) => {
                  const available = isDateAvailable(d);
                  const clickable = isDateClickable(d);
                  const isSelected = d === dateStr;
                  const isDayToday = d === todayStr;
                  const futureNoContent = isFutureOrToday(d) && !available;

                  return (
                    <button
                      key={d}
                      data-active={isSelected ? "true" : "false"}
                      data-testid={`date-item-${d}`}
                      disabled={!clickable && futureNoContent}
                      onClick={() => {
                        if (clickable || available) {
                          setSelectedDate(d);
                          setGsFilter("All");
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center min-w-[52px] px-2 py-2 rounded-lg transition-all flex-shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : available
                            ? "hover-elevate cursor-pointer"
                            : futureNoContent
                              ? "opacity-40 cursor-not-allowed"
                              : "hover-elevate cursor-pointer opacity-70"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-medium uppercase",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {getDayName(d)}
                      </span>
                      <span className={cn(
                        "text-lg font-bold leading-tight",
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {getDayNumber(d)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {getMonthName(d)}
                      </span>
                      {available && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                      )}
                      {isDayToday && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => {
                  if (dateStripRef.current) {
                    dateStripRef.current.scrollBy({ left: 400, behavior: "smooth" });
                  }
                }}
                data-testid="button-date-scroll-right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground" data-testid="text-selected-date">
                    {formatDisplayDate(dateStr)}
                  </h2>
                  {hasDigest && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {totalCount} topics
                    </span>
                  )}
                </div>

                {hasDigest && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Current Affairs - ${formatShortDate(dateStr)}`,
                            text: `Check out today's UPSC current affairs digest`,
                            url: window.location.href,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast({ title: "Link copied to clipboard" });
                        }
                      }}
                      data-testid="button-share-ca"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      data-testid="button-download-ca-pdf"
                      onClick={async () => {
                        try {
                          const sections = currentAffairsToPDFSections(topics);
                          await generatePDF({
                            title: `Daily Current Affairs - ${formatShortDate(dateStr)}`,
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
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                  </div>
                )}
              </div>

              {hasDigest && (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
                      <BookOpen className="h-4 w-4" />
                      <span data-testid="text-revision-progress">{revisedCount}/{totalCount} revised</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {GS_CATEGORIES.map((gs) => {
                        const count = gs === "All" ? topics.length : topics.filter(t => t.gsCategory === gs).length;
                        if (gs !== "All" && count === 0) return null;
                        return (
                          <button
                            key={gs}
                            onClick={() => setGsFilter(gs)}
                            data-testid={`filter-${gs}`}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                              gsFilter === gs
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover-elevate"
                            )}
                          >
                            {gs === "All" ? "All" : getGsBadgeLabel(gs, "")} {count > 0 && `(${count})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(groupedByCategory).map(([category, categoryTopics]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn(
                            "w-1 h-5 rounded-full",
                            category === "International Relations" ? "bg-blue-500" :
                            category === "Economy" ? "bg-emerald-500" :
                            category === "Science & Technology" || category === "Science & Tech" ? "bg-purple-500" :
                            category === "Environment" ? "bg-green-500" :
                            category === "Polity & Governance" ? "bg-teal-500" :
                            category === "Social Justice" || category === "Social Issues" ? "bg-rose-500" :
                            category === "Sports & Culture" ? "bg-orange-500" :
                            category === "State" ? "bg-indigo-500" :
                            "bg-sky-500"
                          )} />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80" data-testid={`text-category-${category}`}>
                            {category}
                          </h3>
                          <span className="text-xs text-muted-foreground">({categoryTopics.length})</span>
                        </div>

                        <div className="space-y-2.5">
                          {categoryTopics.map((topic) => (
                            <div
                              key={topic.id}
                              className={cn(
                                "group flex items-start gap-3 p-3.5 rounded-lg border bg-card cursor-pointer transition-all hover-elevate",
                                topic.revised && "border-green-200 dark:border-green-800/50"
                              )}
                              onClick={() => setLocation(`/current-affairs/topic/${topic.id}`)}
                              data-testid={`card-topic-${topic.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className={cn(
                                    "text-[11px] px-2 py-0.5 rounded-full border font-medium",
                                    GS_BADGE_COLORS[topic.gsCategory] || GS_BADGE_COLORS["Prelims"]
                                  )} data-testid={`badge-gs-${topic.id}`}>
                                    {getGsBadgeLabel(topic.gsCategory, topic.category)}
                                  </span>
                                  {topic.source && (
                                    <span className="text-[11px] text-muted-foreground font-medium" data-testid={`text-source-${topic.id}`}>
                                      {topic.source}
                                    </span>
                                  )}
                                  {topic.revised && (
                                    <span className="flex items-center gap-0.5 text-[11px] text-green-600 dark:text-green-400 font-medium">
                                      <Check className="h-3 w-3" />
                                      Revised
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-semibold text-[15px] text-foreground leading-snug mb-1" data-testid={`text-title-${topic.id}`}>
                                  {topic.title}
                                </h4>

                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-summary-${topic.id}`}>
                                  {topic.summary}
                                </p>
                              </div>

                              <div className="flex-shrink-0 mt-3">
                                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!dateReady || isLoading || latestLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : !hasDigest ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Clock className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-digest">
                    No digest available for {formatDisplayDate(dateStr)}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-5 max-w-md">
                    {isFutureOrToday(dateStr)
                      ? "Today's current affairs will be available once our AI curates the latest news from leading newspapers. Check back later."
                      : "This date's current affairs haven't been generated yet. You can generate them now."}
                  </p>

                  {!isFutureOrToday(dateStr) && !showGeneratePanel && (
                    <Button
                      onClick={() => setShowGeneratePanel(true)}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-show-generate"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate for this date
                    </Button>
                  )}

                  {showGeneratePanel && (
                    <div className="w-full max-w-sm space-y-4 mt-2">
                      <div>
                        <label className="text-sm font-medium flex items-center gap-2 mb-2">
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
                        className="w-full gap-2"
                        data-testid="button-generate-digest"
                      >
                        {generateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {generateMutation.isPending ? "Generating..." : "Generate Daily Digest"}
                      </Button>
                    </div>
                  )}

                  {isFutureOrToday(dateStr) && latestDate?.date && (
                    <Button
                      variant="outline"
                      className="gap-2 mt-3"
                      onClick={() => {
                        setSelectedDate(latestDate.date!);
                        setGsFilter("All");
                      }}
                      data-testid="button-view-latest"
                    >
                      View latest available ({formatShortDate(latestDate.date)})
                    </Button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="hidden lg:block w-72 flex-shrink-0 space-y-5">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3" data-testid="text-calendar-title">Calendar</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate ? new Date(dateStr + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const d = formatDate(date);
                        setSelectedDate(d);
                        setGsFilter("All");
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    className="w-full"
                    modifiers={{
                      hasDigest: (date: Date) => availableDateSet.has(formatDate(date)),
                    }}
                    modifiersClassNames={{
                      hasDigest: "bg-emerald-100 dark:bg-emerald-900/30 font-bold text-emerald-700 dark:text-emerald-400",
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span>Selected</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
