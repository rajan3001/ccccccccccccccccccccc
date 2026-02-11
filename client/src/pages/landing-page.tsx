import { useEffect, useRef, useState, useCallback } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/i18n/context";
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
  Languages,
} from "lucide-react";
import { motion } from "framer-motion";
import { HeroDashboardAnimation, NeuralNetworkAnimation } from "@/components/landing/hero-animation";
import { LoginSlideOver } from "@/components/login-slide-over";
import { LandingFooter } from "@/components/landing/footer";
import { IndiaTestimonialsSection } from "@/components/landing/india-testimonials";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { MobileAppSection } from "@/components/landing/mobile-app-section";
import { HowItWorksTour } from "@/components/landing/how-it-works-tour";

function LazyLottie({ src, ...props }: { src: string; loop?: boolean; autoplay?: boolean; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [Component, setComponent] = useState<any>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          import("@lottiefiles/dotlottie-react").then(m => {
            setComponent(() => m.DotLottieReact);
          });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  if (!Component) return <div ref={ref} style={props.style} />;
  return <Component src={src} {...props} />;
}

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

function getFeatureItems(t: any) {
  return [
    {
      id: "ai-chat",
      icon: MessageSquare,
      title: t.landing.featureAiChatTitle,
      description: t.landing.featureAiChatDesc,
      cta: t.landing.featureAiChatCta,
    },
    {
      id: "syllabus",
      icon: BookOpen,
      title: t.landing.featureSyllabusTitle,
      description: t.landing.featureSyllabusDesc,
      cta: t.landing.featureSyllabusCta,
    },
    {
      id: "answer-writing",
      icon: PenTool,
      title: t.landing.featureAnswerTitle,
      description: t.landing.featureAnswerDesc,
      cta: t.landing.featureAnswerCta,
    },
    {
      id: "current-affairs",
      icon: Newspaper,
      title: t.landing.featureCATitle,
      description: t.landing.featureCADesc,
      cta: t.landing.featureCACta,
    },
    {
      id: "practice-mcqs",
      icon: Target,
      title: t.landing.featureMCQTitle,
      description: t.landing.featureMCQDesc,
      cta: t.landing.featureMCQCta,
    },
  ];
}

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

function AutoCyclingFeatures({ openLogin, t }: { openLogin: () => void; t: any }) {
  const featureItems = getFeatureItems(t);
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
      className="flex flex-col gap-6 lg:gap-10"
      data-testid="feature-tabs-container"
    >
      <div className="flex overflow-x-auto scrollbar-hide gap-2 lg:hidden pb-1 -mx-1 px-1">
        {featureItems.map((feature, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={feature.id}
              onClick={() => selectFeature(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-all flex-shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground"
              }`}
              data-testid={`feature-tab-${feature.id}`}
            >
              <feature.icon className="h-3.5 w-3.5" />
              {feature.title}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        <div className="hidden lg:block flex-1 min-w-0">
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
                  data-testid={`feature-tab-desktop-${feature.id}`}
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
              style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: 'white' }}
              onClick={openLogin}
              data-testid={`button-feature-${active.id}`}
            >
              {active.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
          <div className="rounded-2xl border bg-card shadow-sm h-[280px] sm:h-[320px] overflow-hidden relative">
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
          <div className="lg:hidden mt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {active.description}
            </p>
            <Button
              size="sm"
              className="mt-2 gap-1.5"
              style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: 'white' }}
              onClick={openLogin}
              data-testid={`button-feature-mobile-${active.id}`}
            >
              {active.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



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

function LanguageShowcaseSection({ t }: { t: any }) {
  const { language, setLanguage } = useLanguage();
  const allLangs = SUPPORTED_LANGUAGES;
  const currentLabel = allLangs.find(l => l.code === language)?.nativeLabel || "English";

  return (
    <section className="py-14 sm:py-20 bg-background" data-testid="section-languages">
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
            <Languages className="h-3 w-3" />
            {t.landing.notGoogleTranslate}
          </motion.div>

          <h2 className="text-2xl sm:text-4xl font-display font-bold mb-3" data-testid="text-language-heading">
            {t.landing.studyInYour}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">
              {t.landing.motherTongue}
            </span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            {t.landing.motherTongueDesc}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 sm:gap-2.5"
        >
          {allLangs.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-card border-border/50 text-foreground/70 hover-elevate"
                }`}
                data-testid={`button-lang-${lang.code}`}
              >
                {lang.nativeLabel}
              </button>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-5"
        >
          {t.landing.currentlyViewingIn} <span className="font-bold text-primary">{currentLabel}</span>
        </motion.p>
      </div>
    </section>
  );
}

function PrepareForExamsSection({ t }: { t: any }) {
  return (
    <div className="space-y-8" data-testid="exams-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 justify-center"
      >
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm" data-testid="exam-upsc">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-white">UPSC CSE</h3>
            <p className="text-xs text-blue-200/70">{t.landing.upscSubtitle}</p>
          </div>
        </div>
        <div className="hidden sm:block h-8 w-px bg-white/20" />
        <div className="text-center sm:text-left">
          <p className="text-2xl sm:text-3xl font-display font-bold text-white">
            + 15 <span className="text-blue-200/80 text-base font-normal">{t.landing.statePSCs}</span>
          </p>
        </div>
      </motion.div>

      <div className="relative overflow-hidden" data-testid="exams-marquee">
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #1d4ed8, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #3730a3, transparent)' }} />
        <div className="flex animate-marquee gap-3">
          {[...STATE_PSC_EXAMS, ...STATE_PSC_EXAMS].map((exam, i) => {
            const Icon = exam.icon;
            return (
              <div
                key={`${exam.id}-${i}`}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 whitespace-nowrap flex-shrink-0 backdrop-blur-sm"
                data-testid={`exam-icon-${exam.id}`}
              >
                <Icon className="h-4 w-4 text-blue-200/80" />
                <span className="text-sm font-medium text-white">{exam.label}</span>
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
  const { t } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

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
      <HowItWorksTour open={tourOpen} onOpenChange={setTourOpen} />

      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-[999] bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Logo size="md" />
          <div className="flex items-center flex-wrap gap-4">
            <a href="#features">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground" data-testid="link-features">
                {t.landing.features}
              </Button>
            </a>
            <a href="#exams">
              <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground" data-testid="link-exams">
                {t.landing.navExams}
              </Button>
            </a>
            <Button
              onClick={openLogin}
              data-testid="button-login-nav"
            >
              {t.landing.login}
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

          <style>{`
            @keyframes hero-float { 0%,100% { transform: translateY(0); opacity: 0.15; } 50% { transform: translateY(-20px); opacity: 0.4; } }
            @keyframes hero-pulse { 0%,100% { transform: scale(1); opacity: 0.08; } 50% { transform: scale(1.3); opacity: 0.18; } }
          `}</style>
          <div className="absolute top-[15%] left-[8%] w-2 h-2 rounded-full bg-primary/15" style={{ animation: "hero-float 4s ease-in-out infinite" }} />
          <div className="absolute top-[25%] right-[12%] w-3 h-3 rounded-full bg-primary/10" style={{ animation: "hero-float 5s ease-in-out 1s infinite" }} />
          <div className="absolute bottom-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-primary/20" style={{ animation: "hero-float 3.5s ease-in-out 0.5s infinite" }} />
          <div className="absolute top-[60%] right-[5%] w-2.5 h-2.5 rounded-full bg-primary/10" style={{ animation: "hero-float 4.5s ease-in-out 2s infinite" }} />
          <div className="absolute bottom-[30%] right-[25%] w-8 h-8 rounded-full border border-primary/8" style={{ animation: "hero-pulse 5s ease-in-out 0.8s infinite" }} />
          <div className="absolute top-[70%] left-[25%] w-5 h-5 rounded-full border border-primary/6" style={{ animation: "hero-pulse 4s ease-in-out 2.5s infinite" }} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              <div className="flex-1 text-center lg:text-left max-w-2xl">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-primary/80 font-medium tracking-wide mb-5 sm:mb-6" data-testid="badge-hero">
                    <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="#f59e0b" style={{ animation: "sparkle-spin 2.5s ease-in-out infinite" }}>
                      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
                    </svg>
                    {t.landing.trustedByAspirants}
                    <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="#f59e0b" style={{ animation: "sparkle-spin 3s 0.5s ease-in-out infinite" }}>
                      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
                    </svg>
                    <style>{`
                      @keyframes sparkle-spin {
                        0% { transform: scale(0.6) rotate(0deg); opacity: 0.4; }
                        50% { transform: scale(1.1) rotate(180deg); opacity: 1; }
                        100% { transform: scale(0.6) rotate(360deg); opacity: 0.4; }
                      }
                    `}</style>
                  </span>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-4 sm:mb-5 leading-[1.15]" data-testid="text-hero-heading">
                    {t.landing.heroHeadingPart1}{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">
                      {t.landing.heroHeadingHighlight}
                    </span>{" "}
                    {t.landing.heroHeadingPart2}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0" data-testid="text-hero-subtitle">
                    {t.landing.heroDescription}
                  </p>

                  <div className="flex flex-row items-center justify-center lg:justify-start flex-wrap gap-3 sm:gap-4">
                    <Button
                      size="lg"
                      onClick={openLogin}
                      className="rounded-full shadow-xl shadow-blue-500/30"
                      style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: 'white' }}
                      data-testid="button-get-started"
                    >
                      {t.landing.beginJourney}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setTourOpen(true)}
                      data-testid="button-view-demo"
                    >
                      {t.landing.seeHow}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center lg:justify-start flex-wrap gap-6 mt-8 sm:mt-10">
                    {[
                      { icon: Brain, label: t.landing.aiPowered },
                      { icon: Shield, label: t.landing.alwaysFree },
                      { icon: Sparkles, label: t.landing.personalized },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 text-primary" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="flex-shrink-0 w-full max-w-[280px] sm:max-w-md lg:max-w-lg xl:max-w-xl mx-auto lg:mx-0"
              >
                <HeroDashboardAnimation />
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 relative overflow-hidden bg-secondary/30">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(35_90%_45%/0.08),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_80%_100%,hsl(35_90%_45%/0.05),transparent)]" />
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary/15"
                style={{
                  left: `${8 + (i * 7.5) % 84}%`,
                  top: `${15 + (i * 6.2) % 70}%`,
                }}
                animate={{
                  opacity: [0, 0.4, 0],
                  scale: [0.5, 1, 0.5],
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-6 sm:mb-8"
            >
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">{t.landing.trustedNationwide}</span>
              <div className="mt-1.5 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </motion.div>

            <div className="flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 flex-shrink-0"
                data-testid="trophy-animation"
              >
                <LazyLottie
                  src="https://assets-v2.lottiefiles.com/a/58030746-1151-11ee-86f5-f7bad2893c55/MIaDhJ2ars.lottie"
                  loop
                  autoplay
                  style={{ width: "100%", height: "100%" }}
                />
                <style>{`
                  @keyframes sparkle-spin {
                    0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1) rotate(180deg); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0) rotate(360deg); opacity: 0; }
                  }
                `}</style>
                {[
                  { top: "2%", left: "10%", color: "#f59e0b", size: 12, delay: "0s", dur: "2.5s" },
                  { top: "5%", left: "85%", color: "#3b82f6", size: 10, delay: "0.6s", dur: "3s" },
                  { top: "30%", left: "0%", color: "#ef4444", size: 8, delay: "1.2s", dur: "2.8s" },
                  { top: "25%", left: "95%", color: "#22c55e", size: 10, delay: "0.3s", dur: "3.2s" },
                  { top: "55%", left: "0%", color: "#a855f7", size: 7, delay: "1.8s", dur: "2.3s" },
                  { top: "60%", left: "98%", color: "#fbbf24", size: 9, delay: "0.9s", dur: "2.7s" },
                  { top: "0%", left: "50%", color: "#f59e0b", size: 14, delay: "1.5s", dur: "3.5s" },
                  { top: "45%", left: "3%", color: "#3b82f6", size: 6, delay: "2s", dur: "2.6s" },
                  { top: "40%", left: "97%", color: "#ef4444", size: 8, delay: "0.4s", dur: "3s" },
                  { top: "70%", left: "15%", color: "#22c55e", size: 7, delay: "1s", dur: "2.4s" },
                  { top: "75%", left: "85%", color: "#a855f7", size: 9, delay: "1.7s", dur: "3.3s" },
                ].map((s, si) => (
                  <svg
                    key={si}
                    className="absolute pointer-events-none"
                    style={{
                      top: s.top,
                      left: s.left,
                      width: s.size * 2,
                      height: s.size * 2,
                      animation: `sparkle-spin ${s.dur} ${s.delay} ease-in-out infinite`,
                    }}
                    viewBox="0 0 24 24"
                    fill={s.color}
                  >
                    <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
                  </svg>
                ))}
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { value: 10000, label: t.landing.aspirantsTrust, icon: Users, suffix: "+", color: "hsl(200, 75%, 50%)", bgFrom: "rgba(59,130,246,0.12)", bgTo: "rgba(59,130,246,0.02)", border: "rgba(59,130,246,0.2)" },
                    { value: 50000, label: t.landing.questionsPracticed, icon: Target, suffix: "+", color: "hsl(150, 65%, 42%)", bgFrom: "rgba(34,197,94,0.12)", bgTo: "rgba(34,197,94,0.02)", border: "rgba(34,197,94,0.2)" },
                    { value: 15000, label: t.landing.answersEvaluated, icon: FileText, suffix: "+", color: "hsl(280, 65%, 55%)", bgFrom: "rgba(168,85,247,0.12)", bgTo: "rgba(168,85,247,0.02)", border: "rgba(168,85,247,0.2)" },
                    { value: 60, label: t.landing.examsCovered, icon: BarChart3, suffix: "+", color: "hsl(35, 90%, 50%)", bgFrom: "rgba(245,158,11,0.12)", bgTo: "rgba(245,158,11,0.02)", border: "rgba(245,158,11,0.2)" },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                      data-testid={`stat-${i}`}
                    >
                      <div className="relative rounded-xl bg-card py-4 sm:py-5 px-3 flex flex-col items-center overflow-hidden border" style={{ borderColor: stat.border }}>
                        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${stat.bgFrom}, ${stat.bgTo})` }} />

                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200" fill="none">
                          <path d="M10 50 Q40 30, 70 55" stroke={stat.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2">
                            <animate attributeName="d" values="M10 50 Q40 30, 70 55;M10 45 Q45 25, 70 50;M10 50 Q40 30, 70 55" dur={`${4 + i * 0.5}s`} repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                          </path>
                          <path d="M130 160 Q160 140, 190 165" stroke={stat.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2">
                            <animate attributeName="d" values="M130 160 Q160 140, 190 165;M130 155 Q165 135, 190 160;M130 160 Q160 140, 190 165" dur={`${5 + i * 0.4}s`} repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${4 + i * 0.5}s`} repeatCount="indefinite" />
                          </path>
                        </svg>

                        <div className="relative mb-2">
                          <div className="relative h-9 w-9 rounded-full flex items-center justify-center border" style={{ background: `linear-gradient(135deg, ${stat.bgFrom}, ${stat.bgTo})`, borderColor: stat.border }}>
                            <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                          </div>
                        </div>

                        <span className="relative text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
                          <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                        </span>
                        <span className="relative text-[9px] sm:text-[10px] text-muted-foreground mt-1 font-medium tracking-[0.1em] uppercase text-center leading-tight">{stat.label}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex justify-center"
                >
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50">
                    <div className="w-[100px] sm:w-[120px] overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                      <div className="flex gap-1.5 animate-aspirant-scroll w-max">
                        {[...Array(2)].map((_, setIdx) => (
                          [
                            "/images/face-1_1.webp",
                            "/images/face-5_1.webp",
                            "/images/face-1_2.webp",
                            "/images/face-5_2.webp",
                            "/images/face-1_3.webp",
                            "/images/face-5_3.webp",
                            "/images/face-1_4.webp",
                            "/images/face-5_4.webp",
                          ].map((src, j) => (
                            <img
                              key={`${setIdx}-${j}`}
                              src={src}
                              alt=""
                              loading="lazy"
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded-full object-cover border-[1.5px] border-primary/30 flex-shrink-0 brightness-105"
                            />
                          ))
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t.landing.joinThousands}</span>
                  </div>
                </motion.div>
              </div>
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
                {t.landing.builtForAspirants}
              </span>
              <h2 className="text-2xl sm:text-4xl font-display font-bold mt-2 sm:mt-3" data-testid="text-features-heading">
                {t.landing.everythingYouNeed}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
                {t.landing.noMoreJuggling}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <AutoCyclingFeatures openLogin={openLogin} t={t} />
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
                  {t.landing.whyLearnpro}
                </span>
                <h2 className="text-2xl sm:text-4xl font-display font-bold mt-2 sm:mt-3 mb-4 sm:mb-6" data-testid="text-why-heading">
                  {t.landing.whyHeading}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0">
                  {t.landing.whyDescription}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Brain, title: t.landing.thinksLikeMentor, desc: t.landing.thinksLikeMentorDesc },
                    { icon: Heart, title: t.landing.patientSupportive, desc: t.landing.patientSupportiveDesc },
                    { icon: Sparkles, title: t.landing.learnsAboutYou, desc: t.landing.learnsAboutYouDesc },
                    { icon: Shield, title: t.landing.alwaysAvailable, desc: t.landing.alwaysAvailableDesc },
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

        <section id="exams" className="py-14 sm:py-20 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl p-8 sm:p-12 overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8, #3730a3)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", animation: "grid-drift 8s linear infinite" }} />
              </div>
              <div className="absolute top-0 left-0 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(96, 165, 250, 0.2)' }} />
              <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(129, 140, 248, 0.15)' }} />
              <style>{`
                @keyframes grid-drift {
                  0% { transform: translate(0, 0); }
                  100% { transform: translate(40px, 40px); }
                }
              `}</style>

              <div className="relative z-10">
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
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold mb-4 border border-white/20 backdrop-blur-sm"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t.landing.examsSupported}
                  </motion.div>
                  <h2 className="text-2xl sm:text-4xl font-display font-bold text-white" data-testid="text-exams-heading">
                    {t.landing.prepareForExams}
                  </h2>
                  <p className="text-blue-100/80 mt-2 sm:mt-3 text-sm sm:text-base max-w-lg mx-auto">
                    {t.landing.prepareForExamsDesc}
                  </p>
                </motion.div>

                <PrepareForExamsSection t={t} />
              </div>
            </div>
          </div>
        </section>

        <LanguageShowcaseSection t={t} />

        <IndiaTestimonialsSection />

        <section id="faq" className="py-14 sm:py-20 bg-secondary/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-10"
            >
              <h2 className="text-2xl sm:text-4xl font-display font-bold" data-testid="text-faq-heading">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base">
                Everything you need to know about UPSC & State PSC preparation with Learnpro AI
              </p>
            </motion.div>

            <Accordion type="single" collapsible className="space-y-2" data-testid="faq-accordion">
              <AccordionItem value="what-is" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-what-is">
                  What is Learnpro AI and how does it help in UPSC preparation?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-what-is">
                  Learnpro AI is India's leading AI-powered online coaching platform built specifically for UPSC Civil Services Examination (IAS/IPS/IFS) and State PSC preparation. It combines an intelligent AI mentor powered by advanced AI with daily current affairs digests, topic-wise MCQ practice, AI answer sheet evaluation, a smart study planner with syllabus tracking, and spaced repetition notes — providing a complete ecosystem for competitive exam preparation, accessible 24/7 from any device.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="free" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-free">
                  Is Learnpro AI free for UPSC and State PSC coaching?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-free">
                  Yes! Learnpro AI offers a generous free Starter plan that includes AI chat mentoring for UPSC doubts, daily current affairs, practice quizzes, and study planning features. For aspirants seeking unlimited access, the Pro plan starts at just ₹299/month — a fraction of traditional IAS coaching fees that can cost ₹1-3 lakhs. Premium plans unlock unlimited AI interactions, advanced performance analytics, and priority features.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="exams" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-exams">
                  Which civil services exams does Learnpro AI cover?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-exams">
                  Learnpro AI covers UPSC CSE (IAS, IPS, IFS — Prelims, Mains & Interview) and 15 State Public Service Commission exams: UPPSC (Uttar Pradesh), BPSC (Bihar), MPPSC (Madhya Pradesh), RPSC (Rajasthan), JPSC (Jharkhand), WBPSC (West Bengal), OPSC (Odisha), CGPSC (Chhattisgarh), UKPSC (Uttarakhand), HPSC (Haryana), KPSC (Karnataka), TNPSC (Tamil Nadu), APPSC (Andhra Pradesh), GPSC (Gujarat), and NE States PSC exams. The AI adapts content and quizzes to each specific exam's syllabus and pattern.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-mentor" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-ai-mentor">
                  How does the AI mentor work for UPSC coaching?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-ai-mentor">
                  Learnpro AI's mentor uses advanced AI to provide instant, detailed answers to any UPSC or State PSC query. Whether it's Indian Polity, Economy, Geography, History, Environment, Science & Technology, International Relations, or Ethics — the AI provides structured responses with previous year question references, concept clarity, and real-time explanations. It's like having a personal IAS coaching teacher available 24/7, in 14 Indian languages including Hindi, Bengali, Tamil, Telugu, Marathi, and more.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="answer-eval" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-answer-eval">
                  Can Learnpro AI evaluate my UPSC Mains answer sheets?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-answer-eval">
                  Absolutely! Learnpro AI provides AI-powered answer sheet evaluation designed specifically for UPSC Mains and State PSC written exams. Simply upload your handwritten answer sheets and receive detailed scoring across 7 competency parameters (content accuracy, structure, analytical depth, examples, conclusion, presentation, and relevance), per-question feedback, and actionable improvement suggestions — all evaluated as per UPSC and State PSC marking norms.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="current-affairs" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-current-affairs">
                  How does the daily current affairs feature work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-current-affairs">
                  Learnpro AI provides daily current affairs digests curated specifically for UPSC Prelims and Mains preparation. Each topic is categorized by GS papers (Polity, Economy, Geography, Environment, S&T, International Relations), sourced from reliable outlets, and includes revision tracking so you never miss important developments. State-specific current affairs are also available for State PSC aspirants. The 14-day date navigation ensures you stay on top of all recent developments.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="languages" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-languages">
                  In how many Indian languages is UPSC coaching available on Learnpro AI?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-languages">
                  Learnpro AI supports 14 Indian languages: English, Hindi, Bengali, Gujarati, Marathi, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, and Maithili. This makes quality UPSC and State PSC coaching accessible to aspirants from every corner of India, in their preferred language — breaking the barrier that traditional English-only coaching institutes create.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vs-traditional" className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left text-sm sm:text-base hover:no-underline" data-testid="faq-trigger-vs-traditional">
                  How is Learnpro AI better than traditional UPSC coaching institutes?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed" data-testid="faq-content-vs-traditional">
                  Traditional UPSC coaching in cities like Delhi, Bangalore, or Hyderabad costs ₹1-3 lakhs with fixed schedules and requires relocation. Learnpro AI provides 24/7 AI-powered mentoring, personalized study plans, instant doubt resolution, daily current affairs, MCQ practice across all GS papers and CSAT, and answer writing evaluation — all from your phone or laptop, starting completely free. No fixed schedules, no commuting, no expensive fees. It's like having Vajiram, Vision IAS, or Unacademy's best features powered by AI, available anytime.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/[0.03] to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(35_90%_45%/0.08),transparent_60%)]" />

          <div className="py-16 sm:py-24 relative z-10">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-4xl font-display font-bold mb-3 sm:mb-4" data-testid="text-cta-heading">
                  {t.landing.ctaHeading}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-8 sm:mb-10 max-w-xl mx-auto">
                  {t.landing.ctaDescription}
                </p>
                <Button
                  size="lg"
                  onClick={openLogin}
                  className="rounded-full shadow-xl shadow-primary/30"
                  data-testid="button-bottom-cta"
                >
                  {t.landing.startYourJourney}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="w-full flex justify-center py-4 sm:py-6 relative z-10">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-border" />
              <Sparkles className="h-3.5 w-3.5 text-primary/40" />
              <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-border" />
            </div>
          </div>

          <MobileAppSection embedded />
        </section>
      </main>

      <LandingFooter onLoginClick={openLogin} />
    </div>
  );
}
