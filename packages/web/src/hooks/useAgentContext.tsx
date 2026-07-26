import { createContext, useContext, type ReactNode } from "react";
import { useAgent } from "@/hooks/useAgent";
import type { ClientMessage } from "@graph-pi/shared";

interface AgentContextValue {
  selectGraph: (graphId: string) => void;
  selectNode: (nodeId: string) => void;
  sendMessage: (nodeId: string, content: string) => void;
  createBranch: (parentNodeId: string, afterMessageId: string) => void;
  compressNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  setActiveNode: (nodeId: string) => void;
  send: (msg: ClientMessage) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const agent = useAgent();
  return <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>;
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider");
  return ctx;
}
