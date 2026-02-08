import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Logo } from "@/components/ui/logo";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  BookOpen,
  PenTool,
  Newspaper,
  HelpCircle,
  Lightbulb,
  Scale,
} from "lucide-react";

const toolkitFeatures = [
  {
    icon: BookOpen,
    title: "Complete Syllabus Coverage",
    description: "GS Paper I-IV, CSAT, Optional Subjects — get expert guidance on every topic in the UPSC & State PCS syllabus.",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    icon: PenTool,
    title: "Answer Writing Practice",
    description: "Learn the perfect UPSC answer format with structured responses, relevant examples, and scoring techniques.",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  {
    icon: Newspaper,
    title: "Current Affairs Analysis",
    description: "Get daily current affairs connected to static syllabus topics — exactly how UPSC frames questions.",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    link: "/current-affairs",
  },
  {
    icon: HelpCircle,
    title: "PYQ-Based Learning",
    description: "Every concept explained with reference to Previous Year Questions. Know what UPSC actually asks.",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  {
    icon: Lightbulb,
    title: "Smart Mnemonics & Tricks",
    description: "Memory aids, mind maps, and shortcut techniques to remember facts, dates, and complex concepts.",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  },
  {
    icon: Scale,
    title: "Ethics & Essay Guidance",
    description: "GS Paper IV ethics case studies and essay writing with balanced perspectives and real-world examples.",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
];

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id ? parseInt(params.id) : null;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: conversationData, isLoading: isChatLoading } = useConversation(conversationId);
  const { sendMessage, streamedContent, isStreaming, stopStream } = useChatStream(conversationId || 0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [prefillSent, setPrefillSent] = useState(false);

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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!conversationId ? (
            <div className="flex flex-col items-center p-8 text-center animate-in fade-in duration-500">
              <Logo size="xl" className="mb-8 mt-8" />
              <h2 className="text-3xl font-display font-bold mb-4" data-testid="text-welcome-heading">
                Welcome back, {user?.firstName || "Aspirant"}
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mb-8">
                I'm your AI tutor for UPSC & State PSC exams. Ask me about History, Polity, Geography, or Current Affairs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full mb-12">
                {[
                  "Explain the Doctrine of Lapse",
                  "Summary of Article 21",
                  "Recent G20 Summit highlights",
                  "Geography of the Deccan Plateau"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    data-testid={`button-prompt-${i}`}
                    className="p-4 text-left rounded-xl bg-secondary/50 hover-elevate border border-transparent hover:border-primary/20 transition-all text-sm font-medium"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>

              <div className="w-full max-w-4xl">
                <h3 className="text-2xl font-display font-bold mb-2" data-testid="text-toolkit-heading">
                  Your Complete Exam Prep Toolkit
                </h3>
                <p className="text-muted-foreground mb-8">
                  Everything you need to crack UPSC & State PCS — powered by advanced AI that understands the exam pattern.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                  {toolkitFeatures.map((feature, i) => {
                    const content = (
                      <Card
                        key={i}
                        data-testid={`card-feature-${i}`}
                        className={feature.link ? "hover-elevate cursor-pointer" : ""}
                      >
                        <CardContent className="p-5">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                            <feature.icon className="h-5 w-5" />
                          </div>
                          <h4 className="font-semibold mb-2">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </CardContent>
                      </Card>
                    );

                    if (feature.link) {
                      return (
                        <Link key={i} href={feature.link}>
                          {content}
                        </Link>
                      );
                    }

                    return content;
                  })}
                </div>
              </div>
            </div>
          ) : isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full pb-32 pt-6">
              {conversationData?.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
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

        {conversationId && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4">
            <ChatInput 
              onSend={sendMessage} 
              isStreaming={isStreaming} 
              onStop={stopStream}
            />
          </div>
        )}
      </main>
    </div>
  );
}
