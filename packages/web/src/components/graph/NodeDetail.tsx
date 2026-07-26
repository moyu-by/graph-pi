import { useState, useMemo } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import { estimateMessagesTokens, formatTokens } from "@/lib/tokens";

export function NodeDetail() {
  const activeNode = useGraphStore((s) =>
    s.nodes.find((n) => n.id === s.activeNodeId)
  );
  const nodes = useGraphStore((s) => s.nodes);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const { send, compressNode, deleteNode } = useAgentContext();

  const nodeTokens = useMemo(
    () => (activeNode ? estimateMessagesTokens(activeNode.messages) : 0),
    [activeNode]
  );

  if (!activeNode) {
    return (
      <div className="px-4 py-3 text-xs text-fg-faint border-t border-border-subtle bg-bg-surface/50">
        Select a node to view details
      </div>
    );
  }

  const parentNodes = activeNode.parentIds
    .map((pid) => nodes.find((n) => n.id === pid))
    .filter(Boolean);

  const handleSaveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== activeNode.title) {
      send({ type: "update_node_title", nodeId: activeNode.id, title: trimmed });
    }
    setEditing(false);
  };

  const handleCompress = () => {
    if (!activeNode.isCompressed && activeNode.messages.length > 0) {
      compressNode(activeNode.id);
    }
  };

  const handleDelete = () => {
    if (activeNode.hasChildren) return;
    if (confirm(`Delete node "${activeNode.title}"?`)) {
      deleteNode(activeNode.id);
    }
  };

  return (
    <div className="border-t border-border-subtle bg-bg-surface/80 backdrop-blur-sm">
      <div className="p-4 space-y-3 text-xs max-h-48 overflow-y-auto">
        <div>
          {editing ? (
            <div className="flex gap-1.5">
              <input
                className="bg-bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-fg-primary flex-1 focus:border-accent focus:shadow-glow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                autoFocus
              />
              <button
                className="text-accent text-xs px-2.5 py-1.5 hover:bg-accent-muted rounded-lg font-medium transition-colors"
                onClick={handleSaveTitle}
              >
                Save
              </button>
            </div>
          ) : (
            <p
              className="font-medium text-fg-primary cursor-pointer hover:text-accent transition-colors flex items-center gap-2"
              onClick={() => {
                setTitle(activeNode.title);
                setEditing(true);
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
              {activeNode.title}
            </p>
          )}
        </div>

        <div className="flex gap-6 text-fg-secondary">
          <div>
            <span className="text-fg-faint text-[10px]">Messages</span>
            <p className="font-mono mt-0.5 text-accent">{activeNode.messages.length}</p>
          </div>
          <div>
            <span className="text-fg-faint text-[10px]">Tokens</span>
            <p className="font-mono mt-0.5 text-cyan">{formatTokens(nodeTokens)}</p>
          </div>
          <div>
            <span className="text-fg-faint text-[10px]">Status</span>
            <p className="mt-0.5">
              {activeNode.hasChildren ? (
                <span className="text-amber">locked</span>
              ) : (
                <span className="text-green">active</span>
              )}
              {activeNode.isCompressed && <span className="text-cyan"> / compressed</span>}
            </p>
          </div>
        </div>

        {parentNodes.length > 0 && (
          <div>
            <span className="text-fg-faint text-[10px] block mb-1">Parents</span>
            <div className="flex flex-wrap gap-1">
              {parentNodes.map((p) => (
                <span key={p!.id} className="bg-bg-elevated px-2 py-0.5 rounded-md text-[11px] text-fg-secondary border border-border-subtle">
                  {p!.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeNode.isCompressed && (
          <div>
            <span className="text-fg-faint text-[10px] block mb-1">Summary</span>
            <p className="text-fg-muted text-[11px] leading-relaxed bg-bg-elevated/50 rounded-lg p-2 border border-border-subtle">
              {activeNode.compressedSummary ?? "No summary"}
            </p>
          </div>
        )}

        <div className="flex gap-1.5 pt-1">
          {!activeNode.isCompressed && activeNode.messages.length > 0 && (
            <button
              className="px-2.5 py-1 text-[11px] border border-border-default rounded-lg hover:bg-cyan-muted/30 text-cyan transition-colors hover:border-cyan/20"
              onClick={handleCompress}
            >
              Compress
            </button>
          )}
          {!activeNode.hasChildren && (
            <button
              className="px-2.5 py-1 text-[11px] border border-border-default rounded-lg hover:bg-red-muted/50 text-red transition-colors hover:border-red/20"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
