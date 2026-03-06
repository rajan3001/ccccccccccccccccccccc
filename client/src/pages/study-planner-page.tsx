import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { useSubscription } from "@/hooks/use-subscription";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/i18n/context";
import { InlineLanguageButton } from "@/components/inline-language-button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  BookOpen,
  Target,
  BarChart3,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTimetable,
  useCreateSlot,
  useDeleteSlot,
  useSyllabus,
  useToggleSyllabusTopic,
  useDailyGoals,
  useCreateGoal,
  useToggleGoal,
  useDeleteGoal,
  usePlannerDashboard,
  useAIGenerateTimetable,
  useAIGenerateGoals,
} from "@/hooks/use-study-planner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EXAM_LABELS: Record<string, string> = {
  UPSC: "UPSC",
  JPSC: "JPSC (Jharkhand)",
  BPSC: "BPSC (Bihar)",
  JKPSC: "JKPSC (J&K)",
  UPPSC: "UPPSC (Uttar Pradesh)",
  MPPSC: "MPPSC (Madhya Pradesh)",
  RPSC: "RPSC (Rajasthan)",
  OPSC: "OPSC (Odisha)",
  HPSC: "HPSC (Haryana)",
  UKPSC: "UKPSC (Uttarakhand)",
  HPPSC: "HPPSC (Himachal Pradesh)",
  APSC_Assam: "APSC (Assam)",
  MeghalayaPSC: "Meghalaya PSC",
  SikkimPSC: "Sikkim PSC",
  TripuraPSC: "Tripura PSC",
  ArunachalPSC: "Arunachal PSC",
};

const PAPER_COLORS_LIST = [
  "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
];

const BAR_COLORS_LIST = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
];

function getPaperColor(index: number) {
  return PAPER_COLORS_LIST[index % PAPER_COLORS_LIST.length];
}

function getBarColor(index: number) {
  return BAR_COLORS_LIST[index % BAR_COLORS_LIST.length];
}

function ExamSelector({ selectedExam, onExamChange, userExams }: { selectedExam: string; onExamChange: (exam: string) => void; userExams: string[] }) {
  const exams = userExams.length > 0 ? userExams : ["UPSC"];

  if (exams.length === 1) {
    return (
      <Badge variant="outline" className="text-sm" data-testid="badge-current-exam">
        {EXAM_LABELS[exams[0]] || exams[0]}
      </Badge>
    );
  }

  return (
    <Select value={selectedExam} onValueChange={onExamChange}>
      <SelectTrigger className="w-auto min-w-[180px]" data-testid="select-exam-type">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {exams.map((exam) => (
          <SelectItem key={exam} value={exam} data-testid={`option-exam-${exam}`}>
            {EXAM_LABELS[exam] || exam}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TimetableTab({ userExams }: { userExams: string[] }) {
  const { t } = useLanguage();
  const { data: slots, isLoading } = useTimetable();
  const createSlot = useCreateSlot();
  const deleteSlot = useDeleteSlot();
  const aiGenerate = useAIGenerateTimetable();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    gsPaper: "General Studies",
    subject: "",
  });

  const handleCreate = () => {
    if (!form.subject.trim()) {
      toast({ title: t.planner.enterSubject, variant: "destructive" });
      return;
    }
    createSlot.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00", gsPaper: "General Studies", subject: "" });
        toast({ title: t.planner.slotAdded });
      },
    });
  };

  const handleAIGenerate = () => {
    aiGenerate.mutate({ targetExams: userExams }, {
      onSuccess: () => {
        toast({ title: t.planner.timetableCreated, description: t.planner.timetableCreatedDesc });
      },
      onError: (err) => {
        toast({ title: t.planner.failedToGenerate, description: err.message, variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-timetable-heading">{t.planner.weeklyTimetable}</h3>
          <p className="text-sm text-muted-foreground">{t.planner.planSchedule}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleAIGenerate} disabled={aiGenerate.isPending} data-testid="button-ai-generate-timetable">
            {aiGenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {aiGenerate.isPending ? t.planner.generatingTimetable : t.planner.aiGenerate}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-slot">
                <Plus className="h-4 w-4 mr-1.5" />
                {t.planner.addSlot}
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.planner.addStudySlot}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.planner.day}</label>
                <Select value={String(form.dayOfWeek)} onValueChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v) })}>
                  <SelectTrigger data-testid="select-day"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">{t.planner.startTime}</label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} data-testid="input-start-time" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">{t.planner.endTime}</label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} data-testid="input-end-time" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.planner.paperCategory}</label>
                <Input placeholder="e.g. GS Paper I, Bihar Special" value={form.gsPaper} onChange={(e) => setForm({ ...form, gsPaper: e.target.value })} data-testid="input-gs-paper" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.planner.subjectTopic}</label>
                <Input placeholder="e.g. Modern Indian History" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="input-subject" />
              </div>
              <Button onClick={handleCreate} disabled={createSlot.isPending} className="w-full" data-testid="button-save-slot">
                {createSlot.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {t.planner.saveSlot}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {DAYS.map((day, dayIdx) => {
          const daySlots = slots?.filter((s: any) => s.dayOfWeek === dayIdx) || [];
          if (daySlots.length === 0) return null;
          return (
            <Card key={dayIdx} className="p-4">
              <h4 className="font-semibold text-sm mb-3">{day}</h4>
              <div className="space-y-2">
                {daySlots.map((slot: any) => (
                  <div key={slot.id} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/40" data-testid={`slot-${slot.id}`}>
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium min-w-[100px]">{slot.startTime} - {slot.endTime}</span>
                    <Badge variant="outline" className="text-xs">{slot.gsPaper}</Badge>
                    <span className="text-sm flex-1">{slot.subject}</span>
                    <Button size="icon" variant="ghost" onClick={() => deleteSlot.mutate(slot.id)} data-testid={`button-delete-slot-${slot.id}`}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {(!slots || slots.length === 0) && (
          <Card className="p-8 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">{t.planner.noSlots}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function SyllabusTab({ selectedExam, onExamChange, userExams }: { selectedExam: string; onExamChange: (e: string) => void; userExams: string[] }) {
  const { t } = useLanguage();
  const { data: topics, isLoading } = useSyllabus(selectedExam);
  const toggleTopic = useToggleSyllabusTopic(selectedExam);
  const [expandedPapers, setExpandedPapers] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [lastExam, setLastExam] = useState(selectedExam);
  const [initialized, setInitialized] = useState(false);

  const uniqueTopicNames = useMemo(() => {
    if (!topics) return "";
    const names = new Set<string>();
    for (const tp of topics) {
      if (tp.parentTopic !== null && tp.topic) {
        names.add(tp.topic);
      }
    }
    return Array.from(names).slice(0, 50).join(",");
  }, [topics]);

  const { data: pyqTopicCounts } = useQuery<Record<string, number>>({
    queryKey: [`/api/pyq/topic-counts?topics=${encodeURIComponent(uniqueTopicNames)}`],
    enabled: !!uniqueTopicNames && uniqueTopicNames.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (selectedExam !== lastExam) {
      setExpandedPapers({});
      setExpandedSections({});
      setLastExam(selectedExam);
      setInitialized(false);
    }
  }, [selectedExam, lastExam]);

  const grouped: Record<string, any[]> = {};
  for (const t of topics || []) {
    if (!grouped[t.gsPaper]) grouped[t.gsPaper] = [];
    grouped[t.gsPaper].push(t);
  }

  const paperNames = Object.keys(grouped);
  const firstPaper = paperNames[0];

  useEffect(() => {
    if (firstPaper && !initialized) {
      setExpandedPapers({ [firstPaper]: true });
      setInitialized(true);
    }
  }, [firstPaper, initialized]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-syllabus-heading">
            {EXAM_LABELS[selectedExam] || selectedExam} {t.planner.syllabusTracker}
          </h3>
          <p className="text-sm text-muted-foreground">{t.planner.trackProgress}</p>
        </div>
        <ExamSelector selectedExam={selectedExam} onExamChange={onExamChange} userExams={userExams} />
      </div>

      {paperNames.map((paper, paperIdx) => {
        const paperTopics = grouped[paper] || [];
        const subTopics = paperTopics.filter((t: any) => t.parentTopic !== null);
        const completedCount = subTopics.filter((t: any) => t.completed).length;
        const percentage = subTopics.length > 0 ? Math.round((completedCount / subTopics.length) * 100) : 0;
        const isExpanded = expandedPapers[paper];

        const sections: Record<string, any[]> = {};
        for (const t of paperTopics) {
          if (t.parentTopic === null) {
            if (!sections[t.topic]) sections[t.topic] = [];
          } else {
            if (!sections[t.parentTopic]) sections[t.parentTopic] = [];
            sections[t.parentTopic].push(t);
          }
        }

        return (
          <Card key={paper} className="overflow-visible">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => setExpandedPapers({ ...expandedPapers, [paper]: !isExpanded })}
              data-testid={`button-expand-${paper.replace(/\s+/g, "-")}`}
            >
              {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{paper}</span>
                  <Badge variant="outline" className={cn("text-xs", getPaperColor(paperIdx))}>{completedCount}/{subTopics.length}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", getBarColor(paperIdx))} style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">{percentage}%</span>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {Object.entries(sections).map(([section, sectionTopics]) => {
                  const sectionKey = `${paper}-${section}`;
                  const sectionExpanded = expandedSections[sectionKey] !== false;
                  const sectionCompleted = sectionTopics.filter((t: any) => t.completed).length;

                  return (
                    <div key={section} className="border rounded-md">
                      <div
                        className="flex items-center gap-2 p-3 cursor-pointer"
                        onClick={() => setExpandedSections({ ...expandedSections, [sectionKey]: !sectionExpanded })}
                      >
                        {sectionExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium flex-1">{section}</span>
                        <span className="text-xs text-muted-foreground">{sectionCompleted}/{sectionTopics.length}</span>
                      </div>
                      {sectionExpanded && (
                        <div className="px-3 pb-3 space-y-1">
                          {sectionTopics.map((topic: any) => {
                            const pyqCount = pyqTopicCounts?.[topic.topic] || 0;
                            return (
                              <label
                                key={topic.id}
                                className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                                data-testid={`checkbox-topic-${topic.id}`}
                              >
                                <Checkbox
                                  checked={topic.completed}
                                  onCheckedChange={(checked) => toggleTopic.mutate({ topicId: topic.id, completed: !!checked })}
                                />
                                <span className={cn("text-sm flex-1", topic.completed && "line-through text-muted-foreground")}>{topic.topic}</span>
                                {pyqCount >= 2 && (
                                  <Link href={`/pyq?topic=${encodeURIComponent(topic.topic)}`} data-testid={`badge-pyq-count-${topic.id}`}>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 cursor-pointer hover-elevate no-default-active-elevate" onClick={(e) => e.stopPropagation()}>
                                      PYQ: {pyqCount}x
                                    </span>
                                  </Link>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {paperNames.length === 0 && (
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">{t.planner.noSyllabus}</p>
        </Card>
      )}
    </div>
  );
}

function DailyGoalsTab({ userExams }: { userExams: string[] }) {
  const { t } = useLanguage();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: goals, isLoading } = useDailyGoals(selectedDate);
  const createGoal = useCreateGoal();
  const toggleGoal = useToggleGoal();
  const deleteGoal = useDeleteGoal();
  const aiGenerate = useAIGenerateGoals();
  const { toast } = useToast();
  const [newGoal, setNewGoal] = useState("");

  const handleAdd = () => {
    if (!newGoal.trim()) return;
    createGoal.mutate({ title: newGoal.trim(), goalDate: selectedDate }, {
      onSuccess: () => {
        setNewGoal("");
        toast({ title: t.planner.goalAdded });
      },
    });
  };

  const handleAIGenerate = () => {
    aiGenerate.mutate({ targetExams: userExams, date: selectedDate }, {
      onSuccess: () => {
        toast({ title: t.planner.goalsCreated, description: t.planner.goalsCreatedDesc });
      },
      onError: (err) => {
        toast({ title: t.planner.failedToGenerate, description: err.message, variant: "destructive" });
      },
    });
  };

  const completedCount = goals?.filter((g: any) => g.completed).length || 0;
  const totalCount = goals?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-goals-heading">{t.planner.dailyStudyGoals}</h3>
          <p className="text-sm text-muted-foreground">{t.planner.setAndTrack}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
            data-testid="input-goal-date"
          />
          <Button variant="outline" onClick={handleAIGenerate} disabled={aiGenerate.isPending} data-testid="button-ai-generate-goals">
            {aiGenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {aiGenerate.isPending ? t.planner.generatingGoals : t.planner.aiGenerate}
          </Button>
        </div>
      </div>

      {totalCount > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t.planner.todaysProgress}</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} {t.planner.completed}</span>
          </div>
          <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} className="h-2" />
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={t.planner.addStudyGoal}
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          data-testid="input-new-goal"
        />
        <Button onClick={handleAdd} disabled={createGoal.isPending} data-testid="button-add-goal">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-2">
          {goals.map((goal: any) => (
            <Card key={goal.id} className="p-3" data-testid={`goal-${goal.id}`}>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={goal.completed}
                  onCheckedChange={(checked) => toggleGoal.mutate({ id: goal.id, completed: !!checked, goalDate: selectedDate })}
                  data-testid={`checkbox-goal-${goal.id}`}
                />
                <span className={cn("text-sm flex-1", goal.completed && "line-through text-muted-foreground")}>{goal.title}</span>
                <Button size="icon" variant="ghost" onClick={() => deleteGoal.mutate({ id: goal.id, goalDate: selectedDate })} data-testid={`button-delete-goal-${goal.id}`}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">{t.planner.noGoals}</p>
        </Card>
      )}
    </div>
  );
}

function DashboardTab({ selectedExam, onExamChange, userExams }: { selectedExam: string; onExamChange: (e: string) => void; userExams: string[] }) {
  const { t } = useLanguage();
  const { data: dashboard, isLoading } = usePlannerDashboard(selectedExam);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-dashboard-heading">{t.planner.preparationDashboard}</h3>
          <p className="text-sm text-muted-foreground">{t.planner.preparationProgress}</p>
        </div>
        <ExamSelector selectedExam={selectedExam} onExamChange={onExamChange} userExams={userExams} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-md bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.planner.overallProgress}</p>
              <p className="text-2xl font-bold" data-testid="text-overall-progress">{dashboard.overallProgress}%</p>
            </div>
          </div>
          <Progress value={dashboard.overallProgress} className="h-2" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.planner.todaysGoals}</p>
              <p className="text-2xl font-bold" data-testid="text-today-goals">
                {dashboard.todayGoals.completed}/{dashboard.todayGoals.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.planner.weakAreas}</p>
              <p className="text-2xl font-bold" data-testid="text-weak-areas-count">{dashboard.weakAreas.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-4">{t.planner.progressByPaper}</h4>
        <div className="space-y-4">
          {dashboard.paperProgress.map((pp, idx) => (
            <div key={pp.paper}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs", getPaperColor(idx))}>{pp.paper}</Badge>
                  <span className="text-xs text-muted-foreground">{pp.completed}/{pp.total} {t.planner.topics}</span>
                </div>
                <span className="text-sm font-semibold">{pp.percentage}%</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", getBarColor(idx))} style={{ width: `${pp.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {dashboard.weakAreas.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">{t.planner.weakAreasBased}</h4>
          </div>
          <div className="space-y-3">
            {dashboard.weakAreas.map((wa, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-md bg-secondary/40" data-testid={`weak-area-${i}`}>
                <div>
                  <p className="text-sm font-medium">{wa.category}</p>
                  <p className="text-xs text-muted-foreground">{wa.correct}/{wa.totalQuestions} {t.planner.correct}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", wa.accuracy < 50 ? "text-red-500" : wa.accuracy < 70 ? "text-amber-500" : "text-emerald-500")}>
                    {wa.accuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t.planner.accuracy}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {dashboard.recommendedTopics.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">{t.planner.recommendedTopics}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dashboard.recommendedTopics.map((rt, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-secondary/40" data-testid={`recommended-topic-${i}`}>
                <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{rt.topic}</p>
                  <p className="text-xs text-muted-foreground">{rt.gsPaper} - {rt.parentTopic}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function StudyPlannerPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const userExams: string[] = (user as any)?.targetExams || ["UPSC"];
  const [selectedExam, setSelectedExam] = useState(userExams[0] || "UPSC");

  const examLabel = EXAM_LABELS[selectedExam] || selectedExam;

  const { data: subData } = useSubscription();
  const plannerTier = subData?.tier || null;
  const hasPlannerAccess = plannerTier === "pro" || plannerTier === "ultimate";

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      {hasPlannerAccess ? (
        <main className="flex-1 overflow-y-auto">
          <div className="hidden md:flex justify-end px-4 pt-3">
            <InlineLanguageButton />
          </div>
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
            <div className="mb-6">
              <h1 className="text-2xl font-display font-bold" data-testid="text-study-planner-title">{t.planner.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.planner.organizePrep}</p>
            </div>

            <Tabs defaultValue="dashboard">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                  <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:block" />
                  {t.planner.dashboard}
                </TabsTrigger>
                <TabsTrigger value="timetable" data-testid="tab-timetable">
                  <Calendar className="h-4 w-4 mr-1.5 hidden sm:block" />
                  {t.planner.timetable}
                </TabsTrigger>
                <TabsTrigger value="syllabus" data-testid="tab-syllabus">
                  <BookOpen className="h-4 w-4 mr-1.5 hidden sm:block" />
                  {t.planner.syllabus}
                </TabsTrigger>
                <TabsTrigger value="goals" data-testid="tab-goals">
                  <Target className="h-4 w-4 mr-1.5 hidden sm:block" />
                  {t.planner.goals}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <DashboardTab selectedExam={selectedExam} onExamChange={setSelectedExam} userExams={userExams} />
              </TabsContent>
              <TabsContent value="timetable">
                <TimetableTab userExams={userExams} />
              </TabsContent>
              <TabsContent value="syllabus">
                <SyllabusTab selectedExam={selectedExam} onExamChange={setSelectedExam} userExams={userExams} />
              </TabsContent>
              <TabsContent value="goals">
                <DailyGoalsTab userExams={userExams} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      ) : (
        <UpgradeBanner
          feature="Study Planner"
          description="Build weekly timetables, track syllabus progress, set daily goals, and analyze weak areas. Available on Pro plan and above."
          requiredTier="pro"
          blocking
        />
      )}
    </div>
  );
}
