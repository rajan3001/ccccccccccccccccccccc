import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface QuizAttempt {
  id: number;
  userId: string;
  examType: string;
  gsCategory: string;
  difficulty: string;
  totalQuestions: number;
  score: number | null;
  completedAt: string | null;
  createdAt: string;
}

export interface QuizQuestion {
  id: number;
  attemptId: number;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  userAnswer: number | null;
  isCorrect: boolean | null;
}

export interface QuizAnalytics {
  analytics: {
    examType: string;
    gsCategory: string;
    totalAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    avgScore: number;
  }[];
  recentTrend: {
    examType: string;
    gsCategory: string;
    score: number;
    totalQuestions: number;
    createdAt: string;
  }[];
}

export interface GenerateQuizParams {
  examType: string;
  gsCategory: string;
  difficulty: string;
  numQuestions: number;
  sourceDate?: string;
}

export function useQuizHistory() {
  return useQuery<QuizAttempt[]>({
    queryKey: ["/api/quizzes", "history"],
  });
}

export function useQuizAnalytics() {
  return useQuery<QuizAnalytics>({
    queryKey: ["/api/quizzes", "analytics"],
  });
}

export function useQuiz(id: number | null) {
  return useQuery<{ attempt: QuizAttempt; questions: QuizQuestion[] }>({
    queryKey: ["/api/quizzes", id],
    enabled: id !== null,
  });
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: GenerateQuizParams) => {
      const res = await apiRequest("POST", "/api/quizzes/generate", params);
      return res.json() as Promise<{ attempt: QuizAttempt; questions: QuizQuestion[] }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes", "history"] });
    },
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, answers }: { id: number; answers: Record<string, number> }) => {
      const res = await apiRequest("POST", `/api/quizzes/${id}/submit`, { answers });
      return res.json() as Promise<{ attempt: QuizAttempt; questions: QuizQuestion[] }>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes", "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes", "analytics"] });
    },
  });
}
