import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

export type GraphNode = Node<{
  label: string;
  messageCount: number;
  isActive: boolean;
  isLocked: boolean;
  isCompressed: boolean;
  isSelected: boolean;
}>;

function NodeCardComponent({ data }: NodeProps<GraphNode>) {
  return (
    <div
      className={`px-3 py-2.5 rounded-xl border min-w-[140px] transition-all ${
        data.isLocked ? "opacity-60" : ""
      }`}
      style={{
        background: data.isActive
          ? "linear-gradient(135deg, rgba(124, 108, 240, 0.15), rgba(91, 158, 240, 0.08))"
          : data.isSelected
            ? "linear-gradient(135deg, rgba(176, 140, 240, 0.15), rgba(240, 112, 176, 0.08))"
            : "var(--bg-surface)",
        borderColor: data.isActive
          ? "rgba(124, 108, 240, 0.40)"
          : data.isSelected
            ? "rgba(176, 140, 240, 0.40)"
            : "var(--border-subtle)",
        boxShadow: data.isActive ? "var(--glow-accent)" : data.isSelected ? "0 0 15px rgba(176, 140, 240, 0.15)" : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "var(--accent)", width: "5px", height: "5px" }} />
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0`}
          style={{
            background: data.isActive
              ? "linear-gradient(135deg, var(--accent), var(--blue))"
              : data.isSelected
                ? "linear-gradient(135deg, var(--purple), var(--pink))"
                : "var(--fg-muted)",
            boxShadow: data.isActive ? "0 0 6px var(--accent)" : data.isSelected ? "0 0 6px var(--purple)" : "none",
          }} />
        <span className="text-xs font-medium text-fg-primary truncate">{data.label}</span>
      </div>
      <p className="text-[10px] text-fg-muted mt-1.5 ml-4.5 font-mono flex items-center gap-1">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {data.messageCount} msg{data.messageCount !== 1 ? "s" : ""}
        {data.isCompressed && (
          <span className="text-amber ml-1">compressed</span>
        )}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--accent)", width: "5px", height: "5px" }} />
    </div>
  );
}

export const NodeCard = memo(NodeCardComponent);
