import { useEffect, useRef, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BookOpen,
  Target,
  Flame,
  PenTool,
  Newspaper,
  MessageSquare,
  GraduationCap,
  CheckCircle2,
  X,
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
} from "lucide-react";
import { motion } from "framer-motion";
import { HeroDashboardAnimation, NeuralNetworkAnimation } from "@/components/landing/hero-animation";
import { LoginSlideOver } from "@/components/login-slide-over";

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

function StudyStreakCard() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["M", "T", "W", "Th", "F", "S", "Su"];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const streakDays = useMemo(() => {
    const days = new Set<number>();
    const todayDate = today.getDate();
    for (let i = Math.max(1, todayDate - 6); i <= todayDate; i++) {
      days.add(i);
    }
    if (todayDate > 10) {
      days.add(todayDate - 9);
      days.add(todayDate - 10);
    }
    return days;
  }, []);

  const streakCount = streakDays.size;

  const calendarCells = [];
  for (let i = 0; i < startDay; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="h-7 w-7 sm:h-8 sm:w-8" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isStreak = streakDays.has(day);
    const isToday = day === today.getDate();
    calendarCells.push(
      <div
        key={day}
        className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center text-xs font-medium relative
          ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
          ${isStreak ? "bg-primary/10 dark:bg-primary/20" : ""}`}
      >
        {isStreak ? (
          <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        ) : (
          <span className="text-muted-foreground">{day}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative" data-testid="streak-card">
      <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-sm max-w-[280px] sm:max-w-xs mx-auto">
        <div className="flex flex-col items-center mb-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <span className="text-xl sm:text-2xl font-display font-bold">{streakCount}-day streak</span>
          <span className="text-xs text-muted-foreground">{monthNames[currentMonth]} {currentYear}</span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {dayNames.map((d) => (
            <div key={d} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {calendarCells}
        </div>
      </div>

      <div className="absolute -bottom-6 -right-4 sm:-bottom-8 sm:-right-6 opacity-20 dark:opacity-10">
        <GraduationCap className="h-20 w-20 sm:h-28 sm:w-28 text-primary" />
      </div>
    </div>
  );
}

function ComparisonTable() {
  const features = [
    { name: "AI Doubt Resolution", learnpro: true, chatgpt: "limited", coaching: false },
    { name: "UPSC Syllabus Coverage", learnpro: true, chatgpt: false, coaching: true },
    { name: "Current Affairs (GS-mapped)", learnpro: true, chatgpt: false, coaching: "limited" },
    { name: "Practice MCQs & PYQs", learnpro: true, chatgpt: false, coaching: true },
    { name: "State PSC Support (15 states)", learnpro: true, chatgpt: false, coaching: false },
    { name: "24/7 Availability", learnpro: true, chatgpt: true, coaching: false },
    { name: "Pricing", learnpro: "Free", chatgpt: "Paid", coaching: "Expensive" },
  ];

  const renderCell = (value: boolean | string) => {
    if (value === true) return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />;
    if (value === false) return <X className="h-5 w-5 text-destructive/60 mx-auto" />;
    if (value === "limited") return <span className="text-xs font-medium text-muted-foreground uppercase">Limited</span>;
    return <span className="text-xs font-semibold text-foreground">{value}</span>;
  };

  return (
    <div className="overflow-x-auto" data-testid="comparison-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-3 sm:px-4 font-semibold text-muted-foreground"></th>
            <th className="py-3 px-3 sm:px-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="font-bold text-primary text-sm sm:text-base">Learnpro AI</span>
              </div>
            </th>
            <th className="py-3 px-3 sm:px-4 text-center">
              <span className="font-semibold text-muted-foreground text-sm sm:text-base">ChatGPT</span>
            </th>
            <th className="py-3 px-3 sm:px-4 text-center">
              <span className="font-semibold text-muted-foreground text-sm sm:text-base">Coaching</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-3 px-3 sm:px-4 font-medium text-foreground text-xs sm:text-sm">{feature.name}</td>
              <td className="py-3 px-3 sm:px-4 text-center bg-primary/5 dark:bg-primary/10">{renderCell(feature.learnpro)}</td>
              <td className="py-3 px-3 sm:px-4 text-center">{renderCell(feature.chatgpt)}</td>
              <td className="py-3 px-3 sm:px-4 text-center">{renderCell(feature.coaching)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
            <a href="#comparison">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground" data-testid="link-pricing">
                Compare
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

        <section className="py-10 sm:py-14 border-y border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              {[
                { value: 10000, label: "Aspirants Trust Us", icon: Users, suffix: "+" },
                { value: 50000, label: "Questions Practiced", icon: Target, suffix: "+" },
                { value: 15000, label: "Answers Evaluated", icon: FileText, suffix: "+" },
                { value: 16, label: "Exams Covered", icon: BarChart3, suffix: "" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center"
                  data-testid={`stat-${i}`}
                >
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary mb-2" />
                  <span className="text-2xl sm:text-4xl font-display font-bold text-foreground">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</span>
                </motion.div>
              ))}
            </div>
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

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex-1 w-full min-w-0"
              >
                <Accordion type="single" collapsible defaultValue="ai-chat" className="w-full">
                  {featureItems.map((feature) => (
                    <AccordionItem key={feature.id} value={feature.id} className="border-border/60" data-testid={`accordion-${feature.id}`}>
                      <AccordionTrigger className="hover:no-underline gap-3 py-3 sm:py-4" data-testid={`trigger-${feature.id}`}>
                        <div className="flex items-center flex-wrap gap-3">
                          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <feature.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-primary" />
                          </div>
                          <span className="text-sm sm:text-base font-semibold text-left">{feature.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-11 sm:pl-12">
                        <p className="text-muted-foreground text-xs sm:text-sm mb-3 leading-relaxed">{feature.description}</p>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={openLogin}
                          data-testid={`button-feature-${feature.id}`}
                        >
                          {feature.cta}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="hidden lg:flex flex-shrink-0 items-center justify-center pt-4"
              >
                <StudyStreakCard />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex lg:hidden justify-center mt-8"
            >
              <StudyStreakCard />
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

        <section id="comparison" className="py-14 sm:py-20 bg-secondary/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-comparison-heading">
                See how Learnpro compares
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base">
                Built specifically for UPSC, not adapted from a general chatbot
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden">
                <ComparisonTable />
              </Card>
            </motion.div>
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
      </main>

      <footer className="bg-foreground py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 flex-wrap">
            <Logo size="sm" variant="light" />
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-primary-foreground/60">
              <a href="#features" data-testid="footer-link-features">Features</a>
              <a href="#comparison" data-testid="footer-link-compare">Compare</a>
            </div>
            <div className="text-sm text-primary-foreground/60">
              &copy; 2025 Learnpro AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
