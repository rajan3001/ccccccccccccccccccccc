import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useChatStream, useCreateConversation } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Logo } from "@/components/ui/logo";
import {
  Loader2,
  BookOpen,
  Newspaper,
  Lightbulb,
  Scale,
} from "lucide-react";

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
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
              <div className="hidden sm:flex flex-col items-center pb-4">
                <Logo size="xl" className="mb-6" />
              </div>
              <h2 className="text-lg sm:text-3xl font-display font-bold mt-3 sm:mt-0 mb-0.5 sm:mb-4 text-center px-4" data-testid="text-welcome-heading">
                Welcome back, {user?.firstName || "Aspirant"}
              </h2>
              <p className="text-xs sm:text-lg text-muted-foreground max-w-lg mb-4 sm:mb-8 text-center px-4">
                Your AI tutor for UPSC & State PSC exams
              </p>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-2xl w-full px-3 sm:px-4">
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
