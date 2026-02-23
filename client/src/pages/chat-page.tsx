import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useChatStream, useCreateConversation } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatQuizPanel } from "@/components/chat/chat-quiz-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Download,
  Sparkles,
  ArrowRight,
  MessageCircle,
  ArrowDown,
  FileText,
  Brain,
  BookOpen,
  Newspaper,
  PenLine,
  Lightbulb,
} from "lucide-react";
import { generatePDF, chatToPDFSections } from "@/lib/pdf-generator";
import { useLanguage } from "@/i18n/context";
import { InlineLanguageButton } from "@/components/inline-language-button";

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
  const { t } = useLanguage();
  
  const { data: conversationData, isLoading: isChatLoading } = useConversation(conversationId);
  const { sendMessage, streamedContent, isStreaming, stopStream, pendingUserMessage } = useChatStream(conversationId || 0);
  const createMutation = useCreateConversation();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [prefillSent, setPrefillSent] = useState(false);
  const [quizContent, setQuizContent] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const { data: queryStatus } = useQuery<{ used: number; limit: number; remaining: number }>({
    queryKey: ["/api/chat/query-status"],
    refetchInterval: 30000,
  });

  const handleHomeSend = async (message: string, attachments?: { name: string; type: string; objectPath: string; size: number }[]) => {
    if (conversationId) {
      sendMessage(message, attachments);
    } else {
      createMutation.mutate("New Chat", {
        onSuccess: (newChat) => {
          if (attachments && attachments.length > 0) {
            sessionStorage.setItem(`chat_attachments_${newChat.id}`, JSON.stringify(attachments));
          }
          setLocation(`/chat/${newChat.id}?prefill=${encodeURIComponent(message)}`);
        },
      });
    }
  };

  const queryLimitReached = queryStatus?.remaining === 0;

  const handleStartQuiz = (content: string) => {
    setQuizContent(content);
    setQuizOpen(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 200);
  };

  useEffect(() => {
    scrollToBottom();
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
        const savedAttachments = sessionStorage.getItem(`chat_attachments_${conversationId}`);
        let attachments: any[] | undefined;
        if (savedAttachments) {
          try {
            attachments = JSON.parse(savedAttachments);
            sessionStorage.removeItem(`chat_attachments_${conversationId}`);
          } catch {}
        }
        sendMessage(decodedMessage, attachments);
        window.history.replaceState({}, "", `/chat/${conversationId}`);
      }
    }
  }, [conversationId, prefillSent, isChatLoading, conversationData]);

  const hasMessages = conversationData?.messages && conversationData.messages.length > 0;
  const lastMessage = hasMessages ? conversationData.messages[conversationData.messages.length - 1] : null;
  const hasTopic = hasMessages && isSubstantiveConversation(conversationData.messages);
  const showSuggestions = hasMessages && lastMessage?.role === "assistant" && !isStreaming && hasTopic;

  const lastMsgId = lastMessage?.id;
  const suggestionsUrl = `/api/conversations/${conversationId}/suggestions?v=${lastMsgId || 0}`;
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<{ suggestions: string[] }>({
    queryKey: [suggestionsUrl],
    enabled: showSuggestions && !!conversationId,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });
  const smartSuggestions = suggestionsData?.suggestions || [];

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
        <div className="hidden md:flex justify-end px-4 py-2 border-b">
          <InlineLanguageButton />
        </div>
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scroll-smooth">
          {!conversationId || (!isChatLoading && !hasMessages && !isStreaming) ? (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500 px-4">
              {queryStatus && !(queryStatus as any).isAdmin && !(queryStatus as any).unlimited && (
                <div className="mb-6" data-testid="query-status-badge">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {queryStatus.remaining} / {queryStatus.limit} {t.chat.queriesLeft}
                    </span>
                  </div>
                </div>
              )}

              <h2 className="text-lg sm:text-2xl font-display font-semibold mb-1 text-center" data-testid="text-welcome-heading">
                {t.chat.welcome}, {user?.firstName || t.chat.aspirant}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md text-center mb-6">
                {t.chat.askAnything}
              </p>

              <div className="w-full max-w-xl space-y-3">
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <Lightbulb className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Try asking</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: BookOpen, text: "Explain Article 370 and its impact on J&K", color: "text-blue-500", bg: "bg-blue-500/8" },
                    { icon: Brain, text: "Generate 10 MCQs on Indian Polity for Prelims", color: "text-emerald-500", bg: "bg-emerald-500/8" },
                    { icon: PenLine, text: "Write a 250-word answer on Federalism in India", color: "text-purple-500", bg: "bg-purple-500/8" },
                    { icon: Newspaper, text: "Explain the significance of 73rd & 74th Amendments", color: "text-amber-500", bg: "bg-amber-500/8" },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleHomeSend(item.text)}
                      disabled={createMutation.isPending}
                      className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card hover-elevate text-left group cursor-pointer transition-all"
                      data-testid={`button-chat-help-${i}`}
                    >
                      <div className={`h-7 w-7 rounded-md ${item.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground leading-snug">{item.text}</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {[
                    { icon: FileText, label: "Download as PDF" },
                    { icon: Brain, label: "Generate Quiz" },
                    { icon: PenLine, label: "Answer Writing" },
                    { icon: BookOpen, label: "Topic Deep-dive" },
                  ].map((feat, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border"
                      data-testid={`badge-feature-${i}`}
                    >
                      <feat.icon className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">{feat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
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
                        toast({ title: t.chat.pdfDownloaded });
                      } catch {
                        toast({ title: t.chat.pdfFailed, variant: "destructive" });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    {t.chat.downloadChatPdf}
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
                  <MessageBubble key={msg.id} message={msg} conversationId={conversationId || undefined} userQuery={prevUserQuery} onStartQuiz={handleStartQuiz} />
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
                    <span className="text-sm font-semibold text-muted-foreground">{t.chat.youCanAlsoAsk}</span>
                  </div>
                  <div className="space-y-2">
                    {suggestionsLoading ? (
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="h-10 rounded-md bg-primary/5 border border-primary/10 animate-pulse" />
                        ))}
                      </div>
                    ) : smartSuggestions.length > 0 ? (
                      smartSuggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          data-testid={`button-suggestion-${i}`}
                          onClick={() => conversationId && sendMessage(suggestion)}
                          disabled={isStreaming || !conversationId}
                          className="w-full justify-between gap-3 text-left bg-primary/5 border-primary/10"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{suggestion}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </Button>
                      ))
                    ) : null}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {showScrollButton && hasMessages && (
          <Button
            variant="outline"
            size="icon"
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 rounded-full shadow-md bg-background/90 backdrop-blur-sm"
            data-testid="button-scroll-to-bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2 sm:pb-3 px-2 sm:px-4">
          {queryLimitReached ? (
            <div className="max-w-3xl mx-auto text-center py-3 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium" data-testid="text-query-limit">
                {t.chat.queryLimitReached}
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

        {quizOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
            onClick={() => setQuizOpen(false)}
            data-testid="quiz-backdrop"
          />
        )}

        {quizContent && quizOpen && (
          <ChatQuizPanel
            content={quizContent}
            isOpen={quizOpen}
            onClose={() => setQuizOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
