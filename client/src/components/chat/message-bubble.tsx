import { cn } from "@/lib/utils";
import { Message } from "@/hooks/use-chat";
import { Logo } from "@/components/ui/logo";
import { StyledMarkdown, StreamingMarkdown } from "@/components/ui/styled-markdown";
import { detectMCQContent } from "@/components/chat/chat-quiz-panel";
import { User, Copy, Check, FileText, Image as ImageIcon, File, BookmarkPlus, FolderPlus, Download, Play, Target } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generatePDF, chatMessageToPDFSections } from "@/lib/pdf-generator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttachmentData {
  name: string;
  type: string;
  objectPath: string;
  size: number;
}

interface MessageBubbleProps {
  message: Partial<Message>;
  isStreaming?: boolean;
  conversationId?: number;
  userQuery?: string;
  onStartQuiz?: (content: string) => void;
}

const SUBJECT_OPTIONS = [
  { value: "none", label: "No subject" },
  { value: "History", label: "History" },
  { value: "Geography", label: "Geography" },
  { value: "Polity", label: "Polity & Governance" },
  { value: "Economics", label: "Economics" },
  { value: "Science", label: "Science & Technology" },
  { value: "Environment", label: "Environment & Ecology" },
  { value: "Ethics", label: "Ethics & Integrity" },
  { value: "International Relations", label: "International Relations" },
  { value: "Society", label: "Society & Social Issues" },
  { value: "Art & Culture", label: "Art & Culture" },
  { value: "Current Affairs", label: "Current Affairs" },
  { value: "Essay", label: "Essay" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Reasoning", label: "Reasoning & Aptitude" },
  { value: "English", label: "English Language" },
  { value: "General Knowledge", label: "General Knowledge" },
  { value: "Other", label: "Other" },
];

export function MessageBubble({ message, isStreaming, conversationId, userQuery, onStartQuiz }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubject, setNoteSubject] = useState("none");
  const [noteTags, setNoteTags] = useState("");
  const [noteFolder, setNoteFolder] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingFolders } = useQuery<string[]>({
    queryKey: ["/api/notes/folders"],
    enabled: showSaveDialog,
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/notes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Note saved successfully" });
      setShowSaveDialog(false);
      setNoteTitle("");
      setNoteSubject("none");
      setNoteTags("");
      setNoteFolder("");
      setShowNewFolderInput(false);
      setNewFolderName("");
    },
    onError: () => {
      toast({ title: "Failed to save note", variant: "destructive" });
    },
  });

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (!message.content) return;
    try {
      const firstLine = message.content.split("\n")[0].replace(/[#*_]/g, "").trim().slice(0, 60);
      const title = firstLine || "AI Response";
      const sections = chatMessageToPDFSections(message.content);
      await generatePDF({
        title,
        subtitle: `Learnpro AI - ${new Date().toLocaleDateString("en-IN")}`,
        sections,
        fileName: `learnpro-response-${Date.now()}.pdf`,
      });
      toast({ title: "PDF downloaded successfully" });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const handleSaveNote = () => {
    const firstLine = (message.content || "").split("\n")[0].slice(0, 100);
    const title = noteTitle.trim() || firstLine || "Untitled Note";
    const tags = noteTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    saveNoteMutation.mutate({
      title,
      content: message.content || "",
      gsCategory: noteSubject === "none" ? null : noteSubject,
      tags,
      folder: (showNewFolderInput ? newFolderName.trim() : noteFolder) || null,
      sourceMessageId: (message as any).id || null,
      sourceConversationId: conversationId || null,
    });
  };

  const openSaveDialog = () => {
    let title = "";
    if (userQuery) {
      title = userQuery.replace(/[#*_`]/g, "").trim().slice(0, 80);
    }
    title = title || "Untitled Note";
    setNoteTitle(title);
    setShowSaveDialog(true);
  };

  const attachments: AttachmentData[] = (message as any).attachments || [];

  const hasMCQ = !isUser && !isStreaming && !!message.content && detectMCQContent(message.content);

  const mcqCount = hasMCQ
    ? (message.content!.match(/\*\*(?:Question|Q)\s*\d+/gi) || []).length
    : 0;

  const mcqIntroText = hasMCQ
    ? (() => {
        const firstQMatch = message.content!.search(/\*\*(?:Question|Q)\s*\d+/i);
        if (firstQMatch > 0) {
          return message.content!.substring(0, firstQMatch).trim();
        }
        return `Here are ${mcqCount} practice MCQs for you.`;
      })()
    : "";

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type === "application/pdf") return FileText;
    return File;
  };

  return (
    <>
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
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-semibold text-foreground/80">
              {isUser ? "You" : "Learnpro Assistant"}
            </span>
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

          <div className="max-w-none">
            {message.content ? (
              isStreaming ? (
                <div className="streaming-text">
                  <StreamingMarkdown content={message.content} />
                  <span className="inline-block w-1.5 h-5 ml-0.5 bg-primary rounded-sm align-middle streaming-cursor" />
                </div>
              ) : hasMCQ ? (
                <div>
                  <StyledMarkdown>{mcqIntroText}</StyledMarkdown>
                  <div className="mt-4 p-4 rounded-md border-2 border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{mcqCount} MCQs Ready</p>
                        <p className="text-xs text-muted-foreground">Take the quiz to test your knowledge</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => onStartQuiz?.(message.content!)}
                      className="w-full gap-2"
                      data-testid="button-start-quiz"
                    >
                      <Play className="h-4 w-4" />
                      Start Quiz
                    </Button>
                  </div>
                </div>
              ) : (
                <StyledMarkdown>{message.content}</StyledMarkdown>
              )
            ) : (
              isStreaming && (
                <div className="flex items-center gap-1.5">
                  <span className="streaming-dot" style={{ animationDelay: "0ms" }} />
                  <span className="streaming-dot" style={{ animationDelay: "150ms" }} />
                  <span className="streaming-dot" style={{ animationDelay: "300ms" }} />
                </div>
              )
            )}
          </div>

          {!isUser && !isStreaming && message.content && !hasMCQ && (
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50 flex-wrap" data-testid="message-action-bar">
              <Button
                variant="ghost"
                size="sm"
                onClick={openSaveDialog}
                data-testid="button-save-note"
                className="text-muted-foreground"
              >
                <BookmarkPlus className="h-4 w-4 mr-1.5" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                data-testid="button-copy-message"
                className="text-muted-foreground"
              >
                {copied ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadPDF}
                data-testid="button-download-message-pdf"
                className="text-muted-foreground"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download as PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-save-note">
          <DialogHeader>
            <DialogTitle>Save as Note</DialogTitle>
            <DialogDescription>
              Save this AI response to your notes library for future revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                data-testid="input-note-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <Select value={noteSubject} onValueChange={setNoteSubject}>
                <SelectTrigger data-testid="select-note-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags</label>
              <Input
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="history, polity, economics (comma separated)"
                data-testid="input-note-tags"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Folder</label>
              {showNewFolderInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name..."
                    autoFocus
                    data-testid="input-new-folder"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={noteFolder || "none"} onValueChange={(v) => setNoteFolder(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-note-folder" className="flex-1">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {(existingFolders || []).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewFolderInput(true)}
                    data-testid="button-create-folder"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={saveNoteMutation.isPending}
              data-testid="button-confirm-save-note"
            >
              {saveNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
