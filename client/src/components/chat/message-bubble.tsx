import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/use-chat";
import { Logo } from "@/components/ui/logo";
import { User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: Partial<Message>;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn(
      "group flex gap-4 p-6 transition-colors duration-200",
      isUser ? "bg-muted/30" : "bg-background"
    )}>
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-border">
            <User className="h-5 w-5 text-secondary-foreground/70" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             {/* Using a smaller version of logo or icon for avatar */}
             <Logo size="sm" withText={false} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-foreground/80">
            {isUser ? "You" : "Learnpro Assistant"}
          </span>
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          )}
        </div>

        <div className="prose prose-stone dark:prose-invert max-w-none text-base">
          {message.content ? (
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          ) : (
             isStreaming && <span className="animate-pulse inline-block w-2 h-4 bg-primary rounded-sm align-middle" />
          )}
          {isStreaming && message.content && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
