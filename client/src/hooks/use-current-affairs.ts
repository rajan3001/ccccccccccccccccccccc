import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DailyDigest {
  id: number;
  date: string;
  generatedAt: string;
}

export interface DailyTopic {
  id: number;
  digestId: number;
  title: string;
  summary: string;
  category: string;
  gsCategory: string;
  relevance: string | null;
  revised: boolean;
  createdAt: string;
}

export interface RevisionStats {
  total: number;
  revised: number;
}

export function useCurrentAffairs(date: string) {
  return useQuery<{ digest: DailyDigest | null; topics: DailyTopic[] }>({
    queryKey: ["/api/current-affairs", date],
    queryFn: async () => {
      const res = await fetch(`/api/current-affairs/${date}`);
      if (!res.ok) throw new Error("Failed to fetch current affairs");
      return res.json();
    },
    enabled: !!date,
  });
}

export function useCurrentAffairsDates() {
  return useQuery<{ date: string; id: number }[]>({
    queryKey: ["/api/current-affairs-dates"],
    queryFn: async () => {
      const res = await fetch("/api/current-affairs-dates");
      if (!res.ok) throw new Error("Failed to fetch dates");
      return res.json();
    },
  });
}

export function useGenerateCurrentAffairs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, stateFilter }: { date: string; stateFilter?: string | null }) => {
      const res = await fetch(`/api/current-affairs/generate/${date}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateFilter: stateFilter || null }),
      });
      if (!res.ok) throw new Error("Failed to generate current affairs");
      return res.json() as Promise<{ digest: DailyDigest; topics: DailyTopic[] }>;
    },
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/current-affairs", date] });
      queryClient.invalidateQueries({ queryKey: ["/api/current-affairs-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/current-affairs/stats/revision"] });
    },
  });
}

export function useToggleRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ topicId, revised }: { topicId: number; revised: boolean }) => {
      const res = await fetch(`/api/current-affairs/topics/${topicId}/revise`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revised }),
      });
      if (!res.ok) throw new Error("Failed to update revision");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/current-affairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/current-affairs/stats/revision"] });
    },
  });
}

export function useRevisionStats() {
  return useQuery<RevisionStats>({
    queryKey: ["/api/current-affairs/stats/revision"],
    queryFn: async () => {
      const res = await fetch("/api/current-affairs/stats/revision");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}
