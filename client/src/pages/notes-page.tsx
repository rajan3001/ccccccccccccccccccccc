import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNotes, useNoteFolders, useNoteTags, useUpdateNote, useDeleteNote, useReviewNote, useDueNotesCount } from "@/hooks/use-notes";
import { generatePDF, noteToPDFSections } from "@/lib/pdf-generator";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  BookOpen,
  FolderOpen,
  Tag,
  ArrowLeft,
  Edit3,
  Trash2,
  Download,
  FileDown,
  Clock,
  CheckCircle2,
  StickyNote,
  Bell,
  Filter,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Note } from "@shared/models/notes";

const SUBJECT_OPTIONS = [
  { value: "all", label: "All Subjects" },
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

const SUBJECT_COLORS: Record<string, string> = {
  "History": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Geography": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Polity": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Economics": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Science": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Environment": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  "Ethics": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "International Relations": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "Society": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Art & Culture": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Current Affairs": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Essay": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Mathematics": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Reasoning": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "English": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "General Knowledge": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Other": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export default function NotesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [view, setView] = useState<"list" | "detail" | "edit">("list");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("none");
  const [editTags, setEditTags] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [showNewEditFolder, setShowNewEditFolder] = useState(false);
  const [newEditFolderName, setNewEditFolderName] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filters: any = {};
  if (searchQuery) filters.search = searchQuery;
  if (subjectFilter !== "all") filters.gsCategory = subjectFilter;
  if (folderFilter !== "all") filters.folder = folderFilter;
  if (tagFilter !== "all") filters.tag = tagFilter;
  if (showDueOnly) filters.dueForReview = true;

  const { data: notes, isLoading } = useNotes(filters);
  const { data: folders } = useNoteFolders();
  const { data: tags } = useNoteTags();
  const { data: dueCount } = useDueNotesCount();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const reviewNote = useReviewNote();

  const openDetail = (note: Note) => {
    setSelectedNote(note);
    setView("detail");
  };

  const startEdit = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditSubject(note.gsCategory || "none");
    setEditTags(((note.tags as string[]) || []).join(", "));
    setEditFolder(note.folder || "");
    setShowNewEditFolder(false);
    setNewEditFolderName("");
    setView("edit");
  };

  const handleSaveEdit = () => {
    if (!selectedNote) return;
    const tagsArr = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    const folderValue = showNewEditFolder ? newEditFolderName.trim() : editFolder;
    updateNote.mutate({
      id: selectedNote.id,
      title: editTitle,
      content: editContent,
      gsCategory: editSubject === "none" ? null : editSubject,
      tags: tagsArr,
      folder: folderValue || null,
    }, {
      onSuccess: (updated: Note) => {
        setSelectedNote(updated);
        setView("detail");
        toast({ title: "Note updated" });
      },
      onError: () => toast({ title: "Failed to update note", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteNote.mutate(id, {
      onSuccess: () => {
        setView("list");
        setSelectedNote(null);
        toast({ title: "Note deleted" });
      },
    });
  };

  const handleReview = (id: number) => {
    reviewNote.mutate(id, {
      onSuccess: (updated: Note) => {
        setSelectedNote(updated);
        toast({ title: "Marked as reviewed! Next review scheduled." });
      },
    });
  };

  const handleExportPDF = async (note: Note) => {
    try {
      const sections = noteToPDFSections({
        title: note.title,
        content: note.content,
        gsCategory: note.gsCategory,
        tags: (note.tags as string[]) || [],
      });
      await generatePDF({
        title: note.title,
        subtitle: `Learnpro AI Note - ${new Date(note.createdAt).toLocaleDateString("en-IN")}`,
        sections,
        fileName: `learnpro-note-${note.id}.pdf`,
      });
      toast({ title: "PDF downloaded" });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const handleExportMarkdown = (note: Note) => {
    const md = `# ${note.title}\n\n${note.gsCategory ? `**Category:** ${note.gsCategory}\n` : ""}${((note.tags as string[]) || []).length > 0 ? `**Tags:** ${(note.tags as string[]).join(", ")}\n` : ""}\n---\n\n${note.content}\n\n---\n*Exported from Learnpro AI on ${new Date().toLocaleDateString("en-IN")}*`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `learnpro-note-${note.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Markdown exported" });
  };

  const isDue = (note: Note) => note.nextReviewAt && new Date(note.nextReviewAt) <= new Date();

  const renderListView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold" data-testid="text-notes-heading">
              My Notes
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Your saved study notes from AI conversations
            </p>
          </div>
          {dueCount && dueCount.count > 0 && (
            <Button
              variant={showDueOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDueOnly(!showDueOnly)}
              data-testid="button-due-for-review"
            >
              <Bell className="h-4 w-4 mr-1.5" />
              {dueCount.count} due
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-notes"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger data-testid="select-subject-filter">
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Folder</label>
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger data-testid="select-folder-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {(folders || []).map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tag</label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger data-testid="select-tag-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {(tags || []).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !notes || notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <StickyNote className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery || subjectFilter !== "all" || folderFilter !== "all" || tagFilter !== "all" || showDueOnly
              ? "No matching notes found"
              : "No notes yet"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {searchQuery || subjectFilter !== "all"
              ? "Try adjusting your filters or search query."
              : "Save AI responses from your chat conversations as notes to build your study library."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={cn(
                "p-4 cursor-pointer hover-elevate",
                isDue(note) && "border-amber-300 dark:border-amber-700"
              )}
              onClick={() => openDetail(note)}
              data-testid={`card-note-${note.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium truncate" data-testid={`text-note-title-${note.id}`}>
                      {note.title}
                    </span>
                    {isDue(note) && (
                      <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                        <Bell className="h-3 w-3 mr-1" />
                        Due for review
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {note.gsCategory && (
                      <Badge variant="secondary" className={cn("text-xs", SUBJECT_COLORS[note.gsCategory] || "")}>
                        {note.gsCategory}
                      </Badge>
                    )}
                    {note.folder && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {note.folder}
                      </span>
                    )}
                    {((note.tags as string[]) || []).slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {note.content.replace(/[#*_]/g, "").slice(0, 150)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(note.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetailView = () => {
    if (!selectedNote) return null;
    const noteTags = (selectedNote.tags as string[]) || [];

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={() => { setView("list"); setSelectedNote(null); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover-elevate rounded-md p-1 -ml-1"
            data-testid="button-back-to-notes"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-1 flex-wrap">
            {isDue(selectedNote) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleReview(selectedNote.id)}
                disabled={reviewNote.isPending}
                data-testid="button-mark-reviewed"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Mark Reviewed
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => startEdit(selectedNote)} data-testid="button-edit-note">
              <Edit3 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExportPDF(selectedNote)} data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExportMarkdown(selectedNote)} data-testid="button-export-md">
              <FileDown className="h-4 w-4 mr-1.5" />
              MD
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-delete-note">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this note.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(selectedNote.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card className="p-6" data-testid="card-note-detail">
          <h1 className="text-xl font-display font-bold mb-3" data-testid="text-note-detail-title">
            {selectedNote.title}
          </h1>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {selectedNote.gsCategory && (
              <Badge variant="secondary" className={SUBJECT_COLORS[selectedNote.gsCategory] || ""}>
                {selectedNote.gsCategory}
              </Badge>
            )}
            {selectedNote.folder && (
              <Badge variant="outline" className="text-xs">
                <FolderOpen className="h-3 w-3 mr-1" />
                {selectedNote.folder}
              </Badge>
            )}
            {noteTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 border-b border-border pb-3">
            <span>Created: {new Date(selectedNote.createdAt).toLocaleDateString("en-IN")}</span>
            <span>Updated: {new Date(selectedNote.updatedAt).toLocaleDateString("en-IN")}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Reviews: {selectedNote.reviewCount}
            </span>
            {selectedNote.nextReviewAt && (
              <span className={cn(
                "flex items-center gap-1",
                isDue(selectedNote) ? "text-amber-600 dark:text-amber-400 font-medium" : ""
              )}>
                <Bell className="h-3 w-3" />
                Next: {new Date(selectedNote.nextReviewAt).toLocaleDateString("en-IN")}
              </span>
            )}
          </div>

          <div className="prose prose-stone dark:prose-invert max-w-none" data-testid="text-note-content">
            <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
          </div>
        </Card>
      </div>
    );
  };

  const renderEditView = () => {
    if (!selectedNote) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setView("detail")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover-elevate rounded-md p-1 -ml-1"
            data-testid="button-back-to-detail"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("detail")}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={updateNote.isPending} data-testid="button-save-edit">
              {updateNote.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card className="p-6" data-testid="card-note-edit">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title..."
                data-testid="input-edit-title"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Subject</label>
                <Select value={editSubject} onValueChange={setEditSubject}>
                  <SelectTrigger data-testid="select-edit-subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subject</SelectItem>
                    {SUBJECT_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tags</label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="history, polity (comma separated)"
                  data-testid="input-edit-tags"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Folder</label>
                {showNewEditFolder ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newEditFolderName}
                      onChange={(e) => setNewEditFolderName(e.target.value)}
                      placeholder="New folder name..."
                      autoFocus
                      data-testid="input-new-edit-folder"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowNewEditFolder(false); setNewEditFolderName(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={editFolder || "none"} onValueChange={(v) => setEditFolder(v === "none" ? "" : v)}>
                      <SelectTrigger data-testid="select-edit-folder" className="flex-1">
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {(folders || []).map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewEditFolder(true)}
                      data-testid="button-create-edit-folder"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Content (Markdown supported)</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                data-testid="textarea-edit-content"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Preview</label>
              <Card className="p-4">
                <div className="prose prose-stone dark:prose-invert max-w-none prose-sm">
                  <ReactMarkdown>{editContent}</ReactMarkdown>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6 sm:py-10">
          {view === "list" && renderListView()}
          {view === "detail" && renderDetailView()}
          {view === "edit" && renderEditView()}
        </div>
      </main>
    </div>
  );
}
