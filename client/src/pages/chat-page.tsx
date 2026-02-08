import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useChatStream, useCreateConversation } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  BookOpen,
  PenTool,
  Newspaper,
  HelpCircle,
  Lightbulb,
  Scale,
  Flame,
  ArrowRight,
  MessageSquare,
  Target,
  GraduationCap,
} from "lucide-react";

const featureItems = [
  {
    id: "ai-chat",
    icon: MessageSquare,
    title: "AI-Powered Doubt Resolution",
    description: "24/7 AI mentor trained on UPSC & State PSC syllabus. Get instant, structured answers with PYQ references.",
    cta: "Start Learning",
    link: undefined as string | undefined,
  },
  {
    id: "syllabus",
    icon: BookOpen,
    title: "Complete GS Syllabus",
    description: "GS Paper I-IV, CSAT, Optional Subjects covered with NCERTs and standard reference material.",
    cta: "Explore Syllabus",
    link: undefined as string | undefined,
  },
  {
    id: "answer-writing",
    icon: PenTool,
    title: "Mains Answer Writing",
    description: "Learn the perfect answer format with structured responses, relevant examples, and scoring techniques.",
    cta: "Practice Writing",
    link: undefined as string | undefined,
  },
  {
    id: "current-affairs",
    icon: Newspaper,
    title: "Daily Current Affairs",
    description: "AI-generated daily digests from The Hindu & Indian Express, mapped to GS papers with state-specific filtering.",
    cta: "Read Today's News",
    link: "/current-affairs",
  },
  {
    id: "practice-mcqs",
    icon: Target,
    title: "Practice MCQs",
    description: "Topic-wise MCQs for UPSC + 15 State PSCs. AI-generated questions with explanations and performance analytics.",
    cta: "Practice Now",
    link: "/practice-quiz",
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

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id ? parseInt(params.id) : null;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: conversationData, isLoading: isChatLoading } = useConversation(conversationId);
  const { sendMessage, streamedContent, isStreaming, stopStream, pendingUserMessage } = useChatStream(conversationId || 0);
  const createMutation = useCreateConversation();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [prefillSent, setPrefillSent] = useState(false);

  const handleHomeSend = async (message: string) => {
    createMutation.mutate("New Chat", {
      onSuccess: (newChat) => {
        setLocation(`/chat/${newChat.id}?prefill=${encodeURIComponent(message)}`);
      },
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages, streamedContent]);

  useEffect(() => {
    if (conversationId && !prefillSent && !isChatLoading && conversationData) {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get("prefill");
      if (prefill && conversationData.messages.length === 0) {
        setPrefillSent(true);
        sendMessage(decodeURIComponent(prefill));
        window.history.replaceState({}, "", `/chat/${conversationId}`);
      }
    }
  }, [conversationId, prefillSent, isChatLoading, conversationData]);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!conversationId ? (
            <div className="flex flex-col items-center animate-in fade-in duration-500 pb-28 sm:pb-32">
              <div className="hidden sm:flex flex-col items-center pt-8 pb-4">
                <Logo size="xl" className="mb-6" />
              </div>
              <h2 className="text-lg sm:text-3xl font-display font-bold mt-3 sm:mt-0 mb-0.5 sm:mb-4 text-center px-4" data-testid="text-welcome-heading">
                Welcome back, {user?.firstName || "Aspirant"}
              </h2>
              <p className="text-xs sm:text-lg text-muted-foreground max-w-lg mb-3 sm:mb-8 text-center px-4">
                Your AI tutor for UPSC & State PSC exams
              </p>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-2xl w-full px-3 sm:px-4 mb-4 sm:mb-10">
                {[
                  { text: "Doctrine of Lapse", icon: BookOpen },
                  { text: "Article 21", icon: Scale },
                  { text: "G20 Summit", icon: Newspaper },
                  { text: "Deccan Plateau", icon: Lightbulb },
                ].map((prompt, i) => (
                  <button
                    key={i}
                    data-testid={`button-prompt-${i}`}
                    onClick={() => handleHomeSend(prompt.text)}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 p-2.5 sm:p-4 text-left rounded-lg sm:rounded-xl bg-secondary/50 hover-elevate border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                  >
                    <prompt.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span className="text-[11px] sm:text-sm font-medium leading-tight">{prompt.text}</span>
                  </button>
                ))}
              </div>

              <div className="w-full max-w-5xl px-3 sm:px-6 mt-2 sm:mt-4">
                <div className="text-center mb-4 sm:mb-8">
                  <span className="text-xs sm:text-sm font-semibold text-primary tracking-wide uppercase">Cover 100% Prelims & Mains Syllabus</span>
                  <h3 className="text-base sm:text-3xl font-display font-bold mt-1 sm:mt-2" data-testid="text-toolkit-heading">
                    Add magic in your preparation
                  </h3>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
                  <div className="flex-1 w-full min-w-0">
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
                            {feature.link ? (
                              <Link href={feature.link}>
                                <Button size="sm" className="gap-1.5" data-testid={`button-feature-${feature.id}`}>
                                  {feature.cta}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                data-testid={`button-feature-${feature.id}`}
                                onClick={() => {
                                  const input = document.querySelector('textarea');
                                  if (input) input.focus();
                                }}
                              >
                                {feature.cta}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>

                  <div className="hidden lg:flex flex-shrink-0 items-center justify-center pt-4">
                    <StudyStreakCard />
                  </div>
                </div>

                <div className="flex lg:hidden justify-center mt-6">
                  <StudyStreakCard />
                </div>
              </div>
            </div>
          ) : isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full pb-32 pt-4 sm:pt-6">
              {conversationData?.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
              {isStreaming && pendingUserMessage && !conversationData?.messages.some(m => m.content === pendingUserMessage && m.role === "user") && (
                <MessageBubble 
                  message={{ role: "user", content: pendingUserMessage }} 
                />
              )}

              {isStreaming && (
                <MessageBubble 
                  message={{ role: "assistant", content: streamedContent }} 
                  isStreaming={true}
                />
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 sm:pt-10 pb-4 sm:pb-6 px-2 sm:px-4">
          <ChatInput 
            onSend={conversationId ? sendMessage : handleHomeSend} 
            isStreaming={isStreaming} 
            onStop={stopStream}
          />
        </div>
      </main>
    </div>
  );
}
