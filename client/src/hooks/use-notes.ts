import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Note } from "@shared/models/notes";

interface NotesFilter {
  search?: string;
  gsCategory?: string;
  folder?: string;
  tag?: string;
  dueForReview?: boolean;
}

export function useNotes(filters: NotesFilter = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.gsCategory) params.set("gsCategory", filters.gsCategory);
  if (filters.folder) params.set("folder", filters.folder);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.dueForReview) params.set("dueForReview", "true");

  const qs = params.toString();
  const url = `/api/notes${qs ? `?${qs}` : ""}`;

  return useQuery<Note[]>({
    queryKey: ["/api/notes", filters],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });
}

export function useNote(id: number | null) {
  return useQuery<Note>({
    queryKey: ["/api/notes", id],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) throw new Error("Failed to fetch note");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useNoteFolders() {
  return useQuery<string[]>({
    queryKey: ["/api/notes/folders"],
    queryFn: async () => {
      const res = await fetch("/api/notes/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });
}

export function useNoteTags() {
  return useQuery<string[]>({
    queryKey: ["/api/notes/tags"],
    queryFn: async () => {
      const res = await fetch("/api/notes/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });
}

export function useDueNotesCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/notes/due-count"],
    queryFn: async () => {
      const res = await fetch("/api/notes/due-count");
      if (!res.ok) throw new Error("Failed to fetch due count");
      return res.json();
    },
    refetchInterval: 60000,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      gsCategory?: string | null;
      tags?: string[];
      folder?: string | null;
      sourceMessageId?: number | null;
      sourceConversationId?: number | null;
    }) => {
      const res = await apiRequest("POST", "/api/notes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: number;
      title?: string;
      content?: string;
      gsCategory?: string | null;
      tags?: string[];
      folder?: string | null;
    }) => {
      const res = await apiRequest("PATCH", `/api/notes/${id}`, data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes", variables.id] });
    },
  });
}

export function useReviewNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/notes/${id}/review`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/due-count"] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/notes/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/due-count"] });
    },
  });
}
