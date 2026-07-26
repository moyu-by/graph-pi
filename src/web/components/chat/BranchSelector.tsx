import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";

export function BranchSelector() {
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const nodes = useGraphStore((s) => s.nodes);
  const activeNode = nodes.find((n) => n.id === activeNodeId);
  const { selectNode } = useAgentContext();

  if (!activeNode) return null;

  const parentNode = activeNode.parentIds.length > 0
    ? nodes.find((n) => n.id === activeNode.parentIds[0])
    : null;

  const branchSiblings = parentNode
    ? nodes.filter(
        (n) =>
          n.parentIds.includes(parentNode.id) &&
          n.id !== activeNode.id
      )
    : [];

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
