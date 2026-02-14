import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Paperclip, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface FileAttachment {
  file: File;
  preview?: string;
  objectPath?: string;
  uploadURL?: string;
  uploaded: boolean;
  uploading: boolean;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: { name: string; type: string; objectPath: string; size: number }[]) => void;
  isStreaming: boolean;
  onStop: () => void;
  placeholder?: string;
}

export function ChatInput({ onSend, isStreaming, onStop, placeholder = "Ask anything about UPSC, History, Polity..." }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isUploading) {
        handleSubmit();
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;

    e.preventDefault();

    for (const item of imageItems) {
      const blob = item.getAsFile();
      if (!blob) continue;

      const ext = blob.type.split("/")[1] || "png";
      const fileName = `pasted-image-${Date.now()}.${ext}`;
      const file = new window.File([blob], fileName, { type: blob.type });

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: "Pasted image exceeds the 10 MB limit.",
          variant: "destructive",
        });
        continue;
      }

      const attachment: FileAttachment = {
        file,
        preview: URL.createObjectURL(blob),
        uploaded: false,
        uploading: true,
      };

      setAttachments(prev => [...prev, attachment]);

      try {
        const urlRes = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fileName,
            size: file.size,
            contentType: file.type,
          }),
        });

        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = await urlRes.json();

        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        setAttachments(prev =>
          prev.map(a =>
            a.file === file
              ? { ...a, uploaded: true, uploading: false, objectPath, uploadURL }
              : a
          )
        );
      } catch (error) {
        console.error("Paste upload failed:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload pasted image. Please try again.",
          variant: "destructive",
        });
        setAttachments(prev => prev.filter(a => a.file !== file));
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "text/plain", "text/csv", "text/markdown",
    ];

    const maxSize = 10 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `"${file.name}" is not supported. Use images, PDFs, or text files.`,
          variant: "destructive",
        });
        continue;
      }
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the 10 MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      const attachment: FileAttachment = {
        file,
        uploaded: false,
        uploading: true,
      };

      if (file.type.startsWith("image/")) {
        attachment.preview = URL.createObjectURL(file);
      }

      setAttachments(prev => [...prev, attachment]);

      try {
        const urlRes = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type,
          }),
        });

        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = await urlRes.json();

        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        setAttachments(prev =>
          prev.map(a =>
            a.file === file
              ? { ...a, uploaded: true, uploading: false, objectPath, uploadURL }
              : a
          )
        );
      } catch (error) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload "${file.name}". Please try again.`,
          variant: "destructive",
        });
        setAttachments(prev => prev.filter(a => a.file !== file));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const removed = prev[index];
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type === "application/pdf") return FileText;
    return File;
  };

  const handleSubmit = () => {
    if (isUploading) {
      toast({
        title: "Please wait",
        description: "Files are still uploading. Please wait a moment before sending.",
      });
      return;
    }

    const hasContent = input.trim();
    const hasAttachments = attachments.some(a => a.uploaded);
    if (!hasContent && !hasAttachments) return;

    const uploadedAttachments = attachments
      .filter(a => a.uploaded && a.objectPath)
      .map(a => ({
        name: a.file.name,
        type: a.file.type,
        objectPath: a.objectPath!,
        size: a.file.size,
      }));

    onSend(input || "(See attached files)", uploadedAttachments.length > 0 ? uploadedAttachments : undefined);
    setInput("");
    attachments.forEach(a => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const isUploading = attachments.some(a => a.uploading);

  return (
    <div className="relative max-w-3xl mx-auto w-full px-2 py-2 sm:p-4">
      <div className="relative flex flex-col bg-background border-2 border-primary/20 rounded-2xl shadow-lg shadow-primary/5 focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all duration-300">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((att, i) => {
              const Icon = getFileIcon(att.file.type);
              return (
                <div
                  key={i}
                  data-testid={`attachment-preview-${i}`}
                  className={cn(
                    "relative group/att flex items-center gap-2 rounded-lg border p-2 pr-8 text-sm",
                    att.uploading ? "border-primary/30 bg-primary/5 animate-pulse" : "border-border bg-muted/50"
                  )}
                >
                  {att.preview ? (
                    <img
                      src={att.preview}
                      alt={att.file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate max-w-[120px] text-xs font-medium">{att.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {att.uploading ? "Uploading..." : `${(att.file.size / 1024).toFixed(0)} KB`}
                    </span>
                  </div>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-muted flex items-center justify-center visibility-hidden group-hover/att:visibility-visible"
                    data-testid={`remove-attachment-${i}`}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-end gap-2 p-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,text/markdown"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="flex-shrink-0 text-muted-foreground"
            data-testid="button-attach-file"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="min-h-[50px] max-h-[200px] w-full resize-none border-0 bg-transparent py-3 px-2 focus-visible:ring-0 text-base"
            data-testid="input-chat-message"
          />
          <div className="pb-2 pr-1">
            {isStreaming ? (
              <Button
                onClick={onStop}
                size="icon"
                data-testid="button-stop-stream"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={(!input.trim() && !attachments.some(a => a.uploaded)) || isUploading}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
