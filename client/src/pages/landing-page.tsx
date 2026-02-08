import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Target,
  Flame,
  PenTool,
  Newspaper,
  MessageSquare,
  GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";

const featureItems = [
  {
    id: "ai-chat",
    icon: MessageSquare,
    title: "AI-Powered Doubt Resolution",
    description: "24/7 AI mentor trained on UPSC & State PSC syllabus. Get instant, structured answers with PYQ references.",
    cta: "Start Learning",
  },
  {
    id: "syllabus",
    icon: BookOpen,
    title: "Complete GS Syllabus",
    description: "GS Paper I-IV, CSAT, Optional Subjects covered with NCERTs and standard reference material.",
    cta: "Explore Syllabus",
  },
  {
    id: "answer-writing",
    icon: PenTool,
    title: "Mains Answer Writing",
    description: "Learn the perfect answer format with structured responses, relevant examples, and scoring techniques.",
    cta: "Practice Writing",
  },
  {
    id: "current-affairs",
    icon: Newspaper,
    title: "Daily Current Affairs",
    description: "AI-generated daily digests from The Hindu & Indian Express, mapped to GS papers with state-specific filtering.",
    cta: "Read Today's News",
  },
  {
    id: "practice-mcqs",
    icon: Target,
    title: "Practice MCQs",
    description: "Topic-wise MCQs for UPSC + 15 State PSCs. AI-generated questions with explanations and performance analytics.",
    cta: "Practice Now",
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
    <div className="relative">
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

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <a href="#features">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground" data-testid="link-features">
                Features
              </Button>
            </a>
            <a href="#why-learnpro">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground" data-testid="link-why">
                Why Learnpro
              </Button>
            </a>
            <Button
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login-nav"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section className="relative overflow-hidden py-12 sm:py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-4 sm:mb-6 border border-primary/20" data-testid="badge-hero">
                  New: UPSC Prelims 2025 Ready
                </span>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-display font-bold text-foreground mb-4 sm:mb-6 leading-tight" data-testid="text-hero-heading">
                  Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">Competitive Exams</span> with AI
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-10 leading-relaxed max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                  Your intelligent companion for UPSC and State PSC preparation. Get instant, accurate, and syllabus-aligned answers powered by advanced AI.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => window.location.href = "/api/login"}
                    className="w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-xl shadow-primary/30 transition-all hover:-translate-y-1"
                    data-testid="button-get-started"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-2"
                    data-testid="button-view-demo"
                  >
                    View Demo
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="py-12 sm:py-20 bg-secondary/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <span className="text-xs sm:text-sm font-semibold text-primary tracking-wide uppercase" data-testid="text-features-subtitle">
                Cover 100% Prelims & Mains Syllabus
              </span>
              <h2 className="text-2xl sm:text-4xl font-display font-bold mt-2 sm:mt-3" data-testid="text-features-heading">
                Add magic in your preparation
              </h2>
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
                      <AccordionTrigger className="hover:no-underline gap-3 py-3 sm:py-4">
                        <div className="flex items-center gap-3">
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
                          onClick={() => window.location.href = "/api/login"}
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

        <section id="why-learnpro" className="py-12 sm:py-20 bg-background border-t border-border">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-8 sm:mb-12" data-testid="text-why-heading">Why Aspirants Choose Learnpro</h2>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 text-left">
                {[
                  { icon: Brain, text: "AI-powered learning tailored to UPSC patterns" },
                  { icon: PenTool, text: "Mains answer writing with instant feedback" },
                  { icon: Newspaper, text: "Daily current affairs mapped to GS papers" },
                  { icon: Target, text: "Practice MCQs for 16 exams with analytics" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-md"
                    data-testid={`card-why-${i}`}
                  >
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-sm sm:text-base">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 sm:mt-14">
                <Button
                  size="lg"
                  onClick={() => window.location.href = "/api/login"}
                  className="text-lg h-14 px-10 rounded-full shadow-xl shadow-primary/30 transition-all hover:-translate-y-1"
                  data-testid="button-bottom-cta"
                >
                  Start Preparing Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" className="grayscale brightness-200" />
          </div>
          <div className="text-sm text-gray-400">
            &copy; 2025 Learnpro AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
