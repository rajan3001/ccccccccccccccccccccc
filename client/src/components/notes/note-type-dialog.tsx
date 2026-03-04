import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, BookOpen, GraduationCap, Layers, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type NoteType = "short" | "detailed" | "class" | "revision";

interface NoteTypeOption {
  type: NoteType;
  icon: typeof FileText;
  title: string;
  description: string;
  color: string;
  bg: string;
}

const NOTE_TYPES: NoteTypeOption[] = [
  {
    type: "short",
    icon: FileText,
    title: "Short Notes",
    description: "Concise bullet-point summary for quick understanding",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    type: "detailed",
    icon: BookOpen,
    title: "Detailed Academic Notes",
    description: "Comprehensive, in-depth coverage for exam preparation",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    type: "class",
    icon: GraduationCap,
    title: "Class Notes (1000-1200 words)",
    description: "Classroom-style notes with examples and explanations",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    type: "revision",
    icon: Layers,
    title: "Quick Revision Cards",
    description: "Flashcard-style key points for last-minute revision",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  short: "Short Notes",
  detailed: "Detailed Academic Notes",
  class: "Class Notes",
  revision: "Quick Revision Cards",
};

export const NOTE_TYPE_FOLDERS: Record<NoteType, string> = {
  short: "Short Notes",
  detailed: "Academic Notes",
  class: "Class Notes",
  revision: "Revision Cards",
};

export function buildNotePrompt(type: NoteType, topic: string): string {
  const prefixes: Record<NoteType, string> = {
    short: "Generate Short Notes on:",
    detailed: "Generate Detailed Academic Notes on:",
    class: "Generate Class Notes on:",
    revision: "Generate Quick Revision Cards on:",
  };
  return `${prefixes[type]} ${topic}`;
}

export function detectNoteType(message: string): NoteType | null {
  const lower = message.toLowerCase();
  if (lower.startsWith("generate short notes on:")) return "short";
  if (lower.startsWith("generate detailed academic notes on:")) return "detailed";
  if (lower.startsWith("generate class notes on:")) return "class";
  if (lower.startsWith("generate quick revision cards on:")) return "revision";
  return null;
}

interface NoteTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (type: NoteType, topic: string) => void;
}

export function NoteTypeDialog({ open, onOpenChange, onGenerate }: NoteTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<NoteType | null>(null);
  const [topic, setTopic] = useState("");

  const handleGenerate = () => {
    if (!selectedType || !topic.trim()) return;
    onGenerate(selectedType, topic.trim());
    setSelectedType(null);
    setTopic("");
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSelectedType(null);
      setTopic("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="dialog-note-type">
        <DialogHeader>
          <DialogTitle>{selectedType ? "Enter Topic" : "What kind of notes?"}</DialogTitle>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid grid-cols-1 gap-2 mt-1" data-testid="note-type-options">
            {NOTE_TYPES.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setSelectedType(opt.type)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-left transition-all",
                  "hover:border-primary/40 hover:shadow-sm hover:bg-primary/5 cursor-pointer"
                )}
                data-testid={`button-note-type-${opt.type}`}
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0", opt.bg)}>
                  <opt.icon className={cn("h-5 w-5", opt.color)} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{opt.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{opt.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-auto" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border">
              {(() => {
                const opt = NOTE_TYPES.find((o) => o.type === selectedType)!;
                return (
                  <>
                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0", opt.bg)}>
                      <opt.icon className={cn("h-4 w-4", opt.color)} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{opt.title}</span>
                  </>
                );
              })()}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Article 370, Fundamental Rights, GST..."
                data-testid="input-note-topic"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topic.trim()) handleGenerate();
                }}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedType(null)}
                className="gap-1.5"
                data-testid="button-note-back"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="flex-1 gap-1.5"
                data-testid="button-generate-notes"
              >
                Generate Notes
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
