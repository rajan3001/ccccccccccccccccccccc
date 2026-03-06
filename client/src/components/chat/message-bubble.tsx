import { cn } from "@/lib/utils";
import { Message } from "@/hooks/use-chat";
import { Logo } from "@/components/ui/logo";
import { StyledMarkdown, StreamingMarkdown } from "@/components/ui/styled-markdown";
import { detectMCQContent } from "@/components/chat/chat-quiz-panel";
import { detectNoteType, NOTE_TYPE_FOLDERS, NOTE_TYPE_LABELS } from "@/components/notes/note-type-dialog";
import { User, Copy, Check, FileText, Image as ImageIcon, File, BookmarkPlus, FolderPlus, Download, Play, Target, StickyNote, ScrollText } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
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
      const noteType = detectNoteType(userQuery);
      if (noteType) {
        const topicPart = userQuery.split(":").slice(1).join(":").trim();
        title = `${NOTE_TYPE_LABELS[noteType]} — ${topicPart}`.slice(0, 80);
        setNoteFolder(NOTE_TYPE_FOLDERS[noteType]);
        setNoteTags(NOTE_TYPE_LABELS[noteType]);
      } else {
        title = userQuery.replace(/[#*_`]/g, "").trim().slice(0, 80);
        setNoteFolder("");
        setNoteTags("");
      }
    }
    title = title || "Untitled Note";
    setNoteTitle(title);
    setShowSaveDialog(true);
  };

  const attachments: AttachmentData[] = (message as any).attachments || [];

  const topicForPyq = !isUser && !isStreaming && userQuery ? userQuery.replace(/[#*_`]/g, "").trim().split(/\s+/).slice(0, 8).join(" ") : "";
  const { data: pyqMatches } = useQuery<{ id: number; examType: string; examStage: string; year: number; paperType: string; questionNumber: number; topic: string }[]>({
    queryKey: [`/api/pyq/matches?topic=${encodeURIComponent(topicForPyq)}`],
    enabled: !!topicForPyq && topicForPyq.length > 3,
    staleTime: 5 * 60 * 1000,
  });

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

          {!isUser && !isStreaming && pyqMatches && pyqMatches.length > 0 && (
            <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30" data-testid="pyq-asked-before-card">
              <div className="flex items-center gap-2 mb-2">
                <ScrollText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Asked before</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pyqMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/pyq?id=${match.id}`}
                    data-testid={`link-pyq-match-${match.id}`}
                  >
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 cursor-pointer hover-elevate">
                      {match.examType} {match.year} {match.examStage} Q.{match.questionNumber}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-save-note">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <StickyNote className="h-4 w-4 text-primary" />
              </div>
              Save as Note
            </DialogTitle>
            <DialogDescription>
              Organize this response in your notes library for revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Title</label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Cooperative Federalism — Key Concepts"
                className="font-medium"
                data-testid="input-note-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject</label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  Folder
                  {!showNewFolderInput && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-[10px] font-bold normal-case tracking-normal"
                      onClick={() => setShowNewFolderInput(true)}
                      data-testid="button-create-folder"
                    >
                      + New
                    </Button>
                  )}
                </label>
                {showNewFolderInput ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      autoFocus
                      className="text-sm"
                      data-testid="input-new-folder"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}
                      data-testid="button-cancel-folder"
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <Select value={noteFolder || "none"} onValueChange={(v) => setNoteFolder(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-note-folder">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {(existingFolders || []).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tags</label>
              <Input
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="e.g. polity, federalism, governance"
                className="text-sm"
                data-testid="input-note-tags"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Separate multiple tags with commas</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
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
