import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreateConversation } from "@/hooks/use-chat";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Newspaper,
  Brain,
  ArrowRight,
  Target,
  Flame,
  BookOpen,
  Loader2,
  FileCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  TrendingUp,
  Trophy,
  Zap,
  NotebookPen,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const EXAM_LABELS: Record<string, string> = {
  UPSC: "UPSC",
  JPSC: "JPSC (Jharkhand)",
  BPSC: "BPSC (Bihar)",
  JKPSC: "JKPSC (J&K)",
  UPPSC: "UPPSC (UP)",
  MPPSC: "MPPSC (MP)",
  RPSC: "RPSC (Rajasthan)",
  OPSC: "OPSC (Odisha)",
  HPSC: "HPSC (Haryana)",
  UKPSC: "UKPSC (Uttarakhand)",
  HPPSC: "HPPSC (HP)",
  APSC_Assam: "APSC (Assam)",
  MeghalayaPSC: "Meghalaya PSC",
  SikkimPSC: "Sikkim PSC",
  TripuraPSC: "Tripura PSC",
  ArunachalPSC: "Arunachal PSC",
};

const USER_TYPE_LABELS: Record<string, string> = {
  college_student: "College Student",
  working_professional: "Working Professional",
  full_time_aspirant: "Full Time Aspirant",
};

const quickActions = [
  {
    title: "AI Chat",
    description: "Ask any UPSC doubt to your AI mentor",
    icon: MessageSquare,
    href: "/chat/new",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Current Affairs",
    description: "Today's news mapped to GS papers",
    icon: Newspaper,
    href: "/current-affairs",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Practice Quiz",
    description: "Test yourself with AI-generated MCQs",
    icon: Brain,
    href: "/practice-quiz",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Answer Evaluation",
    description: "Get your answer sheets evaluated by AI",
    icon: FileCheck,
    href: "/paper-evaluation",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivationalTip(userType: string | null) {
  const tips: Record<string, string[]> = {
    college_student: [
      "Balance your studies with 2-3 hours of daily UPSC prep",
      "Start with NCERTs alongside your graduation syllabus",
      "Use weekends for answer writing practice",
    ],
    working_professional: [
      "Utilize commute time for current affairs revision",
      "Focus on quality over quantity - smart prep wins",
      "Weekend mock tests help track your progress",
    ],
    full_time_aspirant: [
      "Follow a structured timetable with 8-10 hour study blocks",
      "Revise completed topics weekly to retain better",
      "Practice at least 50 MCQs daily for prelims",
    ],
  };
  const typeKey = userType || "full_time_aspirant";
  const tipList = tips[typeKey] || tips.full_time_aspirant;
  return tipList[Math.floor(Math.random() * tipList.length)];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeeklyGoalData {
  date: string;
  total: number;
  completed: number;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return dateStr === `${yyyy}-${mm}-${dd}`;
}

function AnimatedCounter({ target, duration = 1200, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    if (target === 0) { setCurrent(0); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span>{current}{suffix}</span>;
}

interface DashboardStats {
  today: {
    mcqsSolved: number;
    mcqsCorrect: number;
    quizAttempts: number;
    topicsStudied: number;
    notesSaved: number;
    currentAffairsRead: number;
  };
  allTime: {
    mcqsSolved: number;
    mcqsCorrect: number;
    quizAttempts: number;
    topicsStudied: number;
    notesSaved: number;
    currentAffairsTotal: number;
    currentAffairsRevised: number;
  };
  trend: Array<{
    date: string;
    mcqs: number;
    correct: number;
    chats: number;
    notes: number;
  }>;
}

function PulseRing({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <span
      className="absolute inset-0 rounded-md pointer-events-none"
      style={{
        border: `2px solid ${color}`,
        animation: `dashboard-pulse-ring 2.5s ease-out ${delay}s infinite`,
        opacity: 0,
      }}
    />
  );
}

const PARTICLE_DURATIONS = [3.2, 3.8, 4.1, 3.5, 4.4, 3.9, 4.2, 3.6];

function FloatingParticle({ color, size, x, y, delay, seed = 0 }: { color: string; size: number; x: number; y: number; delay: number; seed?: number }) {
  const dur = PARTICLE_DURATIONS[seed % PARTICLE_DURATIONS.length];
  return (
    <span
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: color,
        left: `${x}%`,
        top: `${y}%`,
        animation: `dashboard-float ${dur}s ease-in-out ${delay}s infinite`,
        opacity: 0.4,
      }}
    />
  );
}

function getTimeOfDayTheme() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 30%, #bfdbfe 70%, #93c5fd 100%)",
      accent: "#1d4ed8",
      iconBg: "rgba(29,78,216,0.1)",
      valueColor: "#1e3a5f",
      labelColor: "#1e40af",
      subtextColor: "#2563eb",
      divider: "rgba(29,78,216,0.12)",
      shimmer: "rgba(96,165,250,0.4)",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      bg: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 30%, #a7f3d0 70%, #6ee7b7 100%)",
      accent: "#047857",
      iconBg: "rgba(4,120,87,0.1)",
      valueColor: "#064e3b",
      labelColor: "#065f46",
      subtextColor: "#047857",
      divider: "rgba(4,120,87,0.12)",
      shimmer: "rgba(52,211,153,0.4)",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      bg: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 30%, #ddd6fe 70%, #c4b5fd 100%)",
      accent: "#6d28d9",
      iconBg: "rgba(109,40,217,0.1)",
      valueColor: "#4c1d95",
      labelColor: "#5b21b6",
      subtextColor: "#6d28d9",
      divider: "rgba(109,40,217,0.12)",
      shimmer: "rgba(167,139,250,0.4)",
    };
  } else {
    return {
      bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 30%, #bfdbfe 70%, #93c5fd 100%)",
      accent: "#1d4ed8",
      iconBg: "rgba(29,78,216,0.1)",
      valueColor: "#1e3a5f",
      labelColor: "#1e40af",
      subtextColor: "#1d4ed8",
      divider: "rgba(29,78,216,0.12)",
      shimmer: "rgba(96,165,250,0.4)",
    };
  }
}

function TodayAchievements({ stats }: { stats: DashboardStats }) {
  const theme = getTimeOfDayTheme();

  const achievements = [
    { label: "MCQs Solved", value: stats.today.mcqsSolved, allTime: stats.allTime.mcqsSolved, icon: Brain, allTimeLabel: "All time" },
    { label: "AI Chats", value: stats.today.topicsStudied, allTime: stats.allTime.topicsStudied, icon: MessageSquare, allTimeLabel: "All time" },
    { label: "Articles", value: stats.allTime.currentAffairsRevised, allTime: stats.allTime.currentAffairsTotal, icon: Newspaper, allTimeLabel: "Total" },
    { label: "Notes", value: stats.today.notesSaved, allTime: stats.allTime.notesSaved, icon: NotebookPen, allTimeLabel: "All time" },
  ];

  const accuracy = stats.today.mcqsSolved > 0
    ? Math.round((stats.today.mcqsCorrect / stats.today.mcqsSolved) * 100)
    : 0;

  return (
    <div className="mb-4" data-testid="section-today-achievements">
      <style>{`
        @keyframes ach-shimmer {
          0% { left: -30%; }
          100% { left: 130%; }
        }
      `}</style>

      <div
        className="relative rounded-md overflow-hidden"
        style={{ background: theme.bg }}
        data-testid="strip-today-achievements"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: "absolute",
            top: 0, bottom: 0,
            width: "20%",
            background: `linear-gradient(90deg, transparent, ${theme.shimmer}, transparent)`,
            animation: "ach-shimmer 3s ease-in-out infinite",
            transform: "skewX(-15deg)",
          }} />
        </div>

        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" style={{ color: theme.accent }} />
              <h2 className="text-sm font-bold" style={{ color: theme.labelColor }} data-testid="text-achievements-heading">
                Today's Achievements
              </h2>
            </div>
            {stats.today.mcqsSolved > 0 && (
              <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: theme.iconBg, border: `1px solid ${theme.divider}` }}>
                <Zap className="h-3 w-3" style={{ color: theme.accent }} />
                <span className="text-[10px] font-semibold" style={{ color: theme.labelColor }}>
                  <AnimatedCounter target={accuracy} suffix="%" /> accuracy
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center">
            {achievements.map((item, idx) => (
              <div
                key={item.label}
                className="flex-1 flex flex-col items-center text-center px-2 min-w-0"
                style={idx < achievements.length - 1 ? { borderRight: `1px solid ${theme.divider}` } : undefined}
                data-testid={`card-achievement-${idx}`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: theme.iconBg }}>
                    <item.icon className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                  </div>
                  <span className="text-[11px] font-semibold truncate" style={{ color: theme.labelColor }}>{item.label}</span>
                </div>
                <div className="text-2xl font-black leading-none mb-1 tracking-tight" style={{ color: theme.valueColor }} data-testid={`text-achievement-value-${idx}`}>
                  <AnimatedCounter target={item.value} />
                </div>
                <div className="text-[10px] font-medium" style={{ color: theme.subtextColor, opacity: 0.7 }}>
                  {item.allTimeLabel}: {item.allTime}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressTrendChart({ stats }: { stats: DashboardStats }) {
  const chartData = stats.trend.map((d) => {
    const dateObj = new Date(d.date + "T00:00:00");
    const dayName = DAY_NAMES[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
    const dayNum = dateObj.getDate();
    return {
      ...d,
      label: `${dayName} ${dayNum}`,
      activity: d.mcqs + d.chats + d.notes,
    };
  });

  const hasAnyData = chartData.some((d) => d.activity > 0 || d.mcqs > 0);

  return (
    <Card
      className="p-3 sm:p-4"
      data-testid="card-progress-trend"
      style={{ animation: "dashboard-slide-up 0.5s ease-out 0.5s both" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold text-foreground" data-testid="text-trend-title">7-Day Learning Trend</h3>
        </div>
        {hasAnyData && (
          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600 text-[10px]">
            <TrendingUp className="h-3 w-3 mr-0.5" />
            Active
          </Badge>
        )}
      </div>

      {!hasAnyData ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <GraduationCap
            className="h-10 w-10 text-muted-foreground/30 mb-2"
            style={{ animation: "dashboard-float 3s ease-in-out infinite" }}
          />
          <p className="text-xs font-medium text-muted-foreground">Start your learning journey</p>
          <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">Take quizzes and study topics to see your progress</p>
        </div>
      ) : (
        <div className="w-full" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="mcqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--primary) / 0.2)", strokeWidth: 1 }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" iconSize={6} />
              <Area
                type="monotone"
                dataKey="mcqs"
                name="MCQs"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#mcqGradient)"
                dot={{ r: 2, fill: "#10b981" }}
                activeDot={{ r: 4, fill: "#10b981" }}
              />
              <Area
                type="monotone"
                dataKey="chats"
                name="Chat Sessions"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#chatGradient)"
                dot={{ r: 2, fill: "#3b82f6" }}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey="notes"
                name="Notes"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ r: 2, fill: "#a855f7" }}
                activeDot={{ r: 4, fill: "#a855f7" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-2.5 min-w-[140px]">
      <p className="text-[11px] font-semibold text-foreground mb-1.5">{label}</p>
      <div className="space-y-1">
        {data.mcqs > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground">MCQs:</span>
            <span className="text-[10px] font-semibold text-foreground ml-auto">{data.mcqs}</span>
          </div>
        )}
        {data.correct > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-300" />
            <span className="text-[10px] text-muted-foreground">Correct:</span>
            <span className="text-[10px] font-semibold text-foreground ml-auto">{data.correct}</span>
          </div>
        )}
        {data.chats > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-muted-foreground">Chats:</span>
            <span className="text-[10px] font-semibold text-foreground ml-auto">{data.chats}</span>
          </div>
        )}
        {data.notes > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-[10px] text-muted-foreground">Notes:</span>
            <span className="text-[10px] font-semibold text-foreground ml-auto">{data.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomGoalTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const dateObj = new Date(data.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  const pending = data.total - data.completed;
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-2.5 min-w-[140px]">
      <p className="text-[11px] font-semibold text-foreground mb-1.5">{formattedDate}</p>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span className="text-[10px] text-muted-foreground">Done:</span>
        <span className="text-[10px] font-semibold text-foreground">{data.completed}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Circle className="h-3 w-3 text-amber-400" />
        <span className="text-[10px] text-muted-foreground">Pending:</span>
        <span className="text-[10px] font-semibold text-foreground">{pending}</span>
      </div>
      <div className="flex items-center gap-2">
        <Target className="h-3 w-3 text-blue-500" />
        <span className="text-[10px] text-muted-foreground">Total:</span>
        <span className="text-[10px] font-semibold text-foreground">{data.total}</span>
      </div>
    </div>
  );
}

function WeeklyGoalsChart() {
  const { data, isLoading } = useQuery<WeeklyGoalData[]>({
    queryKey: ["/api/study-planner/weekly-goals"],
  });

  const chartData = (data || []).map((d) => ({
    ...d,
    day: formatDayLabel(d.date),
    pending: d.total - d.completed,
    today: isToday(d.date),
  }));

  const totalGoals = chartData.reduce((s, d) => s + d.total, 0);
  const totalCompleted = chartData.reduce((s, d) => s + d.completed, 0);
  const completionRate = totalGoals > 0 ? Math.round((totalCompleted / totalGoals) * 100) : 0;

  if (isLoading) {
    return (
      <Card className="p-3 sm:p-4" data-testid="card-weekly-goals">
        <div className="flex items-center justify-center h-[150px]">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="p-3 sm:p-4"
      data-testid="card-weekly-goals"
      style={{ animation: "dashboard-slide-up 0.5s ease-out 0.6s both" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xs font-semibold text-foreground" data-testid="text-weekly-goals-title">This Week's Goals</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground" data-testid="text-completion-rate">{completionRate}%</span>
          <span className="text-[10px] text-muted-foreground">done</span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-total-completed">{totalCompleted}</span>
          <span className="text-xs text-muted-foreground">/{totalGoals}</span>
        </div>
      </div>

      {totalGoals === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Target
            className="h-8 w-8 text-muted-foreground/30 mb-2"
            style={{ animation: "dashboard-float 3s ease-in-out 0.5s infinite" }}
          />
          <p className="text-xs font-medium text-muted-foreground">No goals set this week</p>
          <Link href="/study-planner" data-testid="link-go-to-planner">
            <span className="text-[10px] font-medium text-primary hover:underline cursor-pointer flex items-center gap-1 mt-1">
              Go to Study Planner <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      ) : (
        <div className="w-full" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomGoalTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" iconSize={6} />
              <Bar dataKey="completed" name="Completed" stackId="goals" radius={[0, 0, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.today ? "#059669" : "#10b981"} />
                ))}
              </Bar>
              <Bar dataKey="pending" name="Pending" stackId="goals" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.today ? "#d97706" : "#fbbf24"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const createMutation = useCreateConversation();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleTopicClick = (text: string) => {
    createMutation.mutate("New Chat", {
      onSuccess: (newChat) => {
        setLocation(`/chat/${newChat.id}?prefill=${encodeURIComponent(text)}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  const displayName = user?.displayName || user?.firstName || "Aspirant";
  const targetExams: string[] = (user?.targetExams as string[]) || [];
  const examLabels = targetExams.map((e) => EXAM_LABELS[e] || e);
  const userTypeLabel = user?.userType ? USER_TYPE_LABELS[user.userType] || user.userType : null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

          <div
            className="relative flex items-center justify-between gap-3 mb-4"
            style={{ animation: "dashboard-slide-right 0.4s ease-out both" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate" data-testid="text-dashboard-greeting">
                {getGreeting()}, <span className="text-primary">{displayName}</span>
              </h1>
              {examLabels.length > 0 && (
                <Badge variant="outline" className="text-[10px] hidden sm:inline-flex flex-shrink-0">
                  {examLabels[0]}
                  {examLabels.length > 1 && ` +${examLabels.length - 1}`}
                </Badge>
              )}
            </div>

            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/5 dark:bg-primary/10 border border-primary/15 flex-shrink-0 max-w-[260px]"
              style={{ animation: "dashboard-fade-in 0.6s ease-out 0.3s both" }}
            >
              <Sparkles className="h-3 w-3 text-primary flex-shrink-0" style={{ animation: "dashboard-bounce 2s ease-in-out infinite" }} />
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2" data-testid="text-daily-tip">
                {getMotivationalTip(user?.userType || null)}
              </p>
            </div>
          </div>

          {statsLoading ? (
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-center h-[100px]">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            </Card>
          ) : dashboardStats ? (
            <TodayAchievements stats={dashboardStats} />
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            {dashboardStats && <ProgressTrendChart stats={dashboardStats} />}
            <WeeklyGoalsChart />
          </div>

          <div style={{ animation: "dashboard-slide-up 0.5s ease-out 0.7s both" }}>
            <h2 className="text-sm font-semibold mb-2" data-testid="text-quick-actions-heading">
              Start Learning
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
              {quickActions.map((action, idx) => (
                <Link key={action.href} href={action.href} data-testid={`link-action-${action.title.toLowerCase().replace(/\s/g, "-")}`}>
                  <Card
                    className="p-3 h-full hover-elevate cursor-pointer group"
                    data-testid={`card-action-${action.title.toLowerCase().replace(/\s/g, "-")}`}
                    style={{ animation: `dashboard-scale-in 0.4s ease-out ${0.8 + idx * 0.08}s both` }}
                  >
                    <div className={`h-8 w-8 rounded-md ${action.bgColor} flex items-center justify-center mb-2`}>
                      <action.icon className={`h-4 w-4 ${action.color}`} />
                    </div>
                    <h3 className="font-semibold text-xs mb-0.5">{action.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{action.description}</p>
                    <div className="flex items-center gap-0.5 text-[10px] text-primary font-medium mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      Open
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div style={{ animation: "dashboard-slide-up 0.5s ease-out 0.9s both" }}>
            <h2 className="text-sm font-semibold mb-2" data-testid="text-suggested-heading">
              Suggested Topics
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { text: "Indian Polity Basics", icon: BookOpen },
                { text: "Economic Survey 2025", icon: Newspaper },
                { text: "Geography of India", icon: Target },
                { text: "Ethics Case Studies", icon: Brain },
              ].map((topic, i) => (
                <button
                  key={i}
                  onClick={() => handleTopicClick(topic.text)}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/50 hover-elevate border border-border cursor-pointer text-left group"
                  data-testid={`topic-${i}`}
                  style={{ animation: `dashboard-scale-in 0.4s ease-out ${1.0 + i * 0.06}s both` }}
                >
                  <topic.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-[11px] font-medium">{topic.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
