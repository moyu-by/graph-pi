import { create } from "zustand";
import type { Message, StreamEvent } from "@graph-pi/shared";

interface ChatState {
  messages: Message[];
  streamingMessage: string;
  isStreaming: boolean;
  isLocked: boolean;
  error: string | null;

  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  appendStreaming: (text: string) => void;
  setStreamingMessage: (msg: string) => void;
  setIsStreaming: (v: boolean) => void;
  setIsLocked: (v: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streamingMessage: "",
  isStreaming: false,
  isLocked: false,
  error: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendStreaming: (text) =>
    set((s) => ({ streamingMessage: s.streamingMessage + text })),
  setStreamingMessage: (streamingMessage) => set({ streamingMessage }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setIsLocked: (isLocked) => set({ isLocked }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      messages: [],
      streamingMessage: "",
      isStreaming: false,
      isLocked: false,
      error: null,
    }),
}));
