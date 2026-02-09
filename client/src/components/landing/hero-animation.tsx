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
  Zap,
  CheckCircle2,
} from "lucide-react";

const chatMessages = [
  { role: "user", text: "Explain Article 370 and its abrogation" },
  { role: "ai", text: "Article 370 granted special autonomous status to J&K..." },
  { role: "user", text: "How does federalism relate to this?" },
  { role: "ai", text: "The Centre-State dynamic shifted significantly..." },
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function FloatingParticle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/20"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        y: [0, -15, 0],
        opacity: [0.2, 0.6, 0.2],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay }}
    />
  );
}

export function HeroDashboardAnimation() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const showNext = () => {
      if (visibleMessages < chatMessages.length) {
        setIsTyping(true);
        timeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((v) => v + 1);
          timeoutRef.current = setTimeout(showNext, 1500);
        }, 1200);
      } else {
        timeoutRef.current = setTimeout(() => {
          setVisibleMessages(0);
          setActiveTab((t) => (t + 1) % 3);
          timeoutRef.current = setTimeout(showNext, 800);
        }, 3000);
      }
    };
    timeoutRef.current = setTimeout(showNext, 1000);
    return () => clearTimeout(timeoutRef.current);
  }, [visibleMessages]);

  const tabs = [
    { icon: MessageSquare, label: "AI Chat" },
    { icon: Newspaper, label: "Current Affairs" },
    { icon: Target, label: "Quiz" },
  ];

  const sideItems = [
    { icon: BookOpen, label: "Syllabus", color: "text-blue-500 dark:text-blue-400" },
    { icon: PenTool, label: "Evaluation", color: "text-emerald-500 dark:text-emerald-400" },
    { icon: Brain, label: "Study Plan", color: "text-purple-500 dark:text-purple-400" },
  ];

  return (
    <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl mx-auto" data-testid="hero-animation">
      <FloatingParticle delay={0} x="5%" y="10%" size={6} />
      <FloatingParticle delay={0.5} x="85%" y="20%" size={8} />
      <FloatingParticle delay={1} x="15%" y="80%" size={5} />
      <FloatingParticle delay={1.5} x="90%" y="70%" size={7} />
      <FloatingParticle delay={0.8} x="50%" y="5%" size={4} />

      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-3xl blur-2xl opacity-60" />

      <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10 bg-card">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
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
          <div className="w-12 sm:w-14 border-r border-border/30 bg-muted/20 py-3 flex flex-col items-center gap-3">
            {sideItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex flex-col items-center gap-0.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                data-testid={`hero-nav-${item.label.toLowerCase()}`}
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-muted/50 flex items-center justify-center">
                  <item.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${item.color}`} />
                </div>
                <span className="text-[8px] text-muted-foreground leading-none">{item.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex border-b border-border/30">
              {tabs.map((tab, i) => (
                <motion.div
                  key={tab.label}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] sm:text-xs font-medium transition-colors border-b-2 ${
                    i === activeTab
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  data-testid={`hero-tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {tab.label}
                </motion.div>
              ))}
            </div>

            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 h-[200px] sm:h-[240px] overflow-hidden">
              <AnimatePresence mode="popLayout">
                {chatMessages.slice(0, visibleMessages).map((msg, i) => (
                  <motion.div
                    key={`${activeTab}-${i}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] sm:text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "ai" && (
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="h-2.5 w-2.5 text-primary" />
                          <span className="text-[9px] font-semibold text-primary">Learnpro AI</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted rounded-xl px-3 py-2.5 rounded-bl-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 px-3 sm:px-4 py-2 flex items-center gap-2 bg-muted/20">
          <div className="flex-1 h-7 sm:h-8 rounded-lg bg-muted/50 border border-border/30 flex items-center px-2.5">
            <motion.span
              className="text-[10px] sm:text-xs text-muted-foreground"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Ask anything about UPSC...
            </motion.span>
          </div>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-card border border-border rounded-xl p-3 sm:p-4 shadow-lg flex items-center gap-3"
      >
        <motion.div
          className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        </motion.div>
        <div>
          <p className="text-xs font-semibold text-foreground">AI Answer Ready</p>
          <p className="text-[10px] text-muted-foreground">Explained in UPSC format</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.3, duration: 0.5 }}
        className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 bg-card border border-border rounded-xl p-3 sm:p-4 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 2 }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <div>
            <p className="text-xs font-semibold text-foreground">Smart Analysis</p>
            <div className="flex items-center gap-1 mt-0.5">
              <motion.div
                className="h-1 rounded-full bg-primary"
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                style={{ maxWidth: 40 }}
              />
              <span className="text-[9px] text-muted-foreground">Processing</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
  { cx: 5, cy: 30, r: 2, delay: 0.8 },
  { cx: 95, cy: 70, r: 2, delay: 1 },
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
  { x1: 20, y1: 25, x2: 5, y2: 30 },
  { x1: 80, y1: 75, x2: 95, y2: 70 },
  { x1: 20, y1: 25, x2: 10, y2: 50 },
  { x1: 80, y1: 25, x2: 90, y2: 50 },
  { x1: 20, y1: 75, x2: 10, y2: 50 },
  { x1: 80, y1: 75, x2: 90, y2: 50 },
];

function PulsingSignal({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  return (
    <motion.circle
      r="1.5"
      fill="hsl(var(--primary))"
      initial={{ cx: x1, cy: y1, opacity: 0 }}
      animate={{
        cx: [x1, x2],
        cy: [y1, y2],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay,
        repeatDelay: 2,
      }}
    />
  );
}

export function NeuralNetworkAnimation() {
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
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              stroke="hsl(var(--primary))"
              strokeWidth="0.3"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}

          {neuralConnections.slice(0, 8).map((conn, i) => (
            <PulsingSignal
              key={`signal-${i}`}
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              delay={i * 0.6}
            />
          ))}

          {neuralNodes.map((node, i) => (
            <motion.circle
              key={`node-${i}`}
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              fill="url(#nodeGrad)"
              filter="url(#glow)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: i === activeNode ? 1 : 0.6,
                scale: i === activeNode ? 1.3 : 1,
              }}
              whileInView={{ opacity: [0, 0.6], scale: [0, 1] }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: node.delay,
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
              }}
            />
          ))}

          <motion.circle
            cx="50"
            cy="50"
            r="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="18"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
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
