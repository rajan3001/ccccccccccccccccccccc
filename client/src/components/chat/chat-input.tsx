import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  placeholder?: string;
}

export function ChatInput({ onSend, isStreaming, onStop, placeholder = "Ask anything about UPSC, History, Polity..." }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="relative max-w-3xl mx-auto w-full p-4">
      <div className="relative flex items-end gap-2 bg-background border-2 border-primary/20 rounded-2xl p-2 shadow-lg shadow-primary/5 focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all duration-300">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[50px] max-h-[200px] w-full resize-none border-0 bg-transparent py-3 px-4 focus-visible:ring-0 text-base"
        />
        <div className="pb-2 pr-2">
          {isStreaming ? (
            <Button
              onClick={onStop}
              size="icon"
              className="h-10 w-10 rounded-xl bg-destructive hover:bg-destructive/90 transition-all duration-200"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!input.trim()}
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all duration-200"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="text-center mt-3">
        <p className="text-xs text-muted-foreground">
          Learnpro AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
