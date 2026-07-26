import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CompressToggle } from "./CompressToggle";
import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import type { Node } from "@graph-pi/shared";

interface Props {
  onClose: () => void;
}

export function MergeDialog({ onClose }: Props) {
  // Ordered by selectedNodeIds (accumulated in click order), not by the
  // nodes array's own order — the server uses parentNodeIds order, and
  // users expect it to reflect the order they clicked nodes in.
  //
  // `.map().filter()` builds a new array every call, so without useShallow
  // Zustand's reference-equality check never sees "no change" and re-renders
  // forever (React error #185, confirmed by actually opening this dialog).
  // useShallow compares the array's elements instead of its reference.
  const selectedNodes = useGraphStore(
    useShallow((s) =>
      s.selectedNodeIds
        .map((id) => s.nodes.find((n) => n.id === id))
        .filter((n): n is Node => n !== undefined)
    )
  );
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const { send } = useAgentContext();

  const [compressMap, setCompressMap] = useState<Record<string, boolean>>({});

  const toggleCompress = (nodeId: string, compress: boolean) => {
    setCompressMap((prev) => ({ ...prev, [nodeId]: compress }));
  };

  const handleMerge = () => {
    const parentNodeIds = selectedNodes.map((n) => n.id);
    const compressNodeIds = Object.entries(compressMap)
      .filter(([, v]) => v)
      .map(([k]) => k);

    send({ type: "merge_nodes", parentNodeIds, compressNodeIds });
    clearSelection();
    onClose();
  };

  if (selectedNodes.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle"
          style={{ background: "linear-gradient(135deg, rgba(176, 140, 240, 0.08), rgba(124, 108, 240, 0.04))" }}>
          <h2 className="text-sm font-semibold text-fg-primary flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg, var(--purple), var(--pink))" }} />
            Merge Nodes
          </h2>
          <p className="text-[11px] text-fg-faint mt-0.5 ml-4">Combine {selectedNodes.length} nodes into one</p>
        </div>

        <div className="p-5 space-y-2 max-h-80 overflow-y-auto">
          {selectedNodes.map((node) => (
            <CompressToggle
              key={node.id}
              nodeId={node.id}
              nodeTitle={node.title}
              messageCount={node.messages.length}
              isCompressed={compressMap[node.id] ?? false}
              onToggle={toggleCompress}
            />
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border-subtle flex justify-end gap-2 bg-bg-elevated/30">
          <button
            className="px-3 py-1.5 border border-border-default rounded-lg text-xs text-fg-secondary hover:bg-bg-hover transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--pink))" }}
            onClick={handleMerge}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
