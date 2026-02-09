import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  BookOpen,
  Target,
  PenTool,
  Newspaper,
  Brain,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  TrendingUp,
  BarChart3,
  FileText,
  Clock,
  Award,
  ArrowUpRight,
} from "lucide-react";

const CYCLE_DURATION = 3200;

const featureScreens = [
  { id: "evaluation", label: "Answer Evaluation", icon: PenTool, color: "text-emerald-500 dark:text-emerald-400" },
  { id: "planner", label: "Study Planner", icon: CalendarDays, color: "text-blue-500 dark:text-blue-400" },
  { id: "progress", label: "Progress Analytics", icon: TrendingUp, color: "text-violet-500 dark:text-violet-400" },
  { id: "quiz", label: "Practice Quiz", icon: Target, color: "text-amber-500 dark:text-amber-400" },
  { id: "chat", label: "AI Chat", icon: MessageSquare, color: "text-primary" },
];

function EvaluationScreen() {
  const scores = [
    { label: "Introduction", score: 8, max: 10 },
    { label: "Content", score: 14, max: 20 },
    { label: "Analysis", score: 12, max: 15 },
    { label: "Conclusion", score: 7, max: 10 },
    { label: "Language", score: 9, max: 10 },
  ];
  const totalScore = scores.reduce((s, r) => s + r.score, 0);
  const totalMax = scores.reduce((s, r) => s + r.max, 0);

  return (
    <div className="p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground">GS Paper II - Answer</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Evaluated by AI</p>
          </div>
        </div>
        <motion.div
          className="flex items-center gap-1 bg-emerald-500/10 rounded-full px-2 py-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <Award className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {totalScore}/{totalMax}
          </span>
        </motion.div>
      </div>

      {scores.map((item, i) => (
        <motion.div
          key={item.label}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.1 }}
        >
          <span className="text-[9px] sm:text-[10px] text-muted-foreground w-16 sm:w-20 flex-shrink-0 truncate">{item.label}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(item.score / item.max) * 100}%` }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
            />
          </div>
          <span className="text-[9px] font-medium text-foreground w-8 text-right flex-shrink-0">{item.score}/{item.max}</span>
        </motion.div>
      ))}

      <motion.div
        className="mt-1 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">AI Feedback:</span> Good structural approach. Strengthen analytical depth with Supreme Court judgments for higher marks.
        </p>
      </motion.div>
    </div>
  );
}

function PlannerScreen() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const slots = [
    { time: "6-8 AM", subjects: ["Polity", "History", "Eco", "Geography", "Ethics", "Revision"] },
    { time: "9-12 PM", subjects: ["Essay", "GS-II", "GS-III", "GS-I", "CSAT", "Optionals"] },
    { time: "2-5 PM", subjects: ["Current Affairs", "Answer Writing", "MCQs", "Notes", "Mock Test", "Analysis"] },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center">
            <CalendarDays className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground">Weekly Timetable</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">AI-Generated Plan</p>
          </div>
        </div>
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Clock className="h-3 w-3 text-blue-500 dark:text-blue-400" />
          <span className="text-[9px] text-muted-foreground">42 hrs/week</span>
        </motion.div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/30">
        <div className="grid grid-cols-7 text-center">
          <div className="text-[8px] text-muted-foreground p-1 border-b border-r border-border/20 bg-muted/30" />
          {days.map((d, i) => (
            <motion.div
              key={d}
              className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground p-1 border-b border-border/20 bg-muted/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              {d}
            </motion.div>
          ))}
          {slots.map((slot, si) => (
            <motion.div key={slot.time} className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + si * 0.15 }}>
              <div className="text-[7px] sm:text-[8px] text-muted-foreground p-1 border-r border-b border-border/20 bg-muted/20 flex items-center justify-center">
                {slot.time}
              </div>
              {slot.subjects.map((subj, di) => (
                <motion.div
                  key={`${si}-${di}`}
                  className="text-[7px] sm:text-[8px] p-1 border-b border-border/10 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + si * 0.1 + di * 0.04 }}
                >
                  <span className="truncate text-foreground/80 font-medium">{subj}</span>
                </motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressScreen() {
  const weekData = [
    { day: "Mon", score: 65 },
    { day: "Tue", score: 72 },
    { day: "Wed", score: 58 },
    { day: "Thu", score: 78 },
    { day: "Fri", score: 85 },
    { day: "Sat", score: 82 },
    { day: "Sun", score: 90 },
  ];
  const maxScore = 100;
  const chartH = 80;

  const points = weekData.map((d, i) => {
    const x = (i / (weekData.length - 1)) * 100;
    const y = chartH - (d.score / maxScore) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L 100 ${chartH} L 0 ${chartH} Z`;

  return (
    <div className="p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground">Weekly Performance</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Quiz & Answer scores</p>
          </div>
        </div>
        <motion.div
          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <ArrowUpRight className="h-3 w-3" />
          <span className="text-[10px] font-bold">+18%</span>
        </motion.div>
      </div>

      <div className="relative">
        <svg viewBox={`-4 -4 108 ${chartH + 20}`} className="w-full" style={{ height: 110 }}>
          <motion.path
            d={areaD}
            fill="url(#areaGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          />
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={pathD}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
          />
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            />
          ))}
          {points.map((p, i) => (
            <motion.text
              key={`label-${i}`}
              x={p.x}
              y={chartH + 14}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
            >
              {p.day}
            </motion.text>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        {[
          { label: "Avg Score", value: "76%", color: "text-primary" },
          { label: "Questions", value: "142", color: "text-blue-500 dark:text-blue-400" },
          { label: "Streak", value: "7 days", color: "text-amber-500 dark:text-amber-400" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className="text-center"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.1 }}
          >
            <p className={`text-[11px] sm:text-xs font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function QuizScreen() {
  const [selected, setSelected] = useState(-1);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer = 1;

  useEffect(() => {
    const t1 = setTimeout(() => setSelected(2), 800);
    const t2 = setTimeout(() => { setSelected(correctAnswer); setShowResult(true); }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const options = [
    "Parliament of India",
    "Supreme Court of India",
    "Election Commission",
    "President of India",
  ];

  return (
    <div className="p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
            <Target className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground">UPSC Prelims MCQ</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Indian Polity</p>
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground">Q 14/25</span>
      </div>

      <motion.p
        className="text-[10px] sm:text-xs text-foreground font-medium leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Which body has the power to declare a law unconstitutional in India?
      </motion.p>

      <div className="space-y-1.5">
        {options.map((opt, i) => {
          let borderClass = "border-border/40";
          let bgClass = "";
          if (showResult && i === correctAnswer) {
            borderClass = "border-emerald-500/50";
            bgClass = "bg-emerald-500/10";
          } else if (selected === i && !showResult) {
            borderClass = "border-primary/50";
            bgClass = "bg-primary/5";
          } else if (showResult && selected === i && i !== correctAnswer) {
            borderClass = "border-red-500/50";
            bgClass = "bg-red-500/5";
          }

          return (
            <motion.div
              key={i}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${borderClass} ${bgClass} transition-colors`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                showResult && i === correctAnswer ? "border-emerald-500 bg-emerald-500" : "border-border"
              }`}>
                {showResult && i === correctAnswer && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              <span className="text-[9px] sm:text-[10px] text-foreground">{opt}</span>
            </motion.div>
          );
        })}
      </div>

      {showResult && (
        <motion.div
          className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Correct!</span> Under Article 13, the Supreme Court can review and strike down laws.
          </p>
        </motion.div>
      )}
    </div>
  );
}

function ChatScreen() {
  const messages = [
    { role: "user", text: "Explain Article 370 and its abrogation" },
    { role: "ai", text: "Article 370 granted special autonomous status to J&K under Part XXI of the Constitution..." },
    { role: "user", text: "What are the implications for federalism?" },
  ];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    messages.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 400 + i * 600));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="p-3 sm:p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs font-semibold text-foreground">AI Study Chat</p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Constitutional Law</p>
        </div>
      </div>

      <div className="space-y-2">
        {messages.slice(0, visible).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[9px] sm:text-[10px] leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              {msg.role === "ai" && (
                <div className="flex items-center gap-1 mb-0.5">
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[8px] font-semibold text-primary">Learnpro AI</span>
                </div>
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>

      {visible >= messages.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-start"
        >
          <div className="bg-muted rounded-xl px-3 py-2 rounded-bl-sm">
            <div className="flex gap-1 items-center h-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function HeroDashboardAnimation() {
  const [activeScreen, setActiveScreen] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveScreen((s) => (s + 1) % featureScreens.length);
    }, CYCLE_DURATION);
    return () => clearInterval(intervalRef.current);
  }, []);

  const screens = [EvaluationScreen, PlannerScreen, ProgressScreen, QuizScreen, ChatScreen];
  const ActiveComponent = screens[activeScreen];
  const activeFeature = featureScreens[activeScreen];

  return (
    <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl mx-auto" data-testid="hero-animation">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/15 via-primary/5 to-primary/15 rounded-3xl blur-2xl opacity-50" />

      <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10 bg-card">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
          </div>
          <span className="text-[10px] text-muted-foreground ml-2 font-medium">Learnpro AI</span>
          <div className="ml-auto flex items-center gap-1">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-green-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[9px] text-muted-foreground">AI Active</span>
          </div>
        </div>

        <div className="flex">
          <div className="w-11 sm:w-12 border-r border-border/30 bg-muted/20 py-2.5 flex flex-col items-center gap-2.5">
            {featureScreens.map((item, i) => (
              <div
                key={item.id}
                className={`flex flex-col items-center gap-0.5 p-1 rounded-md ${
                  i === activeScreen ? "bg-primary/10" : ""
                }`}
                data-testid={`hero-nav-${item.id}`}
              >
                <div className={`rounded-md flex items-center justify-center p-1.5 ${
                  i === activeScreen ? "bg-primary/15" : "bg-muted/50"
                }`}>
                  <item.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${i === activeScreen ? item.color : "text-muted-foreground"}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 bg-muted/10">
              <activeFeature.icon className={`h-3 w-3 ${activeFeature.color}`} />
              <span className="text-[10px] sm:text-xs font-semibold text-foreground">{activeFeature.label}</span>
              <div className="ml-auto flex items-center gap-1">
                {featureScreens.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1 rounded-full ${i === activeScreen ? "bg-primary w-3" : "bg-muted-foreground/20 w-1"}`}
                    layout
                    transition={{ duration: 0.2 }}
                  />
                ))}
              </div>
            </div>

            <div className="h-[220px] sm:h-[260px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <ActiveComponent />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="absolute -bottom-4 -left-3 sm:-bottom-5 sm:-left-5 bg-card border border-border rounded-xl p-2.5 sm:p-3 shadow-lg flex items-center gap-2.5"
        data-testid="hero-badge-accuracy"
      >
        <motion.div
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-emerald-500/10 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
        <div>
          <p className="text-[10px] sm:text-xs font-semibold text-foreground">85% Accuracy</p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">This week</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="absolute -top-3 -right-2 sm:-top-4 sm:-right-4 bg-card border border-border rounded-xl p-2.5 sm:p-3 shadow-lg"
        data-testid="hero-badge-streak"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
          >
            <BarChart3 className="h-4 w-4 text-violet-500 dark:text-violet-400" />
          </motion.div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground">12-Day Streak</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="h-1 w-1 rounded-full bg-primary"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                />
              ))}
              <span className="text-[8px] text-muted-foreground ml-0.5">Keep going!</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function NeuralNetworkAnimation() {
  const neuralNodes = [
    { cx: 50, cy: 50, r: 6, delay: 0 },
    { cx: 20, cy: 25, r: 4, delay: 0.2 },
    { cx: 80, cy: 25, r: 4, delay: 0.4 },
    { cx: 20, cy: 75, r: 4, delay: 0.6 },
    { cx: 80, cy: 75, r: 4, delay: 0.8 },
    { cx: 35, cy: 15, r: 3, delay: 0.3 },
    { cx: 65, cy: 15, r: 3, delay: 0.5 },
    { cx: 10, cy: 50, r: 3, delay: 0.7 },
    { cx: 90, cy: 50, r: 3, delay: 0.9 },
    { cx: 35, cy: 85, r: 3, delay: 0.4 },
    { cx: 65, cy: 85, r: 3, delay: 0.6 },
    { cx: 50, cy: 5, r: 2.5, delay: 0.1 },
    { cx: 50, cy: 95, r: 2.5, delay: 0.3 },
  ];

  const neuralConnections = [
    { x1: 50, y1: 50, x2: 20, y2: 25 },
    { x1: 50, y1: 50, x2: 80, y2: 25 },
    { x1: 50, y1: 50, x2: 20, y2: 75 },
    { x1: 50, y1: 50, x2: 80, y2: 75 },
    { x1: 50, y1: 50, x2: 10, y2: 50 },
    { x1: 50, y1: 50, x2: 90, y2: 50 },
    { x1: 20, y1: 25, x2: 35, y2: 15 },
    { x1: 80, y1: 25, x2: 65, y2: 15 },
    { x1: 35, y1: 15, x2: 50, y2: 5 },
    { x1: 65, y1: 15, x2: 50, y2: 5 },
    { x1: 20, y1: 75, x2: 35, y2: 85 },
    { x1: 80, y1: 75, x2: 65, y2: 85 },
    { x1: 35, y1: 85, x2: 50, y2: 95 },
    { x1: 65, y1: 85, x2: 50, y2: 95 },
    { x1: 20, y1: 25, x2: 10, y2: 50 },
    { x1: 80, y1: 25, x2: 90, y2: 50 },
    { x1: 20, y1: 75, x2: 10, y2: 50 },
    { x1: 80, y1: 75, x2: 90, y2: 50 },
  ];

  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((n) => (n + 1) % neuralNodes.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72" data-testid="neural-network-animation">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl" />

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            </radialGradient>
          </defs>

          {neuralConnections.map((conn, i) => (
            <motion.line
              key={`conn-${i}`}
              x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2}
              stroke="hsl(var(--primary))"
              strokeWidth="0.3"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}

          {neuralConnections.slice(0, 6).map((conn, i) => (
            <motion.circle
              key={`signal-${i}`}
              r="1.5"
              fill="hsl(var(--primary))"
              initial={{ cx: conn.x1, cy: conn.y1, opacity: 0 }}
              animate={{ cx: [conn.x1, conn.x2], cy: [conn.y1, conn.y2], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.6, repeatDelay: 2 }}
            />
          ))}

          {neuralNodes.map((node, i) => (
            <motion.circle
              key={`node-${i}`}
              cx={node.cx} cy={node.cy} r={node.r}
              fill="url(#nodeGrad)"
              filter="url(#glow)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: i === activeNode ? 1 : 0.6,
                scale: i === activeNode ? 1.3 : 1,
              }}
              whileInView={{ opacity: [0, 0.6], scale: [0, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: node.delay }}
            />
          ))}

          <motion.circle
            cx="50" cy="50" r="10"
            fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </svg>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
          <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
      </motion.div>
    </div>
  );
}
