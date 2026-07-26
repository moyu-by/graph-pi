import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import { findSiblings } from "@graph-pi/shared";

export function BranchSelector() {
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const nodes = useGraphStore((s) => s.nodes);
  const activeNode = nodes.find((n) => n.id === activeNodeId);
  const { selectNode } = useAgentContext();

  if (!activeNode) return null;

  // Shares-any-parent siblings, not just "same single parent" — a node can
  // have multiple parents (merges), so this covers branches reachable
  // through any of them.
  const branchSiblings = findSiblings(activeNode.id, nodes);

  if (branchSiblings.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <button className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
        style={{
          background: "var(--accent-muted)",
          color: "var(--accent)",
          borderColor: "var(--accent-border)",
        }}>
        {activeNode.title}
      </button>
      {branchSiblings.map((sib) => (
        <button
          key={sib.id}
          className="text-[11px] px-2 py-0.5 rounded-md text-fg-muted hover:text-fg-primary hover:bg-bg-hover transition-colors border border-transparent hover:border-border-default"
          onClick={() => {
            useGraphStore.getState().setActiveNode(sib.id);
            selectNode(sib.id);
          }}
        >
          {sib.title}
        </button>
      ))}
    </div>
  );
}
