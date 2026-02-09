import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  Target,
  PenTool,
  Newspaper,
  MessageSquare,
  GraduationCap,
  CheckCircle2,
  Users,
  FileText,
  BarChart3,
  Star,
  Clock,
  Zap,
  Shield,
  Sparkles,
  Brain,
  Heart,
  Crown,
  MapPin,
  Landmark,
  Award,
  Scale,
  Building2,
  Compass,
  Mountain,
  TreePine,
  Scroll,
  Globe,
  Flag,
} from "lucide-react";
import { motion } from "framer-motion";
import { HeroDashboardAnimation, NeuralNetworkAnimation } from "@/components/landing/hero-animation";
import { LoginSlideOver } from "@/components/login-slide-over";
import { LandingFooter } from "@/components/landing/footer";
import { MobileAppSection } from "@/components/landing/mobile-app-section";

function AnimatedCounter({ target, suffix = "+" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const formatted = count >= 1000 ? `${(count / 1000).toFixed(count >= target ? 0 : 1)}K` : count.toString();

  return (
    <span ref={ref} className="tabular-nums">
      {formatted}{suffix}
    </span>
  );
}

const featureItems = [
  {
    id: "ai-chat",
    icon: MessageSquare,
    title: "Ask Anything, Anytime",
    description: "Your AI study buddy is always here. Get clear, structured answers to any UPSC or State PSC doubt, with PYQ references and real concept clarity -- day or night.",
    cta: "Start a Conversation",
  },
  {
    id: "syllabus",
    icon: BookOpen,
    title: "Your Syllabus, Organized",
    description: "No more guessing what to study next. GS Paper I-IV, CSAT, and Optionals -- all mapped out with structured learning paths based on NCERTs and standard books.",
    cta: "See Your Syllabus",
  },
  {
    id: "answer-writing",
    icon: PenTool,
    title: "Practice Writing, Get Better",
    description: "Write answers for GS, Ethics, and Essay. Get thoughtful, structured feedback on your Introduction, Body, and Conclusion -- just like a mentor would give.",
    cta: "Try Answer Practice",
  },
  {
    id: "current-affairs",
    icon: Newspaper,
    title: "Stay Updated, Stay Ahead",
    description: "Daily digests from top newspapers, mapped to GS papers. State-specific filtering for 15 State PSCs. Never miss what matters for your exam.",
    cta: "Read Today's Digest",
  },
  {
    id: "practice-mcqs",
    icon: Target,
    title: "Build Confidence with Practice",
    description: "Topic-wise MCQs for UPSC + 15 State PSCs. AI-crafted questions with detailed explanations so you understand why, not just what.",
    cta: "Start Practicing",
  },
];

const FEATURE_CYCLE_MS = 5000;

function FeatureVisualAIChat() {
  return (
    <div className="relative w-full h-full flex flex-col justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-2xl" />
      <div className="relative space-y-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex justify-start"
        >
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
            <p className="text-xs text-foreground">Explain Article 370 and its abrogation in 2019 for UPSC Mains.</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex justify-end"
        >
          <div className="bg-primary/10 dark:bg-primary/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
            <p className="text-xs text-foreground/90 font-medium mb-1">Article 370 - Key Points:</p>
            <div className="space-y-1">
              {["Granted special autonomy to J&K", "Separate Constitution & flag", "Abrogated on 5th Aug 2019", "J&K reorganized into 2 UTs"].map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.3, duration: 0.3 }}
                  className="flex items-start gap-1.5"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-[11px] text-foreground/80">{line}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.5 }}
          className="flex justify-start"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex gap-0.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-1 h-1 rounded-full bg-primary"
                />
              ))}
            </motion.div>
            <span className="text-[10px]">AI is thinking...</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureVisualSyllabus() {
  const subjects = [
    { name: "GS Paper I", progress: 72, color: "bg-blue-500" },
    { name: "GS Paper II", progress: 45, color: "bg-emerald-500" },
    { name: "GS Paper III", progress: 58, color: "bg-purple-500" },
    { name: "GS Paper IV", progress: 83, color: "bg-amber-500" },
    { name: "CSAT", progress: 35, color: "bg-rose-500" },
  ];
  return (
    <div className="relative w-full h-full flex flex-col justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 rounded-2xl" />
      <div className="relative space-y-3">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-semibold text-foreground/80 mb-2"
        >
          Syllabus Progress
        </motion.p>
        {subjects.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * i, duration: 0.4 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">{s.name}</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 * i + 0.5 }}
                className="text-[10px] font-bold text-foreground/60"
              >{s.progress}%</motion.span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.progress}%` }}
                transition={{ delay: 0.15 * i + 0.3, duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${s.color}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FeatureVisualAnswerWriting() {
  const scores = [
    { label: "Content", score: 8, max: 10 },
    { label: "Structure", score: 7, max: 10 },
    { label: "Analysis", score: 9, max: 10 },
    { label: "Language", score: 6, max: 10 },
  ];
  return (
    <div className="relative w-full h-full flex flex-col justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl" />
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center mb-4"
        >
          <div className="relative">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                className="text-emerald-500"
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 * (1 - 0.75) }}
                transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-xl font-bold text-foreground">7.5</span>
              <span className="text-[9px] text-muted-foreground">/10</span>
            </motion.div>
          </div>
        </motion.div>
        <div className="grid grid-cols-2 gap-2">
          {scores.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="flex items-center gap-2"
            >
              <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.score / s.max) * 100}%` }}
                  transition={{ delay: 0.7 + i * 0.15, duration: 0.6 }}
                  className="h-full rounded-full bg-emerald-500"
                />
              </div>
              <span className="text-[10px] text-foreground/70 w-14 text-right">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureVisualCurrentAffairs() {
  const topics = [
    { cat: "Economy", title: "RBI Monetary Policy Update", tag: "GS III" },
    { cat: "Polity", title: "Supreme Court on Article 142", tag: "GS II" },
    { cat: "Intl. Relations", title: "India-ASEAN Summit 2026", tag: "GS II" },
    { cat: "Science", title: "ISRO's Gaganyaan Progress", tag: "GS III" },
  ];
  return (
    <div className="relative w-full h-full flex flex-col justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl" />
      <div className="relative space-y-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-1"
        >
          <Newspaper className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground/80">Today's Digest</span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium ml-auto">4 topics</span>
        </motion.div>
        {topics.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.25 }}
            className="flex items-center gap-2 rounded-lg bg-card/80 border border-border/40 px-3 py-2"
          >
            <div className={`w-1 h-6 rounded-full flex-shrink-0 ${
              i === 0 ? "bg-emerald-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-purple-500" : "bg-amber-500"
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground/90 truncate">{t.title}</p>
              <p className="text-[9px] text-muted-foreground">{t.cat}</p>
            </div>
            <span className="text-[9px] font-medium bg-muted px-1.5 py-0.5 rounded text-foreground/60 flex-shrink-0">{t.tag}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FeatureVisualPracticeMCQ() {
  return (
    <div className="relative w-full h-full flex flex-col justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 dark:from-rose-500/10 dark:to-pink-500/10 rounded-2xl" />
      <div className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-semibold text-foreground/80 mb-3"
        >
          Q. Which Article deals with Right to Education?
        </motion.div>
        {[
          { label: "A", text: "Article 19", correct: false },
          { label: "B", text: "Article 21A", correct: true },
          { label: "C", text: "Article 25", correct: false },
          { label: "D", text: "Article 32", correct: false },
        ].map((opt, i) => (
          <motion.div
            key={opt.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-1.5 border transition-all ${
              opt.correct
                ? "border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20"
                : "border-border/40 bg-card/50"
            }`}
          >
            <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              opt.correct ? "bg-emerald-500 text-white" : "bg-muted text-foreground/60"
            }`}>{opt.label}</span>
            <span className={`text-[11px] ${opt.correct ? "font-semibold text-foreground" : "text-foreground/70"}`}>{opt.text}</span>
            {opt.correct && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5, type: "spring" }}
                className="ml-auto"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </motion.div>
            )}
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 px-3 py-2 border border-emerald-500/20"
        >
          <p className="text-[10px] text-foreground/70">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Correct!</span> Article 21A was inserted by the 86th Amendment Act, 2002.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const featureVisuals: Record<string, () => JSX.Element> = {
  "ai-chat": FeatureVisualAIChat,
  "syllabus": FeatureVisualSyllabus,
  "answer-writing": FeatureVisualAnswerWriting,
  "current-affairs": FeatureVisualCurrentAffairs,
  "practice-mcqs": FeatureVisualPracticeMCQ,
};

function AutoCyclingFeatures({ openLogin }: { openLogin: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = 50;
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setActiveIndex((i) => (i + 1) % featureItems.length);
          return 0;
        }
        return p + (tick / FEATURE_CYCLE_MS) * 100;
      });
    }, tick);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeIndex]);

  const selectFeature = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
  };

  const active = featureItems[activeIndex];
  const VisualComponent = featureVisuals[active.id];

  return (
    <div
      className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start"
      data-testid="feature-tabs-container"
    >
      <div className="flex-1 min-w-0">
        <div className="space-y-1">
          {featureItems.map((feature, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={feature.id}
                onClick={() => selectFeature(index)}
                className={`w-full text-left rounded-xl px-4 py-2.5 transition-colors cursor-pointer relative ${
                  isActive ? "bg-primary/5 dark:bg-primary/10" : "bg-transparent"
                }`}
                data-testid={`feature-tab-${feature.id}`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                )}
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-foreground/70"}`}>
                    {feature.title}
                  </span>
                </div>
                {isActive && (
                  <div className="mt-1.5 ml-12 h-0.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${progress}%`, transition: "none" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pl-4 min-h-[72px]">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {active.description}
          </p>
          <Button
            size="sm"
            className="mt-2 gap-1.5"
            onClick={openLogin}
            data-testid={`button-feature-${active.id}`}
          >
            {active.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="lg:w-[340px] xl:w-[380px] flex-shrink-0">
        <div className="rounded-2xl border bg-card shadow-sm h-[320px] overflow-hidden relative">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <VisualComponent />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  {
    name: "Aarav Sharma",
    text: "It feels like having a patient mentor who never gets tired of my questions. The AI understands exactly how UPSC wants you to frame answers.",
    rating: 5,
  },
  {
    name: "Priya Verma",
    text: "The daily current affairs mapped to GS papers saved me hours every morning. The state-specific filtering for JPSC is something I couldn't find anywhere else.",
    rating: 5,
  },
  {
    name: "Rohit Kumar",
    text: "I used to feel overwhelmed by the syllabus. Learnpro made it manageable. The practice MCQs with explanations genuinely helped me improve my accuracy.",
    rating: 5,
  },
  {
    name: "Sneha Patel",
    text: "What I love most is that it doesn't just give answers -- it teaches you how to think. The answer writing feedback is structured and genuinely useful.",
    rating: 5,
  },
];


const STATE_PSC_EXAMS = [
  { id: "uppsc", label: "UPPSC", icon: Landmark, abbr: "UP" },
  { id: "mppsc", label: "MPPSC", icon: Building2, abbr: "MP" },
  { id: "bpsc", label: "BPSC", icon: Scale, abbr: "BH" },
  { id: "jpsc", label: "JPSC", icon: Mountain, abbr: "JH" },
  { id: "rpsc", label: "RPSC", icon: Compass, abbr: "RJ" },
  { id: "wbpsc", label: "WBPSC", icon: Globe, abbr: "WB" },
  { id: "opsc", label: "OPSC", icon: TreePine, abbr: "OD" },
  { id: "cgpsc", label: "CGPSC", icon: Flag, abbr: "CG" },
  { id: "ukpsc", label: "UKPSC", icon: Mountain, abbr: "UK" },
  { id: "hpsc", label: "HPSC", icon: Award, abbr: "HR" },
  { id: "kpsc", label: "KPSC", icon: Scroll, abbr: "KA" },
  { id: "tnpsc", label: "TNPSC", icon: Landmark, abbr: "TN" },
  { id: "appsc", label: "APPSC", icon: MapPin, abbr: "AP" },
  { id: "gpsc", label: "GPSC", icon: Building2, abbr: "GJ" },
  { id: "nepsc", label: "NE States", icon: TreePine, abbr: "NE" },
];

function PrepareForExamsSection() {
  return (
    <div className="space-y-8" data-testid="exams-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 justify-center"
      >
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:from-amber-500/20 dark:to-orange-500/20 dark:border-amber-400/20" data-testid="exam-upsc">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg">UPSC CSE</h3>
            <p className="text-xs text-muted-foreground">IAS / IPS / IFS</p>
          </div>
        </div>
        <div className="hidden sm:block h-8 w-px bg-border" />
        <div className="text-center sm:text-left">
          <p className="text-2xl sm:text-3xl font-display font-bold">
            + 15 <span className="text-muted-foreground text-base font-normal">State PSCs</span>
          </p>
        </div>
      </motion.div>

      <div className="relative overflow-hidden" data-testid="exams-marquee">
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-secondary/80 to-transparent z-10 pointer-events-none dark:from-secondary/90" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-secondary/80 to-transparent z-10 pointer-events-none dark:from-secondary/90" />
        <div className="flex animate-marquee gap-3">
          {[...STATE_PSC_EXAMS, ...STATE_PSC_EXAMS].map((exam, i) => {
            const Icon = exam.icon;
            return (
              <div
                key={`${exam.id}-${i}`}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border/50 whitespace-nowrap flex-shrink-0"
                data-testid={`exam-icon-${exam.id}`}
              >
                <Icon className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-medium">{exam.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true" || params.get("error")) {
      setLoginOpen(true);
    }
  }, []);

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;

  const openLogin = () => setLoginOpen(true);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <LoginSlideOver open={loginOpen} onClose={() => setLoginOpen(false)} />

      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-[999] bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Logo size="md" />
          <div className="flex items-center flex-wrap gap-4">
            <a href="#features">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground" data-testid="link-features">
                Features
              </Button>
            </a>
            <a href="#exams">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground" data-testid="link-exams">
                Exams
              </Button>
            </a>
            <Button
              onClick={openLogin}
              data-testid="button-login-nav"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section className="relative overflow-hidden pt-6 sm:pt-8 lg:pt-10 pb-12 sm:pb-16 lg:pb-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70" />
          <div className="absolute top-10 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>

          <motion.div
            className="absolute top-[15%] left-[8%] w-2 h-2 rounded-full bg-primary/15"
            animate={{ y: [0, -20, 0], opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-[25%] right-[12%] w-3 h-3 rounded-full bg-primary/10"
            animate={{ y: [0, -15, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-primary/20"
            animate={{ y: [0, -12, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute top-[60%] right-[5%] w-2.5 h-2.5 rounded-full bg-primary/10"
            animate={{ y: [0, -18, 0], opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}
          />
          <motion.div
            className="absolute top-[40%] left-[3%] w-1 h-16 bg-gradient-to-b from-primary/10 to-transparent rounded-full"
            animate={{ opacity: [0.1, 0.25, 0.1], scaleY: [1, 1.2, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-[10%] right-[20%] w-1 h-12 bg-gradient-to-b from-primary/8 to-transparent rounded-full rotate-45"
            animate={{ opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 6, repeat: Infinity, delay: 1.5 }}
          />
          <motion.div
            className="absolute bottom-[30%] right-[25%] w-8 h-8 rounded-full border border-primary/8"
            animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 5, repeat: Infinity, delay: 0.8 }}
          />
          <motion.div
            className="absolute top-[70%] left-[25%] w-5 h-5 rounded-full border border-primary/6"
            animate={{ scale: [1, 1.4, 1], opacity: [0.06, 0.15, 0.06] }}
            transition={{ duration: 4, repeat: Infinity, delay: 2.5 }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              <div className="flex-1 text-center lg:text-left max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-6 sm:mb-8 border border-primary/20" data-testid="badge-hero">
                    <Heart className="h-3.5 w-3.5" />
                    Trusted by 10,000+ aspirants
                  </span>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-foreground mb-5 sm:mb-6 leading-[1.1]" data-testid="text-hero-heading">
                    Your AI companion for{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">
                      UPSC & State PSC
                    </span>{" "}
                    preparation
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0" data-testid="text-hero-subtitle">
                    Preparing for civil services is a long journey -- you don't have to walk it alone. Learnpro AI is the patient, intelligent study partner that's always by your side.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start flex-wrap gap-4">
                    <Button
                      size="lg"
                      onClick={openLogin}
                      className="w-full sm:w-auto rounded-full shadow-xl shadow-primary/30"
                      data-testid="button-get-started"
                    >
                      Begin Your Journey
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto rounded-full"
                      data-testid="button-view-demo"
                    >
                      See How It Works
                    </Button>
                  </div>

                  <div className="flex items-center justify-center lg:justify-start flex-wrap gap-6 mt-8 sm:mt-10">
                    {[
                      { icon: Brain, label: "AI-Powered" },
                      { icon: Shield, label: "Always Free" },
                      { icon: Sparkles, label: "Personalized" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 text-primary" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-shrink-0 w-full max-w-md lg:max-w-lg xl:max-w-xl"
              >
                <HeroDashboardAnimation />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.08),transparent_50%)]" />
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/20"
                style={{
                  left: `${5 + (i * 4.7) % 90}%`,
                  top: `${10 + (i * 7.3) % 80}%`,
                }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="stats-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stats-grid)" />
            </svg>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-10"
            >
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-violet-400/80">Trusted by Aspirants Nationwide</span>
              <div className="mt-1 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              {[
                { value: 10000, label: "Aspirants Trust Us", icon: Users, suffix: "+", color: "#f59e0b", rgb: "245,158,11" },
                { value: 50000, label: "Questions Practiced", icon: Target, suffix: "+", color: "#3b82f6", rgb: "59,130,246" },
                { value: 15000, label: "Answers Evaluated", icon: FileText, suffix: "+", color: "#10b981", rgb: "16,185,129" },
                { value: 60, label: "Exams Covered", icon: BarChart3, suffix: "+", color: "#a855f7", rgb: "168,85,247" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
                  data-testid={`stat-${i}`}
                >
                  <div
                    className="stats-card stats-shimmer backdrop-blur-md flex flex-col items-center py-6 sm:py-7 px-3 relative"
                    style={{ '--stat-color': stat.color } as React.CSSProperties}
                  >
                    <div className="relative mb-4">
                      <div
                        className="absolute inset-0 rounded-full blur-xl stats-glow-ring"
                        style={{ background: `rgba(${stat.rgb}, 0.25)` }}
                      />
                      <div
                        className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, rgba(${stat.rgb}, 0.2), rgba(${stat.rgb}, 0.05))`, border: `1px solid rgba(${stat.rgb}, 0.3)` }}
                      >
                        <stat.icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" style={{ color: stat.color }} />
                      </div>
                    </div>
                    <span
                      className="text-3xl sm:text-[2.75rem] font-display font-extrabold tracking-tight text-white stats-number-glow"
                      style={{ '--primary-rgb': stat.rgb } as React.CSSProperties}
                    >
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 mt-2 font-medium tracking-[0.15em] uppercase">{stat.label}</span>

                    <motion.div
                      className="absolute bottom-2 right-2 w-6 h-6 rounded-full opacity-10"
                      style={{ background: `radial-gradient(circle, rgba(${stat.rgb}, 0.8), transparent)` }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-6 sm:mt-8 flex justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 border-2 border-slate-900 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">{["A", "S", "R", "P"][j]}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-slate-400 ml-1">Join thousands preparing smarter with AI</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="py-14 sm:py-20 bg-secondary/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <span className="text-xs sm:text-sm font-semibold text-primary tracking-wide uppercase" data-testid="text-features-subtitle">
                Built for Serious Aspirants
              </span>
              <h2 className="text-2xl sm:text-4xl font-display font-bold mt-2 sm:mt-3" data-testid="text-features-heading">
                Everything you need, in one place
              </h2>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
                No more juggling between apps and tabs. Your entire preparation ecosystem, powered by AI.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <AutoCyclingFeatures openLogin={openLogin} />
            </motion.div>
          </div>
        </section>

        <section className="py-14 sm:py-20 bg-background overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex-shrink-0"
              >
                <NeuralNetworkAnimation />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex-1 text-center lg:text-left"
              >
                <span className="text-xs sm:text-sm font-semibold text-primary tracking-wide uppercase">
                  Why Learnpro AI?
                </span>
                <h2 className="text-2xl sm:text-4xl font-display font-bold mt-2 sm:mt-3 mb-4 sm:mb-6" data-testid="text-why-heading">
                  More than a tool. A study partner who understands you.
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0">
                  UPSC preparation is demanding. You need consistency, clarity, and confidence. Learnpro AI is designed to give you all three -- with the patience of a mentor and the precision of technology.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Brain, title: "Thinks Like a Mentor", desc: "Understands UPSC patterns and gives exam-relevant responses" },
                    { icon: Heart, title: "Patient & Supportive", desc: "Ask the same question 100 times -- no judgment, ever" },
                    { icon: Sparkles, title: "Learns About You", desc: "Adapts to your strengths, weaknesses, and study pace" },
                    { icon: Shield, title: "Always Available", desc: "24/7 access. Your preparation never has to wait" },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 text-left" data-testid={`why-item-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <div className="h-9 w-9 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="exams" className="py-14 sm:py-20 bg-secondary/30 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-10"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20"
              >
                <Sparkles className="h-3 w-3" />
                16 Exams Supported
              </motion.div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-exams-heading">
                Prepare for Top Exams
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base max-w-lg mx-auto">
                Comprehensive preparation support for India's most competitive civil services examinations
              </p>
            </motion.div>

            <PrepareForExamsSection />
          </div>
        </section>

        <section className="py-14 sm:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-impact-heading">
                Real impact, real numbers
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base">
                Here's what Learnpro brings to your daily preparation
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  icon: Zap,
                  stat: "3x",
                  label: "More Practice Done",
                  desc: "Aspirants using Learnpro practice 3x more questions than with traditional methods",
                },
                {
                  icon: Clock,
                  stat: "60s",
                  label: "Instant AI Responses",
                  desc: "Get clear, structured answers in under a minute -- whenever you need them",
                },
                {
                  icon: Shield,
                  stat: "16",
                  label: "Exams Supported",
                  desc: "UPSC + 15 State PSCs with exam-specific question patterns and syllabus",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-5 sm:p-6 text-center h-full" data-testid={`impact-card-${i}`}>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-3xl sm:text-4xl font-display font-bold text-primary">{item.stat}</span>
                    <p className="font-semibold text-foreground text-sm sm:text-base mt-1">{item.label}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20 bg-secondary/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-testimonials-heading">
                From aspirants who've been where you are
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base">
                Real stories from real learners
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-5 sm:p-6 h-full" data-testid={`testimonial-${i}`}>
                    <div className="flex flex-wrap gap-0.5 mb-3">
                      {Array.from({ length: testimonial.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                      "{testimonial.text}"
                    </p>
                    <div className="flex items-center flex-wrap gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {testimonial.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-foreground">{testimonial.name}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold mb-3 sm:mb-4" data-testid="text-cta-heading">
                Your preparation deserves a better companion
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mb-8 sm:mb-10 max-w-xl mx-auto">
                Join thousands of aspirants who chose a smarter, kinder way to prepare. Learnpro AI is here to walk with you -- every single day.
              </p>
              <Button
                size="lg"
                onClick={openLogin}
                className="rounded-full shadow-xl shadow-primary/30"
                data-testid="button-bottom-cta"
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>
        <MobileAppSection />
      </main>

      <LandingFooter />
    </div>
  );
}
