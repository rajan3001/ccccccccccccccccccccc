import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export interface MessageAttachment {
  name: string;
  type: string;
  objectPath: string;
  size: number;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "model";
  content: string;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });
}

export function useConversation(id: number | null) {
  return useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["/api/conversations", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string = "New Chat") => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });
}

export function useChatStream(conversationId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (content: string, attachments?: MessageAttachment[]) => {
    try {
      setIsStreaming(true);
      setStreamedContent("");
      setPendingUserMessage(content);
      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachments }),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 429) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Daily query limit reached. Upgrade to Pro for unlimited queries.");
      }
      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.done) {
                break;
              }
              
              if (data.content) {
                setStreamedContent((prev) => prev + data.content);
              }
            } catch (e) {
              console.warn("Failed to parse chunk", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({
          title: "Error sending message",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      setPendingUserMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/query-status"] });
    }
  };

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  return { sendMessage, streamedContent, isStreaming, stopStream, pendingUserMessage };
}
