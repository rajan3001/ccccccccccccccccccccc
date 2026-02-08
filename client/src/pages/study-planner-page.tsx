import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
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
} from "@/hooks/use-study-planner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GS_PAPERS = ["GS Paper I", "GS Paper II", "GS Paper III", "GS Paper IV"];

const PAPER_COLORS: Record<string, string> = {
  "GS Paper I": "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "GS Paper II": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  "GS Paper III": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "GS Paper IV": "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
};

const PAPER_BAR_COLORS: Record<string, string> = {
  "GS Paper I": "bg-blue-500",
  "GS Paper II": "bg-emerald-500",
  "GS Paper III": "bg-amber-500",
  "GS Paper IV": "bg-purple-500",
};

function TimetableTab() {
  const { data: slots, isLoading } = useTimetable();
  const createSlot = useCreateSlot();
  const deleteSlot = useDeleteSlot();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    gsPaper: "GS Paper I",
    subject: "",
  });

  const handleCreate = () => {
    if (!form.subject.trim()) {
      toast({ title: "Please enter a subject", variant: "destructive" });
      return;
    }
    createSlot.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00", gsPaper: "GS Paper I", subject: "" });
        toast({ title: "Time slot added" });
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
          <h3 className="text-lg font-semibold" data-testid="text-timetable-heading">Weekly Timetable</h3>
          <p className="text-sm text-muted-foreground">Plan your study schedule for the week</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-slot">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Study Slot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Day</label>
                <Select value={String(form.dayOfWeek)} onValueChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v) })}>
                  <SelectTrigger data-testid="select-day"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">Start Time</label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} data-testid="input-start-time" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">End Time</label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} data-testid="input-end-time" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">GS Paper</label>
                <Select value={form.gsPaper} onValueChange={(v) => setForm({ ...form, gsPaper: v })}>
                  <SelectTrigger data-testid="select-gs-paper"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GS_PAPERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Subject / Topic</label>
                <Input placeholder="e.g. Modern Indian History" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="input-subject" />
              </div>
              <Button onClick={handleCreate} disabled={createSlot.isPending} className="w-full" data-testid="button-save-slot">
                {createSlot.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save Slot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                    <Badge variant="outline" className={cn("text-xs", PAPER_COLORS[slot.gsPaper])}>{slot.gsPaper}</Badge>
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
            <p className="text-muted-foreground text-sm">No study slots added yet. Click "Add Slot" to create your weekly timetable.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function SyllabusTab() {
  const { data: topics, isLoading } = useSyllabus();
  const toggleTopic = useToggleSyllabusTopic();
  const [expandedPapers, setExpandedPapers] = useState<Record<string, boolean>>({ "GS Paper I": true });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const grouped: Record<string, any[]> = {};
  for (const t of topics || []) {
    if (!grouped[t.gsPaper]) grouped[t.gsPaper] = [];
    grouped[t.gsPaper].push(t);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-syllabus-heading">UPSC Syllabus Tracker</h3>
        <p className="text-sm text-muted-foreground">Track your progress across all GS papers</p>
      </div>

      {GS_PAPERS.map((paper) => {
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
                  <Badge variant="outline" className={cn("text-xs", PAPER_COLORS[paper])}>{completedCount}/{subTopics.length}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", PAPER_BAR_COLORS[paper])} style={{ width: `${percentage}%` }} />
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
                          {sectionTopics.map((topic: any) => (
                            <label
                              key={topic.id}
                              className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                              data-testid={`checkbox-topic-${topic.id}`}
                            >
                              <Checkbox
                                checked={topic.completed}
                                onCheckedChange={(checked) => toggleTopic.mutate({ topicId: topic.id, completed: !!checked })}
                              />
                              <span className={cn("text-sm", topic.completed && "line-through text-muted-foreground")}>{topic.topic}</span>
                            </label>
                          ))}
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
    </div>
  );
}

function DailyGoalsTab() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: goals, isLoading } = useDailyGoals(selectedDate);
  const createGoal = useCreateGoal();
  const toggleGoal = useToggleGoal();
  const deleteGoal = useDeleteGoal();
  const { toast } = useToast();
  const [newGoal, setNewGoal] = useState("");

  const handleAdd = () => {
    if (!newGoal.trim()) return;
    createGoal.mutate({ title: newGoal.trim(), goalDate: selectedDate }, {
      onSuccess: () => {
        setNewGoal("");
        toast({ title: "Goal added" });
      },
    });
  };

  const completedCount = goals?.filter((g: any) => g.completed).length || 0;
  const totalCount = goals?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-goals-heading">Daily Study Goals</h3>
          <p className="text-sm text-muted-foreground">Set and track your daily study targets</p>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
          data-testid="input-goal-date"
        />
      </div>

      {totalCount > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today's Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} completed</span>
          </div>
          <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} className="h-2" />
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a study goal..."
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
          <p className="text-muted-foreground text-sm">No goals set for this day. Add a goal to start tracking!</p>
        </Card>
      )}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = usePlannerDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-dashboard-heading">Preparation Dashboard</h3>
        <p className="text-sm text-muted-foreground">Overview of your UPSC preparation progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-md bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
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
              <p className="text-xs text-muted-foreground">Today's Goals</p>
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
              <p className="text-xs text-muted-foreground">Weak Areas</p>
              <p className="text-2xl font-bold" data-testid="text-weak-areas-count">{dashboard.weakAreas.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-4">Progress by GS Paper</h4>
        <div className="space-y-4">
          {dashboard.paperProgress.map((pp) => (
            <div key={pp.paper}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", PAPER_COLORS[pp.paper])}>{pp.paper}</Badge>
                  <span className="text-xs text-muted-foreground">{pp.completed}/{pp.total} topics</span>
                </div>
                <span className="text-sm font-semibold">{pp.percentage}%</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", PAPER_BAR_COLORS[pp.paper])} style={{ width: `${pp.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {dashboard.weakAreas.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Weak Areas (Based on Quiz Performance)</h4>
          </div>
          <div className="space-y-3">
            {dashboard.weakAreas.map((wa, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-md bg-secondary/40" data-testid={`weak-area-${i}`}>
                <div>
                  <p className="text-sm font-medium">{wa.category}</p>
                  <p className="text-xs text-muted-foreground">{wa.correct}/{wa.totalQuestions} correct</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", wa.accuracy < 50 ? "text-red-500" : wa.accuracy < 70 ? "text-amber-500" : "text-emerald-500")}>
                    {wa.accuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">accuracy</p>
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
            <h4 className="font-semibold text-sm">Recommended Topics to Study</h4>
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
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold" data-testid="text-study-planner-title">Study Planner</h1>
            <p className="text-sm text-muted-foreground mt-1">Organize your UPSC preparation effectively</p>
          </div>

          <Tabs defaultValue="dashboard">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:block" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="timetable" data-testid="tab-timetable">
                <Calendar className="h-4 w-4 mr-1.5 hidden sm:block" />
                Timetable
              </TabsTrigger>
              <TabsTrigger value="syllabus" data-testid="tab-syllabus">
                <BookOpen className="h-4 w-4 mr-1.5 hidden sm:block" />
                Syllabus
              </TabsTrigger>
              <TabsTrigger value="goals" data-testid="tab-goals">
                <Target className="h-4 w-4 mr-1.5 hidden sm:block" />
                Goals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard"><DashboardTab /></TabsContent>
            <TabsContent value="timetable"><TimetableTab /></TabsContent>
            <TabsContent value="syllabus"><SyllabusTab /></TabsContent>
            <TabsContent value="goals"><DailyGoalsTab /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
