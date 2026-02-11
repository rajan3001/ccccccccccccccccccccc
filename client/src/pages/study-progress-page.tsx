import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/i18n/context";
import { InlineLanguageButton } from "@/components/inline-language-button";
import { Sidebar } from "@/components/layout/sidebar";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { useSubscription } from "@/hooks/use-subscription";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Flame,
  Target,
  Trophy,
  BookOpen,
  Brain,
  TrendingUp,
  Calendar,
  StickyNote,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";

const GS_PAPER_COLORS: Record<string, string> = {
  "GS-1": "hsl(35 90% 45%)",
  "GS-2": "hsl(200 70% 50%)",
  "GS-3": "hsl(150 60% 40%)",
  "GS-4": "hsl(280 60% 50%)",
  "CSAT": "hsl(350 60% 50%)",
  "Essay": "hsl(45 80% 50%)",
};

function getMotivationalMessage(streak: number, t: any): string {
  if (streak === 0) return t.motivational.streak0;
  if (streak >= 1 && streak <= 2) return t.motivational.streak1_2;
  if (streak >= 3 && streak <= 6) return t.motivational.streak3_6;
  if (streak >= 7 && streak <= 13) return t.motivational.streak7_13;
  if (streak >= 14 && streak <= 29) return t.motivational.streak14_29;
  if (streak >= 30 && streak <= 59) return t.motivational.streak30_59;
  if (streak >= 60 && streak <= 89) return t.motivational.streak60_89;
  return t.motivational.streak90plus;
}

function StreakCalendar({ data, t }: { data: { date: string; level: number }[]; t: any }) {
  const weeks = useMemo(() => {
    const result: { date: string; level: number }[][] = [];
    let currentWeek: { date: string; level: number }[] = [];

    if (data.length > 0) {
      const firstDay = new Date(data[0].date).getDay();
      for (let i = 0; i < firstDay; i++) {
        currentWeek.push({ date: "", level: -1 });
      }
    }

    for (const day of data) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: "", level: -1 });
      }
      result.push(currentWeek);
    }
    return result;
  }, [data]);

  const levelColors = [
    "bg-muted",
    "bg-primary/20",
    "bg-primary/40",
    "bg-primary/60",
    "bg-primary/80",
  ];

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-fit">
        <div className="flex flex-col gap-0.5 mr-1 pt-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-3 w-3 flex items-center justify-center text-[8px] text-muted-foreground">
              {i % 2 === 1 ? label : ""}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div
                key={di}
                className={`h-3 w-3 rounded-[2px] ${day.level === -1 ? "bg-transparent" : levelColors[day.level]}`}
                title={day.date ? `${day.date}: Level ${day.level}` : ""}
                data-testid={day.date ? `streak-cell-${day.date}` : undefined}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end text-[10px] text-muted-foreground">
        <span>{t.studyProgress.less}</span>
        {levelColors.map((color, i) => (
          <div key={i} className={`h-2.5 w-2.5 rounded-[2px] ${color}`} />
        ))}
        <span>{t.studyProgress.more}</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function StudyProgressPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

  const { data: overview, isLoading: overviewLoading } = useQuery<{
    streakCalendar: { date: string; level: number }[];
    currentStreak: number;
    longestStreak: number;
    totalStudyDays: number;
    dailyTimeData: { date: string; minutes: number }[];
    stats: {
      totalChats: number;
      totalQuizAttempts: number;
      totalQuestions: number;
      totalCorrect: number;
      totalNotes: number;
      quizAccuracy: number;
    };
  }>({ queryKey: ["/api/study-progress/overview"] });

  const { data: subjects, isLoading: subjectsLoading } = useQuery<{
    byExam: { examType: string; attempts: number; totalQuestions: number; totalCorrect: number }[];
    byGsPaper: { gsPaper: string; attempts: number; totalQuestions: number; totalCorrect: number }[];
    recentTopics: { id: number; title: string; createdAt: string }[];
  }>({ queryKey: ["/api/study-progress/subjects"] });

  const isLoading = authLoading || overviewLoading || subjectsLoading;

  const chartData = useMemo(() => {
    if (!overview?.dailyTimeData) return [];
    return overview.dailyTimeData.map(d => ({
      date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      minutes: d.minutes,
    }));
  }, [overview?.dailyTimeData]);

  const totalMinutes = useMemo(() => {
    if (!overview?.dailyTimeData) return 0;
    return overview.dailyTimeData.reduce((sum, d) => sum + d.minutes, 0);
  }, [overview?.dailyTimeData]);

  const avgMinutes = useMemo(() => {
    const activeDays = overview?.dailyTimeData?.filter(d => d.minutes > 0).length || 1;
    return Math.round(totalMinutes / activeDays);
  }, [totalMinutes, overview?.dailyTimeData]);

  const { data: subData } = useSubscription();
  const progressTier = subData?.tier || null;
  const hasProgressAccess = progressTier === "pro" || progressTier === "ultimate";

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const streak = overview?.currentStreak || 0;
  const motivationalMsg = getMotivationalMessage(streak, t);

  if (!hasProgressAccess) {
    return (
      <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden" data-testid="study-progress-page">
        <Sidebar />
        <UpgradeBanner
          feature="Study Progress"
          description="Track your 90-day streak, daily study time, GS paper coverage, and exam-wise performance. Available on Pro plan and above."
          requiredTier="pro"
          blocking
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden" data-testid="study-progress-page">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="hidden md:flex justify-end px-4 pt-3">
          <InlineLanguageButton />
        </div>
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-16">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">{t.studyProgress.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.studyProgress.subtitle}</p>
          </div>

          <Card className="p-4 sm:p-5 mb-5 border-primary/20 bg-primary/5 dark:bg-primary/10">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Flame className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-foreground" data-testid="stat-current-streak">{streak}</span>
                  <span className="text-sm text-muted-foreground">{t.studyProgress.dayStreak}</span>
                  {streak >= 7 && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Trophy className="h-3 w-3 mr-0.5 text-primary" />
                      {t.studyProgress.onFire}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{motivationalMsg}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              icon={Flame}
              label={t.studyProgress.currentStreak}
              value={streak}
              sub={t.studyProgress.days}
              color="hsl(35 90% 45%)"
            />
            <StatCard
              icon={Trophy}
              label={t.studyProgress.longestStreak}
              value={overview?.longestStreak || 0}
              sub={t.studyProgress.days}
              color="hsl(45 80% 50%)"
            />
            <StatCard
              icon={Calendar}
              label={t.studyProgress.studyDays}
              value={overview?.totalStudyDays || 0}
              sub={t.studyProgress.outOf90}
              color="hsl(200 70% 50%)"
            />
            <StatCard
              icon={Target}
              label={t.studyProgress.quizAccuracy}
              value={`${overview?.stats?.quizAccuracy || 0}%`}
              sub={`${overview?.stats?.totalCorrect || 0}/${overview?.stats?.totalQuestions || 0}`}
              color="hsl(150 60% 40%)"
            />
          </div>

          <Card className="p-4 sm:p-5 mb-5">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t.studyProgress.streakCalendar}
              </h2>
            </div>
            {overview?.streakCalendar && (
              <StreakCalendar data={overview.streakCalendar} t={t} />
            )}
          </Card>

          <Card className="p-4 sm:p-5 mb-5">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t.studyProgress.dailyStudyTime}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{t.studyProgress.totalTime}: <strong className="text-foreground">{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</strong></span>
                <span>{t.studyProgress.avgPerDay}: <strong className="text-foreground">{avgMinutes}{t.studyProgress.min}/{t.studyProgress.perDay}</strong></span>
              </div>
            </div>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                    tickFormatter={(v) => `${v}m`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} ${t.studyProgress.min}`, t.studyProgress.studyTime]}
                  />
                  <Bar dataKey="minutes" fill="hsl(35 90% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <StatCard
              icon={MessageSquare}
              label={t.studyProgress.totalChats}
              value={overview?.stats?.totalChats || 0}
              color="hsl(35 90% 45%)"
            />
            <StatCard
              icon={Brain}
              label={t.studyProgress.quizAttempts}
              value={overview?.stats?.totalQuizAttempts || 0}
              sub={`${overview?.stats?.totalQuestions || 0} ${t.studyProgress.mcqs}`}
              color="hsl(280 60% 50%)"
            />
            <StatCard
              icon={StickyNote}
              label={t.studyProgress.notesSaved}
              value={overview?.stats?.totalNotes || 0}
              color="hsl(150 60% 40%)"
            />
          </div>

          {subjects?.byGsPaper && subjects.byGsPaper.length > 0 && (
            <Card className="p-4 sm:p-5 mb-5">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-primary" />
                {t.studyProgress.gsPaperCoverage}
              </h2>
              <div className="space-y-3">
                {subjects.byGsPaper.map((paper) => {
                  const accuracy = paper.totalQuestions > 0
                    ? Math.round((paper.totalCorrect / paper.totalQuestions) * 100)
                    : 0;
                  const maxQuestions = Math.max(...subjects.byGsPaper.map(p => p.totalQuestions));
                  const barWidth = maxQuestions > 0 ? (paper.totalQuestions / maxQuestions) * 100 : 0;
                  const color = GS_PAPER_COLORS[paper.gsPaper] || "hsl(var(--primary))";

                  return (
                    <div key={paper.gsPaper} data-testid={`gs-paper-${paper.gsPaper}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-foreground">{paper.gsPaper}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{paper.totalQuestions} {t.studyProgress.mcqs}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {accuracy}% {t.studyProgress.accuracy}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {subjects?.byExam && subjects.byExam.length > 0 && (
            <Card className="p-4 sm:p-5 mb-5">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t.studyProgress.examPerformance}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjects.byExam.map((exam) => {
                  const accuracy = exam.totalQuestions > 0
                    ? Math.round((exam.totalCorrect / exam.totalQuestions) * 100)
                    : 0;
                  return (
                    <div key={exam.examType} className="p-3 rounded-md bg-muted/50" data-testid={`exam-${exam.examType}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-foreground truncate">{exam.examType}</span>
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">{accuracy}%</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{exam.attempts} {t.studyProgress.attempts}</span>
                        <span>{exam.totalQuestions} {t.studyProgress.mcqs}</span>
                        <span>{exam.totalCorrect} {t.studyProgress.correct}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {subjects?.recentTopics && subjects.recentTopics.length > 0 && (
            <Card className="p-4 sm:p-5">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-primary" />
                {t.studyProgress.recentTopics}
              </h2>
              <div className="space-y-2">
                {subjects.recentTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0"
                    data-testid={`topic-${topic.id}`}
                  >
                    <span className="text-sm text-foreground truncate">{topic.title}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(topic.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
