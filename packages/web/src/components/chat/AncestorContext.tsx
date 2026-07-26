import { useState } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { getAncestorClosure, type Node } from "@graph-pi/shared";
import { MessageItem } from "./MessageItem";

export function AncestorContext() {
  const [expanded, setExpanded] = useState(false);
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const nodes = useGraphStore((s) => s.nodes);

  if (!activeNodeId) return null;

  // Full ancestor closure (not just the parentIds[0] chain) so merged nodes
  // show every branch that fed into them, not only the most recent one.
  const closureIds = getAncestorClosure(activeNodeId, (id) =>
    nodes.find((n) => n.id === id)
  );
  const ancestors = closureIds
    .slice(0, -1)
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is Node => n !== undefined);

  if (ancestors.length === 0) return null;

  const totalMessages = ancestors.reduce((sum, n) => sum + n.messages.length, 0);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg transition-all border border-transparent hover:border-border-subtle group"
        style={{ background: expanded ? "var(--bg-elevated)" : "transparent" }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent group-hover:scale-110 transition-transform shrink-0">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="text-xs text-fg-muted">
            {ancestors.length} ancestor{ancestors.length > 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-fg-faint font-mono bg-bg-elevated px-1.5 py-0.5 rounded">
            {totalMessages} msgs
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-fg-faint text-[11px]">
          <span>{expanded ? "Hide" : "Show"}</span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4">
          {ancestors.map((ancestor, i) => (
            <div key={ancestor.id} className="relative pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "var(--accent-border)" }} />
              <div className="absolute left-0 top-2 w-2 h-px" style={{ background: "var(--accent-border)" }} />
              <p className="text-[11px] text-accent mb-2 font-medium flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                {ancestor.title}
              </p>
              {ancestor.messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
              {i < ancestors.length - 1 && (
                <div className="my-3 border-t border-border-subtle" style={{ marginLeft: "-1rem" }} />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px" style={{ background: "var(--gradient-primary)" }} />
            <span className="text-[10px] text-fg-faint font-medium uppercase tracking-wider">Current Node</span>
            <div className="flex-1 h-px" style={{ background: "var(--gradient-primary)" }} />
          </div>
        </div>
      )}
    </div>
  );
}
