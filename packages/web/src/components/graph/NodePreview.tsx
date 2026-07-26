import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Markdown } from "@/components/ui/Markdown";

interface Props {
  nodeId: string;
  onClose: () => void;
}

export function NodePreview({ nodeId, onClose }: Props) {
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === nodeId));
  const { selectNode } = useAgentContext();
  const setActiveNode = useGraphStore((s) => s.setActiveNode);
  const setPreviewNode = useGraphStore((s) => s.setPreviewNode);

  if (!node) return null;

  const handleOpen = () => {
    setActiveNode(node.id);
    selectNode(node.id);
    setPreviewNode(null);
  };

  const lastMessages = node.messages.slice(-5);

  return (
    <div className="absolute inset-x-3 bottom-3 bg-bg-surface/90 backdrop-blur-sm border border-border-default rounded-xl shadow-lg z-10 max-h-[60%] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0"
        style={{ background: "linear-gradient(135deg, rgba(124, 108, 240, 0.06), rgba(91, 158, 240, 0.03))" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, var(--accent), var(--blue))" }} />
          <h3 className="text-xs font-medium text-fg-primary truncate">{node.title}</h3>
          <span className="text-2xs text-fg-faint font-mono bg-bg-elevated px-1.5 py-0.5 rounded shrink-0">{node.messages.length} msgs</span>
          {node.hasChildren && (
            <span className="text-2xs text-amber bg-amber-muted px-1.5 py-0.5 rounded-md shrink-0 border border-amber/10">locked</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="text-xs text-accent hover:bg-accent-muted px-2 py-1 rounded-md transition-colors font-medium border border-accent/20"
            onClick={handleOpen}
          >
            Open
          </button>
          <button
            className="text-fg-muted hover:text-fg-primary p-1 rounded-md hover:bg-bg-hover transition-colors"
            onClick={onClose}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {lastMessages.length === 0 && (
          <p className="text-xs text-fg-faint text-center py-6">No messages</p>
        )}
        {lastMessages.map((msg) => {
          const isUser = msg.role === "user";
          const text = msg.content.map((c) => c.text).filter(Boolean).join(" ");
          return (
            <div key={msg.id} className="flex gap-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: isUser
                    ? "linear-gradient(135deg, var(--blue), var(--cyan))"
                    : "linear-gradient(135deg, var(--green), var(--teal))",
                }}>
                <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                {isUser ? (
                  <p className="text-xs text-fg-primary line-clamp-3 whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="text-xs line-clamp-3">
                    <Markdown content={text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {node.messages.length > 5 && (
          <p className="text-2xs text-fg-faint text-center pt-1">
            +{node.messages.length - 5} more messages
          </p>
        )}
      </div>
    </div>
  );
}
