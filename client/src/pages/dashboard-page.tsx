import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useCreateConversation } from "@/hooks/use-chat";
import {
  MessageSquare,
  Newspaper,
  Brain,
  ArrowRight,
  Target,
  Flame,
  BookOpen,
  Loader2,
} from "lucide-react";

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

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const createMutation = useCreateConversation();

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
  const examLabel = user?.targetExam ? EXAM_LABELS[user.targetExam] || user.targetExam : null;
  const userTypeLabel = user?.userType ? USER_TYPE_LABELS[user.userType] || user.userType : null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
            <Logo size="xl" className="mb-4 hidden sm:block" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-dashboard-greeting">
              {getGreeting()}, {displayName}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1" data-testid="text-dashboard-subtitle">
              {examLabel ? (
                <>Preparing for <span className="font-semibold text-primary">{examLabel}</span></>
              ) : (
                "Your AI-powered preparation hub"
              )}
              {userTypeLabel && (
                <span className="text-muted-foreground"> &middot; {userTypeLabel}</span>
              )}
            </p>
          </div>

          <Card className="p-4 sm:p-5 mb-6 sm:mb-8 bg-primary/5 dark:bg-primary/10 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-sm text-foreground block" data-testid="text-daily-tip-label">Daily Tip</span>
                <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-daily-tip">
                  {getMotivationalTip(user?.userType || null)}
                </p>
              </div>
            </div>
          </Card>

          <h2 className="text-base font-semibold mb-3 sm:mb-4" data-testid="text-quick-actions-heading">
            Start Learning
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} data-testid={`link-action-${action.title.toLowerCase().replace(/\s/g, "-")}`}>
                <Card className="p-4 sm:p-5 h-full hover-elevate cursor-pointer" data-testid={`card-action-${action.title.toLowerCase().replace(/\s/g, "-")}`}>
                  <div className={`h-10 w-10 rounded-md ${action.bgColor} flex items-center justify-center mb-3`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium mt-3">
                    Open
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <h2 className="text-base font-semibold mb-3 sm:mb-4" data-testid="text-suggested-heading">
            Suggested Topics
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                className="flex items-center gap-2 p-3 rounded-md bg-secondary/50 hover-elevate border border-border cursor-pointer text-left"
                data-testid={`topic-${i}`}
              >
                <topic.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{topic.text}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
