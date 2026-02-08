import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import {
  useCurrentAffairs,
  useGenerateCurrentAffairs,
  useToggleRevision,
  useCurrentAffairsDates,
} from "@/hooks/use-current-affairs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
  Download,
  Share2,
  MapPin,
  Newspaper,
  Check,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePDF, currentAffairsToPDFSections } from "@/lib/pdf-generator";

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

const SOURCE_ICONS: Record<string, string> = {
  "The Hindu": "\u0B24",
  "The Indian Express": "IE",
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

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getGsBadgeLabel(gs: string, category: string): string {
  const gsNum = gs.replace("GS-", "");
  const romanMap: Record<string, string> = { "I": "1", "II": "2", "III": "3", "IV": "4" };
  const num = romanMap[gsNum] || gsNum;
  if (gs === "Prelims") return "Prelims";
  return `GS ${num} : ${category}`;
}

function getTopicIconColor(index: number): string {
  const colors = [
    "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
    "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
    "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  ];
  return colors[index % colors.length];
}

export default function CurrentAffairsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stateFilter, setStateFilter] = useState("none");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const dateStr = formatDate(selectedDate);
  const { data, isLoading } = useCurrentAffairs(dateStr);
  const generateMutation = useGenerateCurrentAffairs();
  const toggleRevision = useToggleRevision();
  const { data: availableDates } = useCurrentAffairsDates();

  const topics = data?.topics || [];
  const hasDigest = !!data?.digest;

  const revisedCount = topics.filter((t) => t.revised).length;
  const totalCount = topics.length;

  const handleGenerate = () => {
    generateMutation.mutate({ date: dateStr, stateFilter: stateFilter === "none" ? null : stateFilter });
  };

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

  const groupedBySource = topics.reduce((acc, topic) => {
    const source = topic.source || "Other";
    if (!acc[source]) acc[source] = [];
    acc[source].push(topic);
    return acc;
  }, {} as Record<string, typeof topics>);

  const sourceOrder = ["The Hindu", "The Indian Express"];
  const orderedSources = [
    ...sourceOrder.filter((s) => groupedBySource[s]),
    ...Object.keys(groupedBySource).filter((s) => !sourceOrder.includes(s)),
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-5 pb-20">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <div className="border-b mb-4 pb-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-primary border-b-2 border-primary pb-2 cursor-default" data-testid="tab-daily-news">
                    Daily News Analysis
                  </span>
                  <Link href="/practice-quiz">
                    <span className="text-sm font-medium text-muted-foreground pb-2 cursor-pointer hover:text-foreground transition-colors" data-testid="tab-practice">
                      Practice
                    </span>
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousDay}
                    data-testid="button-prev-day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold" data-testid="text-todays-news">
                    {isToday ? "Today's News" : formatShortDate(dateStr)}
                  </h2>
                  <Button
                    variant="ghost"
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
                      className="text-xs"
                      data-testid="button-go-today"
                    >
                      Today
                    </Button>
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
                      Download
                    </Button>
                  </div>
                )}
              </div>

              {totalCount > 0 && (
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{revisedCount}/{totalCount} revised</span>
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
                    No digest for {formatShortDate(dateStr)}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-md">
                    Generate a daily digest of important news from The Hindu, Indian Express and leading state newspapers.
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
                <div className="space-y-8">
                  {orderedSources.map((source) => {
                    const sourceTopics = groupedBySource[source];
                    const iconText = SOURCE_ICONS[source] || source.charAt(0);

                    return (
                      <div key={source}>
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="h-6 w-6 rounded flex items-center justify-center bg-muted text-xs font-bold text-foreground" data-testid={`text-source-header-${source}`}>
                            {iconText === "\u0B24" ? (
                              <span className="text-sm font-serif font-bold">{iconText}</span>
                            ) : (
                              <span className="text-[10px] font-bold">{iconText}</span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80" data-testid={`text-source-name-${source}`}>
                            {source}
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {sourceTopics.map((topic, idx) => {
                            const iconColor = getTopicIconColor(idx);

                            return (
                              <div
                                key={topic.id}
                                className={cn(
                                  "group flex items-start gap-4 p-4 rounded-lg border bg-card cursor-pointer transition-all hover-elevate",
                                  topic.revised && "border-green-200 dark:border-green-800/50"
                                )}
                                onClick={() => setLocation(`/current-affairs/topic/${topic.id}`)}
                                data-testid={`card-topic-${topic.id}`}
                              >
                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1", iconColor)}>
                                  <Newspaper className="h-5 w-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {[topic.gsCategory, topic.category].map((tag, i) => {
                                      const gsColor = i === 0
                                        ? GS_BADGE_COLORS[tag] || GS_BADGE_COLORS["Prelims"]
                                        : CATEGORY_BADGE_COLORS[tag] || CATEGORY_BADGE_COLORS["National"];
                                      const label = i === 0
                                        ? getGsBadgeLabel(tag, topic.category)
                                        : tag;
                                      if (i === 0 && tag === "Prelims") {
                                        return (
                                          <span key={i} className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", gsColor)} data-testid={`badge-gs-${topic.id}`}>
                                            Prelims
                                          </span>
                                        );
                                      }
                                      if (i === 1 && getGsBadgeLabel(topic.gsCategory, tag).includes(tag)) {
                                        return null;
                                      }
                                      return (
                                        <span key={i} className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", gsColor)} data-testid={i === 0 ? `badge-gs-${topic.id}` : `badge-cat-${topic.id}`}>
                                          {label}
                                        </span>
                                      );
                                    })}
                                  </div>

                                  <div className="flex items-center gap-2 mb-1.5">
                                    <h4 className="font-semibold text-[15px] text-foreground leading-snug" data-testid={`text-title-${topic.id}`}>
                                      {topic.title}
                                    </h4>
                                    {topic.pageNumber && (
                                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0" data-testid={`text-page-${topic.id}`}>
                                        Pg {topic.pageNumber}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-summary-${topic.id}`}>
                                    {topic.summary}
                                  </p>

                                  {topic.revised && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Revised</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-shrink-0 mt-3">
                                  <ChevronRight className="h-5 w-5 text-primary/60 group-hover:text-primary transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {hasDigest && (
              <div className="hidden lg:block w-80 flex-shrink-0 space-y-5">
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                    <h3 className="font-bold text-base mb-1" data-testid="text-mcq-cta">Attempt Today's MCQs</h3>
                    <p className="text-xs text-blue-100">Practice questions based on today's news</p>
                  </div>
                  <CardContent className="p-4">
                    <Link href="/practice-quiz">
                      <Button className="w-full gap-2" data-testid="button-practice-now">
                        Practice Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3" data-testid="text-daily-progress">Daily Progress</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) setSelectedDate(date);
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
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                        <span>Not started</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
