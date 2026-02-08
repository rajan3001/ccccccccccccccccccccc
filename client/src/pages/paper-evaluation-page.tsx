import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Star,
  TrendingUp,
  BookOpen,
  PenLine,
  LayoutList,
  MessageCircle,
  Target,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";

const EXAM_OPTIONS = [
  { value: "UPSC", label: "UPSC" },
  { value: "JPSC", label: "JPSC (Jharkhand)" },
  { value: "BPSC", label: "BPSC (Bihar)" },
  { value: "JKPSC", label: "JKPSC (J&K)" },
  { value: "UPPSC", label: "UPPSC (UP)" },
  { value: "MPPSC", label: "MPPSC (MP)" },
  { value: "RPSC", label: "RPSC (Rajasthan)" },
  { value: "OPSC", label: "OPSC (Odisha)" },
  { value: "HPSC", label: "HPSC (Haryana)" },
  { value: "UKPSC", label: "UKPSC (Uttarakhand)" },
  { value: "HPPSC", label: "HPPSC (HP)" },
  { value: "APSC_Assam", label: "APSC (Assam)" },
  { value: "MeghalayaPSC", label: "Meghalaya PSC" },
  { value: "SikkimPSC", label: "Sikkim PSC" },
  { value: "TripuraPSC", label: "Tripura PSC" },
  { value: "ArunachalPSC", label: "Arunachal PSC" },
];

const EXAM_PAPER_TYPES: Record<string, { value: string; label: string }[]> = {
  UPSC: [
    { value: "GS-I", label: "GS Paper I (History, Culture, Geography)" },
    { value: "GS-II", label: "GS Paper II (Polity, Governance, IR)" },
    { value: "GS-III", label: "GS Paper III (Economy, S&T, Environment)" },
    { value: "GS-IV", label: "GS Paper IV (Ethics, Integrity, Aptitude)" },
    { value: "Essay", label: "Essay Paper" },
    { value: "Optional-I", label: "Optional Subject Paper I" },
    { value: "Optional-II", label: "Optional Subject Paper II" },
  ],
  JPSC: [
    { value: "Paper-II", label: "Paper II (Language & Literature)" },
    { value: "Paper-III", label: "Paper III (Social Sciences - History & Geography)" },
    { value: "Paper-IV", label: "Paper IV (Constitution, Polity & Governance)" },
    { value: "Paper-V", label: "Paper V (Economy, Globalization & Sustainable Dev)" },
    { value: "Paper-VI", label: "Paper VI (General Science, Environment & Tech)" },
  ],
  BPSC: [
    { value: "GS-I", label: "GS Paper I (Indian & Bihar History, Culture, Economy)" },
    { value: "GS-II", label: "GS Paper II (Polity, Economy, Science & Tech)" },
    { value: "Essay", label: "Essay Paper" },
  ],
  JKPSC: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I (Heritage, Culture, History, Geography)" },
    { value: "GS-II", label: "GS Paper II (Governance, Polity, Social Justice, IR)" },
    { value: "GS-III", label: "GS Paper III (Technology, Economy, Environment, Security)" },
    { value: "GS-IV", label: "GS Paper IV (Ethics, Integrity & Aptitude)" },
    { value: "Optional-I", label: "Optional Subject Paper I" },
    { value: "Optional-II", label: "Optional Subject Paper II" },
  ],
  UPPSC: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I (History, Culture)" },
    { value: "GS-II", label: "GS Paper II (Polity, Governance)" },
    { value: "GS-III", label: "GS Paper III (Economy, Science & Tech)" },
    { value: "GS-IV", label: "GS Paper IV (Ethics, Aptitude)" },
    { value: "GS-V", label: "GS Paper V (UP Specific)" },
    { value: "GS-VI", label: "GS Paper VI (UP Specific)" },
  ],
  MPPSC: [
    { value: "GS-I", label: "GS Paper I (History, Culture, Geography)" },
    { value: "GS-II", label: "GS Paper II (Constitution, Governance, Social Sector)" },
    { value: "GS-III", label: "GS Paper III (Economy, Science, Environment)" },
    { value: "GS-IV", label: "GS Paper IV (Ethics, Philosophy, Aptitude)" },
    { value: "GS-V", label: "GS Paper V (India & MP: Geography, Polity)" },
    { value: "GS-VI", label: "GS Paper VI (India & MP: Economy, Science)" },
  ],
  RPSC: [
    { value: "GS-I", label: "GS Paper I (History, Economics, Sociology)" },
    { value: "GS-II", label: "GS Paper II (Ethics, Science & Tech, Geography)" },
    { value: "GS-III", label: "GS Paper III (Polity, Public Admin, Law)" },
    { value: "GS-IV", label: "Paper IV (General Hindi & English)" },
  ],
  OPSC: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I (History, Culture, Geography, Society)" },
    { value: "GS-II", label: "GS Paper II (Constitution, Governance, IR)" },
    { value: "GS-III", label: "GS Paper III (Economy, S&T, Environment)" },
    { value: "GS-IV", label: "GS Paper IV (Ethics, Integrity & Aptitude)" },
    { value: "Optional-I", label: "Optional Subject Paper I" },
    { value: "Optional-II", label: "Optional Subject Paper II" },
  ],
  HPSC: [
    { value: "Paper-I", label: "Paper I (English)" },
    { value: "Paper-II", label: "Paper II (Hindi)" },
    { value: "GS", label: "Paper III (General Studies)" },
    { value: "Optional", label: "Paper IV (Optional Subject)" },
  ],
  UKPSC: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I (Heritage, Culture, History, Geography)" },
    { value: "GS-II", label: "GS Paper II (Governance, Polity, Social Justice, IR)" },
    { value: "GS-III", label: "GS Paper III (Technology, Economy, Environment)" },
    { value: "GS-IV", label: "GS Paper IV (Ethics, Integrity & Aptitude)" },
    { value: "GS-V", label: "GS Paper V (Uttarakhand Specific)" },
    { value: "GS-VI", label: "GS Paper VI (Uttarakhand Specific)" },
  ],
  HPPSC: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I (History, Culture, Geography)" },
    { value: "GS-II", label: "GS Paper II (Polity, Governance, Social Justice)" },
    { value: "GS-III", label: "GS Paper III (Economy, Science, Environment)" },
    { value: "Optional-I", label: "Optional Subject Paper I" },
    { value: "Optional-II", label: "Optional Subject Paper II" },
  ],
  APSC_Assam: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I" },
    { value: "GS-II", label: "GS Paper II" },
    { value: "GS-III", label: "GS Paper III" },
    { value: "GS-IV", label: "GS Paper IV" },
    { value: "GS-Assam", label: "GS Paper - Assam Specific" },
  ],
  MeghalayaPSC: [
    { value: "Essay", label: "Essay Paper" },
    { value: "GS-I", label: "GS Paper I" },
    { value: "GS-II", label: "GS Paper II" },
    { value: "GS-III", label: "GS Paper III" },
    { value: "GS-IV", label: "GS Paper IV" },
    { value: "Optional-I", label: "Optional Subject Paper I" },
    { value: "Optional-II", label: "Optional Subject Paper II" },
  ],
  SikkimPSC: [
    { value: "GS-I", label: "GS Paper I" },
    { value: "GS-II", label: "GS Paper II" },
    { value: "Essay", label: "Essay Paper" },
    { value: "Optional", label: "Optional Subject" },
  ],
  TripuraPSC: [
    { value: "GS-I", label: "GS Paper I" },
    { value: "GS-II", label: "GS Paper II" },
    { value: "Essay", label: "Essay Paper" },
    { value: "Optional", label: "Optional Subject" },
  ],
  ArunachalPSC: [
    { value: "GS-I", label: "GS Paper I" },
    { value: "GS-II", label: "GS Paper II" },
    { value: "Essay", label: "Essay Paper" },
    { value: "Optional", label: "Optional Subject" },
  ],
};

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
];

const MAX_SIZE = 20 * 1024 * 1024;

const COMPETENCY_ICONS: Record<string, any> = {
  "Content Competence": BookOpen,
  "Contextual Competence": Target,
  "Introduction Competence": PenLine,
  "Structured Presentation": LayoutList,
  "Language Competence": MessageCircle,
  "Conclusion Competence": CheckCircle2,
};

interface EvaluationQuestion {
  id: number;
  questionNumber: string;
  questionText: string;
  score: number;
  maxScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  introductionFeedback: string | null;
  bodyFeedback: string | null;
  conclusionFeedback: string | null;
}

interface CompetencyFeedback {
  name: string;
  strengths: string[];
  improvements: string[];
}

interface EvaluationSession {
  id: number;
  examType: string;
  paperType: string;
  fileName: string;
  status: string;
  totalScore: number | null;
  maxScore: number | null;
  overallFeedback: string | null;
  competencyFeedback: CompetencyFeedback[] | null;
  createdAt: string;
  questions?: EvaluationQuestion[];
}

export default function PaperEvaluationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("UPSC");
  const [paperType, setPaperType] = useState("GS-I");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const paperTypes = EXAM_PAPER_TYPES[examType] || EXAM_PAPER_TYPES.UPSC;

  const handleExamTypeChange = (value: string) => {
    setExamType(value);
    const newPaperTypes = EXAM_PAPER_TYPES[value] || EXAM_PAPER_TYPES.UPSC;
    setPaperType(newPaperTypes[0].value);
  };
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showCompetency, setShowCompetency] = useState(false);
  const [view, setView] = useState<"upload" | "result" | "history">("upload");

  const { uploadFile, isUploading, progress: uploadProgress } = useUpload();

  const { data: history } = useQuery<EvaluationSession[]>({
    queryKey: ["/api/evaluations"],
    refetchInterval: activeSessionId ? 3000 : false,
  });

  const { data: activeResult, isLoading: resultLoading } = useQuery<EvaluationSession>({
    queryKey: ["/api/evaluations", activeSessionId],
    enabled: !!activeSessionId,
    refetchInterval: (query) => {
      const data = query.state.data as EvaluationSession | undefined;
      return data?.status === "processing" ? 3000 : false;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { examType: string; paperType: string; fileName: string; fileObjectPath: string }) => {
      const res = await apiRequest("POST", "/api/evaluations", data);
      return res.json();
    },
    onSuccess: (data) => {
      setActiveSessionId(data.sessionId);
      setView("result");
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
    },
    onError: () => {
      toast({ title: "Failed to start evaluation", variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, JPG, PNG, or WebP file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 20MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    const result = await uploadFile(selectedFile);
    if (!result) {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      return;
    }

    submitMutation.mutate({
      examType,
      paperType,
      fileName: selectedFile.name,
      fileObjectPath: result.objectPath,
    });
  };

  const openResult = (session: EvaluationSession) => {
    setActiveSessionId(session.id);
    setView("result");
    setExpandedQuestion(null);
    setShowCompetency(false);
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (pct >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 70) return "bg-emerald-500/10";
    if (pct >= 50) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  const isProcessing = isUploading || submitMutation.isPending;
  const showResult = activeResult && activeResult.status !== "processing";

  const renderUploadView = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <PenLine className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold" data-testid="text-evaluation-heading">
          Answer Sheet Evaluation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload your answer sheet and get detailed AI evaluation as per exam norms
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Exam Type</label>
              <Select value={examType} onValueChange={handleExamTypeChange}>
                <SelectTrigger data-testid="select-exam-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Paper Type</label>
              <Select value={paperType} onValueChange={setPaperType}>
                <SelectTrigger data-testid="select-paper-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paperTypes.map((p: { value: string; label: string }) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              selectedFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                {selectedFile.type === "application/pdf" ? (
                  <FileText className="h-10 w-10 text-primary" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-primary" />
                )}
                <span className="font-medium text-sm" data-testid="text-file-name">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-xs text-primary">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="font-medium text-sm">Upload Answer Sheet</span>
                <span className="text-xs text-muted-foreground">
                  PDF, JPG, PNG or WebP (max 20MB)
                </span>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={isUploading ? uploadProgress : 100} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">
                {isUploading ? "Uploading file..." : "Starting evaluation..."}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!selectedFile || isProcessing}
            data-testid="button-evaluate"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Evaluate Answer Sheet
              </>
            )}
          </Button>
        </div>
      </Card>

      {history && history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" data-testid="text-history-heading">Previous Evaluations</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("history")} data-testid="button-view-all-history">
              View all
            </Button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map((session) => (
              <Card
                key={session.id}
                className="p-4 cursor-pointer hover-elevate"
                onClick={() => openResult(session)}
                data-testid={`card-evaluation-${session.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                      session.status === "completed" ? "bg-emerald-500/10" : session.status === "processing" ? "bg-amber-500/10" : "bg-red-500/10"
                    }`}>
                      {session.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : session.status === "processing" ? (
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{session.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {session.examType} {session.paperType} &middot; {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {session.status === "completed" && session.totalScore !== null && session.maxScore !== null && (
                    <Badge variant="secondary" className={getScoreColor(session.totalScore, session.maxScore)}>
                      {session.totalScore}/{session.maxScore}
                    </Badge>
                  )}
                  {session.status === "processing" && (
                    <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                      Processing
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderResultView = () => {
    if (resultLoading || !activeResult) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (activeResult.status === "processing") {
      return (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold mb-2" data-testid="text-processing">Evaluating your answers...</h2>
          <p className="text-sm text-muted-foreground">
            Our AI examiner is analyzing your answer sheet. This may take a minute.
          </p>
          <Progress value={60} className="mt-6 h-1.5" />
        </div>
      );
    }

    if (activeResult.status === "failed") {
      return (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-display font-bold mb-2">Evaluation Failed</h2>
          <p className="text-sm text-muted-foreground mb-4">{activeResult.overallFeedback}</p>
          <Button onClick={() => { setView("upload"); setSelectedFile(null); setActiveSessionId(null); }}>
            Try Again
          </Button>
        </div>
      );
    }

    const questions = activeResult.questions || [];
    const competencies = activeResult.competencyFeedback || [];

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => { setView("upload"); setActiveSessionId(null); }}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover-elevate rounded-md p-1 -ml-1"
          data-testid="button-back-to-upload"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
          <Card className={`flex-1 p-5 ${getScoreBgColor(activeResult.totalScore || 0, activeResult.maxScore || 250)}`} data-testid="card-overall-score">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overall Score</h2>
              <Badge variant="secondary">{activeResult.examType} {activeResult.paperType}</Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-display font-bold ${getScoreColor(activeResult.totalScore || 0, activeResult.maxScore || 250)}`} data-testid="text-total-score">
                {activeResult.totalScore?.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground font-medium">/ {activeResult.maxScore}</span>
            </div>
            <div className="mt-3">
              <Progress
                value={((activeResult.totalScore || 0) / (activeResult.maxScore || 250)) * 100}
                className="h-2"
              />
            </div>
          </Card>

          <Card className="flex-1 p-5" data-testid="card-file-info">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Evaluation Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File</span>
                <span className="font-medium truncate max-w-[200px]">{activeResult.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions Found</span>
                <span className="font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{new Date(activeResult.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        </div>

        {activeResult.overallFeedback && (
          <Card className="p-5 mb-6" data-testid="card-overall-feedback">
            <h2 className="text-base font-semibold mb-3">Overall Feedback</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{activeResult.overallFeedback}</ReactMarkdown>
            </div>
          </Card>
        )}

        {competencies.length > 0 && (
          <Card className="p-5 mb-6" data-testid="card-competency-feedback">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setShowCompetency(!showCompetency)}
              data-testid="button-toggle-competency"
            >
              <h2 className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Competency Analysis
              </h2>
              {showCompetency ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showCompetency && (
              <div className="mt-4 space-y-4">
                {competencies.map((comp) => {
                  const IconComp = COMPETENCY_ICONS[comp.name] || Star;
                  return (
                    <div key={comp.name} className="border border-border rounded-md p-4" data-testid={`competency-${comp.name.replace(/\s+/g, "-").toLowerCase()}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <IconComp className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">{comp.name}</h3>
                      </div>
                      {comp.strengths.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Strengths</span>
                          <ul className="mt-1 space-y-1">
                            {comp.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comp.improvements.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Areas for Improvement</span>
                          <ul className="mt-1 space-y-1">
                            {comp.improvements.map((imp, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                {imp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {questions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3" data-testid="text-questions-heading">Question-wise Evaluation</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {questions.map((q) => (
                <button
                  key={q.questionNumber}
                  onClick={() => setExpandedQuestion(expandedQuestion === q.questionNumber ? null : q.questionNumber)}
                  className={`flex items-center justify-between p-3 rounded-md border text-left ${
                    expandedQuestion === q.questionNumber
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`button-question-${q.questionNumber.replace(/\./g, "-").toLowerCase()}`}
                >
                  <span className="font-medium text-sm">{q.questionNumber}</span>
                  <span className={`font-bold text-sm ${getScoreColor(q.score, q.maxScore)}`}>
                    {q.score.toFixed(1)}/{q.maxScore}
                  </span>
                </button>
              ))}
            </div>

            {expandedQuestion && (() => {
              const q = questions.find((q) => q.questionNumber === expandedQuestion);
              if (!q) return null;
              return (
                <Card className="p-5" data-testid={`card-question-detail-${expandedQuestion.replace(/\./g, "-").toLowerCase()}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{q.questionNumber}</h3>
                      {q.questionText && (
                        <p className="text-sm text-muted-foreground mt-1">{q.questionText}</p>
                      )}
                    </div>
                    <div className={`text-right ${getScoreColor(q.score, q.maxScore)}`}>
                      <span className="text-2xl font-bold">{q.score.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">/{q.maxScore}</span>
                    </div>
                  </div>

                  {q.detailedFeedback && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Detailed Analysis</h4>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{q.detailedFeedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {q.strengths.length > 0 && (
                      <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
                        <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
                          Strengths
                        </h4>
                        <ul className="space-y-1.5">
                          {q.strengths.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {q.improvements.length > 0 && (
                      <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1.5">
                          {q.improvements.map((imp, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {(q.introductionFeedback || q.bodyFeedback || q.conclusionFeedback) && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      {q.introductionFeedback && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Introduction</h4>
                          <p className="text-sm">{q.introductionFeedback}</p>
                        </div>
                      )}
                      {q.bodyFeedback && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Body</h4>
                          <p className="text-sm">{q.bodyFeedback}</p>
                        </div>
                      )}
                      {q.conclusionFeedback && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Conclusion</h4>
                          <p className="text-sm">{q.conclusionFeedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderHistoryView = () => (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => setView("upload")}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover-elevate rounded-md p-1 -ml-1"
        data-testid="button-back-from-history"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-xl font-display font-bold mb-4" data-testid="text-all-evaluations-heading">All Evaluations</h1>
      {!history || history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No evaluations yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((session) => (
            <Card
              key={session.id}
              className="p-4 cursor-pointer hover-elevate"
              onClick={() => openResult(session)}
              data-testid={`card-history-${session.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                    session.status === "completed" ? "bg-emerald-500/10" : session.status === "processing" ? "bg-amber-500/10" : "bg-red-500/10"
                  }`}>
                    {session.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : session.status === "processing" ? (
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{session.fileName}</span>
                    <span className="text-xs text-muted-foreground">
                      {session.examType} {session.paperType} &middot; {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {session.status === "completed" && session.totalScore !== null && session.maxScore !== null && (
                  <Badge variant="secondary" className={getScoreColor(session.totalScore, session.maxScore)}>
                    {session.totalScore.toFixed(1)}/{session.maxScore}
                  </Badge>
                )}
                {session.status === "processing" && (
                  <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                    Processing
                  </Badge>
                )}
                {session.status === "failed" && (
                  <Badge variant="secondary" className="text-red-600 dark:text-red-400">
                    Failed
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6 sm:py-10">
          {view === "upload" && renderUploadView()}
          {view === "result" && renderResultView()}
          {view === "history" && renderHistoryView()}
        </div>
      </main>
    </div>
  );
}
