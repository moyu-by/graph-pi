import { useMemo } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { BranchSelector } from "./BranchSelector";
import { useGraphStore } from "@/stores/graph-store";
import { useChatStore } from "@/stores/chat-store";
import { estimateMessagesTokens, formatTokens } from "@/lib/tokens";
import { getAncestorClosure, type Node } from "@graph-pi/shared";

export function ChatPanel() {
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const activeNode = useGraphStore((s) =>
    s.nodes.find((n) => n.id === s.activeNodeId)
  );
  const nodes = useGraphStore((s) => s.nodes);
  const isLocked = useChatStore((s) => s.isLocked);

  const { ancestorPath, ancestorNodes, totalTokens } = useMemo(() => {
    if (!activeNode) return { ancestorPath: [] as string[], ancestorNodes: [] as Node[], totalTokens: 0 };

    // Breadcrumb display: just the most recent chain (parentIds[0]). A merge
    // node has several equally-valid parent chains, so showing one is fine
    // here — this is a label, not a completeness guarantee.
    const chain: Node[] = [];
    const chainVisited = new Set<string>();
    let currentId: string | null = activeNode.id;
    while (currentId) {
      if (chainVisited.has(currentId)) break;
      chainVisited.add(currentId);
      const n = nodes.find((n) => n.id === currentId);
      if (!n) break;
      chain.unshift(n);
      currentId = n.parentIds[0] ?? null;
    }
    const ancestorPath = chain.map((n) => n.title);

    // Token accounting: the full ancestor closure, so a merge node's token
    // total includes every branch that feeds into it, not just one chain.
    const closureIds = getAncestorClosure(activeNode.id, (id) =>
      nodes.find((n) => n.id === id)
    );
    const ancestorNodes = closureIds
      .slice(0, -1)
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is Node => n !== undefined);
    const allMessages = [...ancestorNodes.flatMap((n) => n.messages), ...activeNode.messages];
    const totalTokens = estimateMessagesTokens(allMessages);
    return { ancestorPath, ancestorNodes, totalTokens };
  }, [activeNode, nodes]);

  if (!activeNodeId || !activeNode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--blue) 0%, transparent 70%)" }} />
        </div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center border border-border-subtle bg-bg-elevated/50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-sm text-fg-secondary mb-1">Select a node</p>
          <p className="text-xs text-fg-faint">Click a node in the graph to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
      </div>

      <div className="px-6 pt-4 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          <h2 className="text-sm font-medium text-fg-primary truncate">{activeNode.title}</h2>
          {isLocked && (
            <span className="text-[10px] text-amber bg-amber-muted px-1.5 py-0.5 rounded-md border border-amber/10">
              locked
            </span>
          )}
        </div>
        {ancestorPath.length > 1 && (
          <p className="text-[11px] text-fg-faint mt-0.5 ml-4">
            {ancestorPath.join(" / ")}
          </p>
        )}
        <BranchSelector />
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col">
        <MessageList />
        <ChatInput />
        <div className="px-6 pb-2 relative z-10">
          <div className="w-[92%] min-w-[360px] max-w-[960px] mx-auto flex items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-fg-faint font-mono">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>{formatTokens(totalTokens)} tokens</span>
            </div>
            {ancestorNodes.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-fg-faint font-mono">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span>+ {formatTokens(estimateMessagesTokens(ancestorNodes.flatMap((n) => n.messages)))} from ancestors</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
