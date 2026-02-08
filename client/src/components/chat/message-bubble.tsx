import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/use-chat";
import { Logo } from "@/components/ui/logo";
import { User, Copy, Check, FileText, Image as ImageIcon, File } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AttachmentData {
  name: string;
  type: string;
  objectPath: string;
  size: number;
}

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

  const attachments: AttachmentData[] = (message as any).attachments || [];

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type === "application/pdf") return FileText;
    return File;
  };

  return (
    <div className={cn(
      "group flex gap-3 sm:gap-4 px-3 py-4 sm:p-6 transition-colors duration-200",
      isUser ? "bg-muted/30" : "bg-background"
    )}>
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-secondary flex items-center justify-center border border-border">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-foreground/70" />
          </div>
        ) : (
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <Logo size="sm" withText={false} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-sm font-semibold text-foreground/80">
            {isUser ? "You" : "Learnpro Assistant"}
          </span>
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
              data-testid="button-copy-message"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((att, i) => {
              const Icon = getFileIcon(att.type);
              const isImage = att.type.startsWith("image/");

              return (
                <div
                  key={i}
                  data-testid={`message-attachment-${i}`}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  {isImage ? (
                    <a href={att.objectPath} target="_blank" rel="noopener noreferrer">
                      <img
                        src={att.objectPath}
                        alt={att.name}
                        className="max-h-48 max-w-64 object-cover rounded-lg"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <a
                      href={att.objectPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 hover-elevate"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate max-w-[200px]">{att.name}</span>
                        <span className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</span>
                      </div>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
