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
} from "lucide-react";
import { motion } from "framer-motion";

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
    title: "AI-Powered Doubt Resolution",
    description: "24/7 AI mentor trained on UPSC & State PSC syllabus. Get instant, structured answers with PYQ references and concept clarity.",
    cta: "Start Learning",
  },
  {
    id: "syllabus",
    icon: BookOpen,
    title: "Complete GS Syllabus",
    description: "Based on NCERTs + standard books. GS Paper I-IV, CSAT, and Optional Subjects with structured learning paths.",
    cta: "Explore Syllabus",
  },
  {
    id: "answer-writing",
    icon: PenTool,
    title: "Mains Answer Writing",
    description: "For GS, Ethics, and Essay. Get structured feedback on Introduction, Body, and Conclusion with model answers.",
    cta: "Practice Writing",
  },
  {
    id: "current-affairs",
    icon: Newspaper,
    title: "Daily Current Affairs",
    description: "Cover news from The Hindu & Indian Express. AI-generated digests mapped to GS papers with state-specific filtering for 15 State PSCs.",
    cta: "Read News Analysis",
  },
  {
    id: "practice-mcqs",
    icon: Target,
    title: "Practice MCQs",
    description: "Subject and topic-wise MCQs for UPSC + 15 State PSCs. AI-generated questions with detailed explanations and performance analytics.",
    cta: "Practice Now",
  },
];

const testimonials = [
  {
    name: "Aarav Sharma",
    text: "The AI doubt resolution is incredible. I get answers with proper UPSC framing within seconds. It's like having a personal mentor available 24/7.",
    rating: 5,
  },
  {
    name: "Priya Verma",
    text: "Daily current affairs mapped to GS papers saves me hours of manual sorting. The state-specific filtering for JPSC is exactly what I needed.",
    rating: 5,
  },
  {
    name: "Rohit Kumar",
    text: "Practice MCQs with detailed explanations helped me improve my prelims accuracy significantly. The analytics show exactly where I need to focus.",
    rating: 5,
  },
  {
    name: "Sneha Patel",
    text: "Best platform for UPSC preparation. The mains answer writing feedback is structured and actually useful unlike generic AI tools.",
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

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-[999] bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
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
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login-nav"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-6 sm:mb-8 border border-primary/20" data-testid="badge-hero">
                  Loved by 10,000+ aspirants
                </span>
                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-5 sm:mb-8 leading-[1.1]" data-testid="text-hero-heading">
                  Everything you need for{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">
                    UPSC Preparation
                  </span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                  Your Personal AI Mentor that teaches, instantly evaluates answers & builds daily discipline for UPSC and State PSC exams.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => window.location.href = "/api/login"}
                    className="w-full sm:w-auto rounded-full shadow-xl shadow-primary/30"
                    data-testid="button-get-started"
                  >
                    Start Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto rounded-full"
                    data-testid="button-view-demo"
                  >
                    View Demo
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Counter */}
        <section className="py-10 sm:py-14 border-y border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              {[
                { value: 10000, label: "Aspirants", icon: Users, suffix: "+" },
                { value: 50000, label: "MCQs Practiced", icon: Target, suffix: "+" },
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

        {/* Features Accordion + Visual */}
        <section id="features" className="py-14 sm:py-20 bg-secondary/30">
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

        {/* Comparison Table */}
        <section id="comparison" className="py-14 sm:py-20 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-comparison-heading">
                Learnpro builds accountability
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base">
                unlike ChatGPT or Coaching Institutes
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

        {/* Impact Stats */}
        <section className="py-14 sm:py-20 bg-secondary/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-impact-heading">
                Your best UPSC attempt starts here
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  icon: Zap,
                  stat: "3x",
                  label: "More Practice Questions",
                  desc: "Aspirants using Learnpro practice 3x more MCQs than traditional methods",
                },
                {
                  icon: Clock,
                  stat: "60s",
                  label: "Instant AI Responses",
                  desc: "Get structured, syllabus-aligned answers in under a minute",
                },
                {
                  icon: Shield,
                  stat: "16",
                  label: "Exams Supported",
                  desc: "UPSC + 15 State PSCs with exam-specific question patterns",
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

        {/* Testimonials */}
        <section className="py-14 sm:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-testimonials-heading">
                What aspirants say
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base">
                Join thousands preparing smarter with Learnpro AI
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
                  <Card className="p-5 sm:p-6 h-full" data-testid={`testimonial-card-${i}`}>
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: testimonial.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      "{testimonial.text}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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

        {/* Final CTA */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto mb-4 sm:mb-6" />
              <h2 className="text-2xl sm:text-4xl font-display font-bold mb-3 sm:mb-4" data-testid="text-cta-heading">
                Your best UPSC attempt starts here!
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mb-8 sm:mb-10 max-w-xl mx-auto">
                Join thousands of aspirants who are preparing smarter with AI-powered learning, daily discipline, and exam-specific practice.
              </p>
              <Button
                size="lg"
                onClick={() => window.location.href = "/api/login"}
                className="rounded-full shadow-xl shadow-primary/30"
                data-testid="button-bottom-cta"
              >
                Start Preparing Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Logo size="sm" className="grayscale brightness-200" />
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
