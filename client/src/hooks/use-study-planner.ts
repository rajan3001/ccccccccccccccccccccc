import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useTimetable() {
  return useQuery<any[]>({
    queryKey: ["/api/study-planner/timetable"],
  });
}

export function useCreateSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string; gsPaper: string; subject: string; notes?: string }) => {
      const res = await fetch("/api/study-planner/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create slot");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/study-planner/timetable"] }),
  });
}

export function useDeleteSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/study-planner/timetable/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete slot");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/study-planner/timetable"] }),
  });
}

export function useSyllabus(examType: string) {
  return useQuery<any[]>({
    queryKey: ["/api/study-planner/syllabus", examType],
    queryFn: async () => {
      const res = await fetch(`/api/study-planner/syllabus?examType=${encodeURIComponent(examType)}`);
      if (!res.ok) throw new Error("Failed to fetch syllabus");
      return res.json();
    },
  });
}

export function useToggleSyllabusTopic(examType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ topicId, completed }: { topicId: number; completed: boolean }) => {
      const res = await fetch(`/api/study-planner/syllabus/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update topic");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/study-planner/syllabus", examType] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/study-planner/dashboard" });
    },
  });
}

export function useDailyGoals(date: string) {
  return useQuery<any[]>({
    queryKey: ["/api/study-planner/daily-goals", date],
    queryFn: async () => {
      const res = await fetch(`/api/study-planner/daily-goals?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch goals");
      return res.json();
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; goalDate: string }) => {
      const res = await fetch("/api/study-planner/daily-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/study-planner/daily-goals", vars.goalDate] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/study-planner/dashboard" });
    },
  });
}

export function useToggleGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed, goalDate }: { id: number; completed: boolean; goalDate: string }) => {
      const res = await fetch(`/api/study-planner/daily-goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to toggle goal");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/study-planner/daily-goals", vars.goalDate] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/study-planner/dashboard" });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, goalDate }: { id: number; goalDate: string }) => {
      const res = await fetch(`/api/study-planner/daily-goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/study-planner/daily-goals", vars.goalDate] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/study-planner/dashboard" });
    },
  });
}

export function usePlannerDashboard(examType: string) {
  return useQuery<{
    overallProgress: number;
    paperProgress: { paper: string; total: number; completed: number; percentage: number }[];
    weakAreas: { category: string; accuracy: number; totalQuestions: number; correct: number }[];
    recommendedTopics: { topic: string; gsPaper: string; parentTopic: string | null }[];
    todayGoals: { total: number; completed: number };
  }>({
    queryKey: ["/api/study-planner/dashboard", examType],
    queryFn: async () => {
      const res = await fetch(`/api/study-planner/dashboard?examType=${encodeURIComponent(examType)}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });
}
