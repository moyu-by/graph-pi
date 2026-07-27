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
        {/* Ambient background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/5 left-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--purple) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/5 right-1/3 w-72 h-72 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--blue) 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-8 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
        </div>

        <div className="text-center relative z-10 select-none">
          {/* Graph network illustration */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Edge lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 192 192" fill="none">
              {/* Outer ring edges — connect satellites to center */}
              <circle cx="96" cy="96" r="72" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 4" />
              <circle cx="96" cy="96" r="48" stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="2 5" />
              {/* Radial edges from outer satellites to mid ring */}
              <line x1="96" y1="24" x2="96" y2="48" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
              <line x1="158.5" y1="58.5" x2="130" y2="72" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
              <line x1="158.5" y1="133.5" x2="130" y2="120" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
              <line x1="96" y1="168" x2="96" y2="144" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
              <line x1="33.5" y1="133.5" x2="62" y2="120" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
              <line x1="33.5" y1="58.5" x2="62" y2="72" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
              {/* Cross edges on inner ring */}
              <line x1="48" y1="96" x2="72" y2="96" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
              <line x1="120" y1="96" x2="144" y2="96" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
              <line x1="96" y1="138" x2="96" y2="124" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
              <line x1="96" y1="68" x2="96" y2="54" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
            </svg>

            {/* Outer satellite nodes */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--purple)", boxShadow: "0 0 6px var(--purple)" }} />
            <div className="absolute top-[52px] right-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--blue)", boxShadow: "0 0 6px var(--blue)", animationDelay: "0.3s" }} />
            <div className="absolute bottom-[52px] right-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)", animationDelay: "0.6s" }} />
            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)", animationDelay: "0.9s" }} />
            <div className="absolute bottom-[52px] left-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)", animationDelay: "1.2s" }} />
            <div className="absolute top-[52px] left-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--blue)", boxShadow: "0 0 6px var(--blue)", animationDelay: "0.15s" }} />

            {/* Inner ring nodes */}
            <div className="absolute top-[62px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 4px var(--accent)" }} />
            <div className="absolute top-[88px] right-[62px] w-2 h-2 rounded-full"
              style={{ background: "var(--purple)", boxShadow: "0 0 4px var(--purple)" }} />
            <div className="absolute top-[88px] left-[62px] w-2 h-2 rounded-full"
              style={{ background: "var(--purple)", boxShadow: "0 0 4px var(--purple)" }} />
            <div className="absolute bottom-[62px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 4px var(--accent)" }} />

            {/* Central node — π symbol */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex items-center justify-center animate-glow-pulse shadow-glow"
              style={{ background: "var(--gradient-primary)" }}>
              <span className="text-white text-2xl font-bold font-mono leading-none" style={{ fontFamily: "var(--font-mono)" }}>π</span>
            </div>
          </div>

          <h2 className="text-base font-semibold bg-clip-text text-transparent mb-1"
            style={{ backgroundImage: "var(--gradient-primary)" }}>
            Graph PI
          </h2>
          <p className="text-xs text-fg-faint max-w-xs mx-auto leading-relaxed">
            Click a node in the sidebar or graph to start chatting
          </p>
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
