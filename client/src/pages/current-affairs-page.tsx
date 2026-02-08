import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import {
  useCurrentAffairs,
  useGenerateCurrentAffairs,
  useToggleRevision,
  useRevisionStats,
  useCurrentAffairsDates,
} from "@/hooks/use-current-affairs";
import { useCreateConversation } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Sparkles,
  Check,
  BookOpen,
  MessageSquare,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
};

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
  const [, setLocation] = useLocation();

  const dateStr = formatDate(selectedDate);
  const { data, isLoading } = useCurrentAffairs(dateStr);
  const generateMutation = useGenerateCurrentAffairs();
  const toggleRevision = useToggleRevision();
  const { data: stats } = useRevisionStats();
  const { data: availableDates } = useCurrentAffairsDates();
  const createChat = useCreateConversation();

  const topics = data?.topics || [];
  const hasDigest = !!data?.digest;

  const revisedCount = topics.filter((t) => t.revised).length;
  const totalCount = topics.length;

  const handleGenerate = () => {
    generateMutation.mutate(dateStr);
  };

  const handleToggleRevised = (topicId: number, currentState: boolean) => {
    toggleRevision.mutate({ topicId, revised: !currentState });
  };

  const handleAskAI = (topicTitle: string, topicSummary: string) => {
    createChat.mutate(`Current Affairs: ${topicTitle}`, {
      onSuccess: (newChat) => {
        setLocation(`/chat/${newChat.id}?prefill=${encodeURIComponent(
          `I want to learn more about this current affairs topic for UPSC preparation:\n\n**${topicTitle}**\n\n${topicSummary}\n\nPlease explain:\n1. Key facts and context\n2. UPSC exam relevance\n3. Connected static topics\n4. Possible exam questions`
        )}`);
      },
    });
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

  const groupedByCategory = topics.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, typeof topics>);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">
                Daily Current Affairs
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                AI-curated UPSC-relevant topics for your daily revision
              </p>
            </div>

            {stats && stats.total > 0 && (
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
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
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
              className="gap-2"
              data-testid="button-toggle-calendar"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm font-medium">{formatDisplayDate(dateStr)}</span>
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
              <p className="text-muted-foreground text-sm mb-6 max-w-md">
                Generate an AI-curated daily digest of important current affairs topics relevant to UPSC and State PSC exams.
              </p>
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
                Generate Daily Digest
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
                    {categoryTopics.map((topic) => (
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
                              variant="outline"
                              size="sm"
                              onClick={() => handleAskAI(topic.title, topic.summary)}
                              disabled={createChat.isPending}
                              className="gap-1"
                              data-testid={`button-ask-ai-${topic.id}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Ask AI
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
