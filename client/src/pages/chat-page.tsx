import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useChatStream, useCreateConversation } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  BookOpen,
  Newspaper,
  Lightbulb,
  Scale,
  Download,
  Sparkles,
  ArrowRight,
  PenLine,
  ListChecks,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { generatePDF, chatToPDFSections } from "@/lib/pdf-generator";

const TOPIC_SUGGESTIONS = [
  { text: "Create 5 Prelims MCQs on this topic", icon: ListChecks },
  { text: "Write a Mains answer on this topic", icon: PenLine },
  { text: "How to write good answers for this topic?", icon: HelpCircle },
  { text: "Explain the key concepts in simple terms", icon: Lightbulb },
  { text: "What are the important facts to remember?", icon: BookOpen },
];

const CASUAL_GREETINGS = /^\s*(hi|hello|hey|hii+|helo|good\s*(morning|afternoon|evening|night)|namaste|namaskar|howdy|sup|what'?s\s*up|yo)\b.*$/i;

function isSubstantiveConversation(messages: Array<{role: string; content: string}>): boolean {
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length === 0) return false;
  return userMessages.some(m => !CASUAL_GREETINGS.test(m.content.trim()));
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const parsedId = params.id ? parseInt(params.id) : NaN;
  const conversationId = !isNaN(parsedId) ? parsedId : null;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: conversationData, isLoading: isChatLoading } = useConversation(conversationId);
  const { sendMessage, streamedContent, isStreaming, stopStream, pendingUserMessage } = useChatStream(conversationId || 0);
  const createMutation = useCreateConversation();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [prefillSent, setPrefillSent] = useState(false);

  const { data: queryStatus } = useQuery<{ used: number; limit: number; remaining: number }>({
    queryKey: ["/api/chat/query-status"],
    refetchInterval: 30000,
  });

  const handleHomeSend = async (message: string) => {
    if (conversationId) {
      sendMessage(message);
    } else {
      createMutation.mutate("New Chat", {
        onSuccess: (newChat) => {
          setLocation(`/chat/${newChat.id}?prefill=${encodeURIComponent(message)}`);
        },
      });
    }
  };

  const queryLimitReached = queryStatus?.remaining === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages, streamedContent]);

  useEffect(() => {
    if (conversationId && !prefillSent && !isChatLoading && conversationData) {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get("prefill");
      if (prefill && conversationData.messages.length === 0) {
        setPrefillSent(true);
        let decodedMessage = prefill;
        try {
          decodedMessage = decodeURIComponent(prefill);
        } catch {
          decodedMessage = prefill;
        }
        sendMessage(decodedMessage);
        window.history.replaceState({}, "", `/chat/${conversationId}`);
      }
    }
  }, [conversationId, prefillSent, isChatLoading, conversationData]);

  const hasMessages = conversationData?.messages && conversationData.messages.length > 0;
  const lastMessage = hasMessages ? conversationData.messages[conversationData.messages.length - 1] : null;
  const hasTopic = hasMessages && isSubstantiveConversation(conversationData.messages);
  const showSuggestions = hasMessages && lastMessage?.role === "assistant" && !isStreaming && hasTopic;

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
          {!conversationId || (!isChatLoading && !hasMessages && !isStreaming) ? (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
              {queryStatus && !(queryStatus as any).isAdmin && (
                <div className="mb-6" data-testid="query-status-badge">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {queryStatus.remaining} / {queryStatus.limit} queries left today
                    </span>
                  </div>
                </div>
              )}

              <h2 className="text-lg sm:text-2xl font-display font-semibold mb-1 text-center px-4" data-testid="text-welcome-heading">
                Let's begin learning, {user?.firstName || "Aspirant"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md text-center px-4">
                Ask me anything about UPSC & State PSC preparation
              </p>
            </div>
          ) : isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full pb-32 pt-4 sm:pt-6">
              {hasMessages && (
                <div className="flex justify-end px-3 sm:px-6 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="button-download-chat-pdf"
                    onClick={async () => {
                      try {
                        const sections = chatToPDFSections(
                          conversationData.messages.map((m) => ({ role: m.role, content: m.content }))
                        );
                        await generatePDF({
                          title: conversationData.title || "Chat Conversation",
                          subtitle: `Learnpro AI Chat - ${new Date().toLocaleDateString("en-IN")}`,
                          sections,
                          fileName: `learnpro-chat-${conversationId}.pdf`,
                        });
                        toast({ title: "PDF downloaded successfully" });
                      } catch {
                        toast({ title: "Failed to generate PDF", variant: "destructive" });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download Full Chat PDF
                  </Button>
                </div>
              )}
              {conversationData?.messages.map((msg, idx) => {
                let prevUserQuery: string | undefined;
                if (msg.role === "assistant") {
                  const msgs = conversationData.messages;
                  for (let i = idx - 1; i >= 0; i--) {
                    if (msgs[i].role === "user") {
                      prevUserQuery = msgs[i].content;
                      break;
                    }
                  }
                }
                return (
                  <MessageBubble key={msg.id} message={msg} conversationId={conversationId || undefined} userQuery={prevUserQuery} />
                );
              })}
              
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

              {showSuggestions && (
                <div className="px-3 sm:px-6 py-4" data-testid="chat-suggestions">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground">You can also ask</span>
                  </div>
                  <div className="space-y-2">
                    {TOPIC_SUGGESTIONS.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        data-testid={`button-suggestion-${i}`}
                        onClick={() => conversationId && sendMessage(suggestion.text)}
                        disabled={isStreaming || !conversationId}
                        className="w-full justify-between gap-3 text-left bg-primary/5 border-primary/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <suggestion.icon className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium">{suggestion.text}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 sm:pt-10 pb-4 sm:pb-6 px-2 sm:px-4">
          {queryLimitReached ? (
            <div className="max-w-3xl mx-auto text-center py-3 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium" data-testid="text-query-limit">
                Daily query limit reached. Upgrade to Pro for unlimited queries.
              </p>
            </div>
          ) : (
            <ChatInput 
              onSend={conversationId ? sendMessage : handleHomeSend} 
              isStreaming={isStreaming} 
              onStop={stopStream}
            />
          )}
        </div>
      </main>
    </div>
  );
}
