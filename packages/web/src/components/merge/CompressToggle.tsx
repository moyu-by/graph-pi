interface Props {
  nodeId: string;
  nodeTitle: string;
  messageCount: number;
  isCompressed: boolean;
  onToggle: (nodeId: string, compress: boolean) => void;
}

export function CompressToggle({
  nodeId,
  nodeTitle,
  messageCount,
  isCompressed,
  onToggle,
}: Props) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border rounded-lg bg-bg-elevated/60 transition-all hover:border-border-default"
      style={{ borderColor: isCompressed ? "var(--accent-border)" : "var(--border-subtle)" }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{
          background: isCompressed ? "var(--accent)" : "var(--fg-faint)",
          boxShadow: isCompressed ? "0 0 6px var(--accent)" : "none",
        }} />
        <div>
          <p className="text-xs font-medium text-fg-primary">{nodeTitle}</p>
          <p className="text-[10px] text-fg-faint font-mono">{messageCount} messages</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={isCompressed}
          onChange={(e) => onToggle(nodeId, e.target.checked)}
          className="rounded accent-accent"
        />
        <span className="text-[11px]">Compress</span>
      </label>
    </div>
  );
}
