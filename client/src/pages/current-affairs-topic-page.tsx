import { useState, useRef, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useTopicById, useToggleRevision } from "@/hooks/use-current-affairs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link, useLocation } from "wouter";
import { StyledMarkdown } from "@/components/ui/styled-markdown";
import {
  Loader2,
  Download,
  Share2,
  Check,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePDF } from "@/lib/pdf-generator";
import { useLanguage } from "@/i18n/context";
import { InlineLanguageButton } from "@/components/inline-language-button";

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

function getGsBadgeLabel(gs: string): string {
  const gsNum = gs.replace("GS-", "");
  const romanMap: Record<string, string> = { "I": "1", "II": "2", "III": "3", "IV": "4" };
  const num = romanMap[gsNum] || gsNum;
  if (gs === "Prelims") return "Prelims";
  return `GS ${num}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function CurrentAffairsTopicPage() {
  const { t, language } = useLanguage();
  const params = useParams<{ id: string }>();
  const topicId = parseInt(params.id || "0");
  const [detailContent, setDetailContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStarted, setStreamStarted] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevLangRef = useRef<string>(language);
  const { toast } = useToast();
  const toggleRevision = useToggleRevision();
  const [, setLocation] = useLocation();

  const { data: topicData, isLoading: topicLoading, isError } = useTopicById(topicId);
  const topic = topicData?.topic;
  const digestDate = topicData?.date || "";
  const cachedDetail = topicData?.cachedDetail || null;
  const prevTopic = topicData?.prevTopic;
  const nextTopic = topicData?.nextTopic;
  const topicIndex = topicData?.topicIndex || 0;
  const totalTopics = topicData?.totalTopics || 0;

  useEffect(() => {
    if (prevLangRef.current !== language) {
      prevLangRef.current = language;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setDetailContent("");
      setIsStreaming(false);
      setStreamStarted(false);
    }
  }, [language]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDetailContent("");
    setIsStreaming(false);
    setStreamStarted(false);
  }, [topicId]);

  useEffect(() => {
    if (cachedDetail && !detailContent && !streamStarted) {
      setDetailContent(cachedDetail);
      setStreamStarted(true);
    }
  }, [cachedDetail, detailContent, streamStarted]);

  const startStreaming = useCallback(() => {
    if (streamStarted || isStreaming) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setStreamStarted(true);

    fetch(`/api/current-affairs/topics/${topicId}/detail?language=${language}`, {
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
                setDetailContent((prev) => prev + parsed.text);
              }
              if (parsed.done) {
                setIsStreaming(false);
                abortControllerRef.current = null;
              }
              if (parsed.error) {
                toast({ title: parsed.error, variant: "destructive" });
                setIsStreaming(false);
                abortControllerRef.current = null;
              }
            } catch {}
          }
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          toast({ title: "Failed to load details", variant: "destructive" });
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      });
  }, [topicId, streamStarted, isStreaming, toast, language]);

  useEffect(() => {
    if (topic && !streamStarted && !cachedDetail) {
      startStreaming();
    }
  }, [topic, streamStarted, startStreaming, cachedDetail]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  if (topicLoading) {
    return (
      <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !topic) {
    return (
      <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-semibold mb-2">Topic not found</h3>
            <p className="text-muted-foreground text-sm mb-4">This topic may have been removed or the link is invalid.</p>
            <Link href="/current-affairs">
              <Button variant="outline" className="gap-2" data-testid="button-back-to-list-error">
                <ArrowLeft className="h-4 w-4" />
                {t.currentAffairs.backToDigest}
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="hidden md:flex justify-end px-4 pt-3">
          <InlineLanguageButton />
        </div>
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 sm:py-5 pb-20">
          <div className="flex items-center gap-2 mb-5">
            <Link href="/current-affairs">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-to-list">
                <ArrowLeft className="h-4 w-4" />
                <span>{t.currentAffairs.backToDigest}</span>
              </button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full border font-medium",
              GS_BADGE_COLORS[topic.gsCategory] || GS_BADGE_COLORS["Prelims"]
            )} data-testid="badge-detail-gs">
              {getGsBadgeLabel(topic.gsCategory)}
            </span>
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full border font-medium",
              CATEGORY_BADGE_COLORS[topic.category] || CATEGORY_BADGE_COLORS["National"]
            )} data-testid="badge-detail-cat">
              {topic.category}
            </span>
            {topic.source && (
              <span className="text-xs text-muted-foreground font-medium" data-testid="text-topic-source">
                {topic.source}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-3" data-testid="text-topic-title">
            {topic.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-5">
            {digestDate && (
              <span className="flex items-center gap-1.5" data-testid="text-topic-date">
                <Clock className="h-3.5 w-3.5" />
                {formatDisplayDate(digestDate)}
              </span>
            )}
            {totalTopics > 0 && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {topicIndex} {t.currentAffairs.topicOf} {totalTopics}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Button
              variant={topic.revised ? "default" : "outline"}
              size="sm"
              onClick={() => toggleRevision.mutate({ topicId: topic.id, revised: !topic.revised })}
              disabled={toggleRevision.isPending}
              className={cn(
                "gap-1.5",
                topic.revised && "bg-green-600 border-green-600 text-white"
              )}
              data-testid="button-topic-revise"
            >
              <Check className="h-3.5 w-3.5" />
              {topic.revised ? t.currentAffairs.revised : t.currentAffairs.markRevised}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              data-testid="button-topic-download"
              onClick={async () => {
                try {
                  const sections = [
                    { type: "heading" as const, text: topic.title },
                    { type: "badge" as const, text: `${topic.gsCategory} | ${topic.category}` },
                    { type: "text" as const, text: topic.summary },
                    { type: "divider" as const },
                    ...(detailContent ? [{ type: "text" as const, text: detailContent }] : []),
                  ];
                  await generatePDF({
                    title: topic.title,
                    subtitle: `${topic.gsCategory} | ${topic.category}`,
                    sections,
                    fileName: `learnpro-${topic.title.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-")}.pdf`,
                  });
                  toast({ title: "PDF downloaded successfully" });
                } catch {
                  toast({ title: "Failed to generate PDF", variant: "destructive" });
                }
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {t.currentAffairs.downloadPdf}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              data-testid="button-topic-share"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: topic.title,
                    text: topic.summary,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied to clipboard" });
                }
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              {t.currentAffairs.share}
            </Button>
          </div>

          <Card className="mb-6 p-4 bg-muted/30">
            <p className="text-base text-foreground leading-relaxed" data-testid="text-topic-summary">
              {topic.summary}
            </p>
          </Card>

          <div className="space-y-1">
            {isStreaming && !detailContent && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t.currentAffairs.generating}</span>
              </div>
            )}

            {detailContent && (
              <div className="prose-custom">
                <StyledMarkdown>{detailContent}</StyledMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5" />
                )}
              </div>
            )}
          </div>

          {!isStreaming && detailContent && (
            <Card className="mt-8 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base" data-testid="text-attempt-mcqs">{t.currentAffairs.practiceMCQs}</h3>
                    <p className="text-xs text-blue-100 mt-0.5">Test your understanding with practice questions</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="gap-2 font-semibold"
                    data-testid="button-topic-practice"
                    disabled={generatingQuiz}
                    onClick={async () => {
                      setGeneratingQuiz(true);
                      try {
                        const resp = await fetch(`/api/quizzes/generate-topic/${topicId}`, {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                        });
                        if (!resp.ok) throw new Error("Failed to generate quiz");
                        const data = await resp.json();
                        setLocation(`/practice-quiz?attemptId=${data.attempt.id}`);
                      } catch {
                        toast({ title: "Failed to generate quiz", description: "Please try again.", variant: "destructive" });
                      } finally {
                        setGeneratingQuiz(false);
                      }
                    }}
                  >
                    {generatingQuiz ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Start Practice
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {(prevTopic || nextTopic) && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prevTopic ? (
                <button
                  onClick={() => setLocation(`/current-affairs/topic/${prevTopic.id}`)}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card text-left hover-elevate transition-all"
                  data-testid="button-prev-topic"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground font-medium">{t.currentAffairs.previousTopic}</span>
                    <p className="text-sm font-semibold text-foreground truncate">{prevTopic.title}</p>
                  </div>
                </button>
              ) : (
                <div />
              )}
              {nextTopic ? (
                <button
                  onClick={() => setLocation(`/current-affairs/topic/${nextTopic.id}`)}
                  className="flex items-center justify-end gap-3 p-4 rounded-lg border bg-card text-right hover-elevate transition-all"
                  data-testid="button-next-topic"
                >
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground font-medium">{t.currentAffairs.nextTopic}</span>
                    <p className="text-sm font-semibold text-foreground truncate">{nextTopic.title}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </button>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
