import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Logo } from "@/components/ui/logo";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id ? parseInt(params.id) : null;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const { data: conversationData, isLoading: isChatLoading } = useConversation(conversationId);
  const { sendMessage, streamedContent, isStreaming, stopStream } = useChatStream(conversationId || 0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages, streamedContent]);

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
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!conversationId ? (
            // Welcome Screen
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <Logo size="xl" className="mb-8" />
              <h2 className="text-3xl font-display font-bold mb-4">
                Welcome back, {user?.firstName || "Aspirant"}
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mb-8">
                I'm your AI tutor for UPSC & State PSC exams. Ask me about History, Polity, Geography, or Current Affairs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
                {[
                  "Explain the Doctrine of Lapse",
                  "Summary of Article 21",
                  "Recent G20 Summit highlights",
                  "Geography of the Deccan Plateau"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    className="p-4 text-left rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all text-sm font-medium"
                    // In a real app, this would trigger a new chat with this prompt
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            // Messages List
            <div className="max-w-3xl mx-auto w-full pb-32 pt-6">
              {conversationData?.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
              {/* Streaming Message Bubble */}
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

        {/* Input Area - Fixed at bottom */}
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
