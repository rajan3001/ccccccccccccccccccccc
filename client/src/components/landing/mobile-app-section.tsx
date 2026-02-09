import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Newspaper,
  Target,
  PenTool,
  Calendar,
  Brain,
  BookOpen,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "AI Chat Assistant",
    subtitle: "Ask anything about UPSC & PSC",
    icon: Brain,
    color: "from-blue-500/20 to-indigo-500/20",
    accent: "text-blue-400",
    items: [
      { icon: MessageSquare, label: "Instant AI Responses" },
      { icon: BookOpen, label: "Topic Deep Dives" },
      { icon: CheckCircle2, label: "File Attachments" },
    ],
  },
  {
    title: "Daily Current Affairs",
    subtitle: "Stay updated every day",
    icon: Newspaper,
    color: "from-emerald-500/20 to-teal-500/20",
    accent: "text-emerald-400",
    items: [
      { icon: Newspaper, label: "GS Paper Categories" },
      { icon: BookOpen, label: "Detailed Analysis" },
      { icon: CheckCircle2, label: "Revision Tracking" },
    ],
  },
  {
    title: "Practice Quizzes",
    subtitle: "Test your knowledge daily",
    icon: Target,
    color: "from-amber-500/20 to-orange-500/20",
    accent: "text-amber-400",
    items: [
      { icon: Target, label: "Exam-Specific MCQs" },
      { icon: BarChart3, label: "Score Analytics" },
      { icon: CheckCircle2, label: "16 Exam Types" },
    ],
  },
  {
    title: "Answer Evaluation",
    subtitle: "AI-powered feedback",
    icon: PenTool,
    color: "from-rose-500/20 to-pink-500/20",
    accent: "text-rose-400",
    items: [
      { icon: PenTool, label: "Upload Answer Sheets" },
      { icon: BarChart3, label: "7-Parameter Scoring" },
      { icon: CheckCircle2, label: "Detailed Feedback" },
    ],
  },
  {
    title: "Study Planner",
    subtitle: "Plan your journey",
    icon: Calendar,
    color: "from-violet-500/20 to-purple-500/20",
    accent: "text-violet-400",
    items: [
      { icon: Calendar, label: "Weekly Timetables" },
      { icon: Target, label: "Syllabus Tracker" },
      { icon: BarChart3, label: "Goal Analytics" },
    ],
  },
];

function PhoneScreen({ feature, direction }: { feature: typeof features[0]; direction: number }) {
  const FeatureIcon = feature.icon;

  return (
    <motion.div
      key={feature.title}
      initial={{ x: direction > 0 ? 200 : -200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction > 0 ? -200 : 200, opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="absolute inset-0 flex flex-col p-4"
    >
      <div className={`rounded-xl bg-gradient-to-br ${feature.color} p-4 mb-3`}>
        <div className="flex items-center flex-wrap gap-3 mb-3">
          <div className={`h-10 w-10 rounded-lg bg-black/20 flex items-center justify-center ${feature.accent}`}>
            <FeatureIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{feature.title}</p>
            <p className="text-white/60 text-xs">{feature.subtitle}</p>
          </div>
        </div>

        <div className="space-y-2">
          {feature.items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
              className="flex items-center flex-wrap gap-2 bg-white/10 rounded-lg px-3 py-2"
            >
              <item.icon className="h-3.5 w-3.5 text-white/70 shrink-0" />
              <span className="text-white/80 text-xs">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="h-2 rounded-full bg-white/10"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-8 w-8 rounded-lg ${i === 1 ? "bg-white/20" : "bg-white/5"} flex items-center justify-center`}
          >
            <div className={`h-3.5 w-3.5 rounded-sm ${i === 1 ? "bg-white/40" : "bg-white/15"}`} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PhoneMockup() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % features.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative" data-testid="phone-mockup">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative mx-auto"
        style={{ width: 260, height: 520 }}
      >
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 -z-10" />

        <div className="relative w-full h-full rounded-[2.5rem] border-[3px] border-white/20 bg-gradient-to-b from-gray-900 to-gray-950 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-700" />
          </div>

          <div className="absolute top-7 left-0 right-0 bottom-1 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <PhoneScreen feature={features[current]} direction={direction} />
            </AnimatePresence>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 z-20">
            {features.map((_, i) => (
              <div
                key={i}
                role="presentation"
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-5 bg-white/80" : "w-1.5 bg-white/30"
                }`}
                data-testid={`phone-dot-${i}`}
              />
            ))}
          </div>
        </div>

        <motion.div
          className="absolute -top-3 -right-3 h-6 w-6 rounded-full border border-primary/30 bg-primary/10"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-2 -left-4 h-4 w-4 rounded-full border border-primary/20 bg-primary/10"
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />
      </motion.div>
    </div>
  );
}

export function MobileAppSection({ embedded = false }: { embedded?: boolean }) {
  const content = (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4 no-default-hover-elevate no-default-active-elevate" data-testid="badge-coming-soon">
              <Smartphone className="h-3 w-3 mr-1.5" />
              Coming Soon
            </Badge>

            <h2 className="text-2xl sm:text-4xl font-display font-bold mb-4" data-testid="text-mobile-heading">
              Your preparation,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                in your pocket
              </span>
            </h2>

            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-md leading-relaxed">
              Take your UPSC &amp; State PSC preparation everywhere. Access AI Chat, Current Affairs, Practice Quizzes, and your Study Planner on the go.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
              <div
                className="inline-flex items-center flex-wrap gap-3 bg-foreground text-primary-foreground rounded-xl px-5 py-3 opacity-70 cursor-default select-none"
                data-testid="button-app-store"
              >
                <SiApple className="h-7 w-7 shrink-0" />
                <div>
                  <p className="text-[10px] leading-none text-primary-foreground/60">Download on the</p>
                  <p className="text-sm font-semibold leading-tight">App Store</p>
                </div>
              </div>

              <div
                className="inline-flex items-center flex-wrap gap-3 bg-foreground text-primary-foreground rounded-xl px-5 py-3 opacity-70 cursor-default select-none"
                data-testid="button-google-play"
              >
                <SiGoogleplay className="h-6 w-6 shrink-0" />
                <div>
                  <p className="text-[10px] leading-none text-primary-foreground/60">Get it on</p>
                  <p className="text-sm font-semibold leading-tight">Google Play</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {[
                { label: "All Features", icon: CheckCircle2 },
                { label: "Offline Notes", icon: BookOpen },
                { label: "Push Notifications", icon: Target },
              ].map((item) => (
                <div key={item.label} className="flex items-center flex-wrap gap-1.5">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="pb-16 sm:pb-24 pt-6 sm:pt-10 relative" data-testid="mobile-app-section">
        {content}
      </div>
    );
  }

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden" data-testid="mobile-app-section">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <motion.div
        className="absolute top-20 left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl"
        animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl"
        animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
      />
      {content}
    </section>
  );
}
