export type MessageRole = "user" | "assistant" | "toolResult";

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: ContentBlock[];
  timestamp: number;
  toolCallId?: string;
}

export interface Node {
  id: string;
  graphId: string;
  title: string;
  parentIds: string[];
  splitAfterMessageId?: string;
  messages: Message[];
  isCompressed: boolean;
  compressedSummary?: string;
  hasChildren?: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface Graph {
  id: string;
  title: string;
  rootNodeId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContextPreview {
  nodeCount: number;
  totalMessages: number;
  compressedNodes: string[];
}

export type StreamEventType =
  | "start"
  | "text_delta"
  | "toolcall_start"
  | "toolcall_delta"
  | "toolcall_end"
  | "message_end"
  | "done"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  data?: unknown;
}

export interface ModelInfo {
  id: string;
  name: string;
  api: string;
  contextWindow: number;
  maxTokens: number;
  reasoning: boolean;
  input: string[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total?: number };
}
