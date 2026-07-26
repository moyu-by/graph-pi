import { useMemo, useState, useRef, useEffect } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Markdown } from "@/components/ui/Markdown";
import type { Node } from "@graph-pi/shared";

const DOT_R = 5;
const LEVEL_GAP = 44;
const SIBLING_GAP = 24;
const PAD_X = 20;
const PAD_Y = 16;

interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

function layoutVertical(
  nodes: { id: string; parentIds: string[] }[]
): { layoutNodes: LayoutNode[]; width: number; height: number } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  const roots: string[] = [];

  for (const n of nodes) {
    if (n.parentIds.length === 0) {
      roots.push(n.id);
    } else {
      for (const pId of n.parentIds) {
        if (!childrenMap.has(pId)) childrenMap.set(pId, []);
        childrenMap.get(pId)!.push(n.id);
      }
    }
  }

  const posMap = new Map<string, { x: number; y: number }>();

  // A merge node's level is the deepest parent's level + 1, so it always
  // renders below every parent it merges rather than whichever parent path
  // happens to reach it first during placement.
  const depthCache = new Map<string, number>();
  function depthOf(nodeId: string): number {
    const cached = depthCache.get(nodeId);
    if (cached !== undefined) return cached;
    const parentIds = nodeById.get(nodeId)?.parentIds ?? [];
    const depth = parentIds.length === 0 ? 0 : Math.max(...parentIds.map(depthOf)) + 1;
    depthCache.set(nodeId, depth);
    return depth;
  }

  // Memoized: a node reachable through more than one parent (a merge) would
  // otherwise have its whole subtree width recomputed from scratch once per
  // incoming path — and every descendant of *that* would do the same for
  // its own children, compounding quickly.
  const widthCache = new Map<string, number>();
  function getSubtreeWidth(nodeId: string): number {
    const cached = widthCache.get(nodeId);
    if (cached !== undefined) return cached;
    const children = childrenMap.get(nodeId) || [];
    let w = 0;
    for (let i = 0; i < children.length; i++) {
      w += getSubtreeWidth(children[i]);
      if (i < children.length - 1) w += SIBLING_GAP;
    }
    const width = Math.max(w, 0);
    widthCache.set(nodeId, width);
    return width;
  }

  // Without `visited`, a merge node is positioned once per incoming parent
  // edge (last write wins) and its children get re-placed that many times too.
  const visited = new Set<string>();
  function placeNode(nodeId: string, centerX: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const y = PAD_Y + depthOf(nodeId) * LEVEL_GAP;
    posMap.set(nodeId, { x: centerX, y });

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const totalWidth = children.reduce((sum, cid, i) => {
      return sum + getSubtreeWidth(cid) + (i < children.length - 1 ? SIBLING_GAP : 0);
    }, 0);

    let startX = centerX - totalWidth / 2;
    for (const child of children) {
      const childWidth = getSubtreeWidth(child);
      const childCenter = startX + childWidth / 2;
      placeNode(child, childCenter);
      startX += childWidth + SIBLING_GAP;
    }
  }

  if (roots.length === 0) {
    return { layoutNodes: [], width: 100, height: 100 };
  }

  const totalRootWidth = roots.reduce((sum, rid, i) => {
    return sum + getSubtreeWidth(rid) + (i < roots.length - 1 ? SIBLING_GAP : 0);
  }, 0);

  let startX = PAD_X;
  for (const root of roots) {
    const rootWidth = getSubtreeWidth(root);
    const rootCenter = startX + rootWidth / 2;
    placeNode(root, rootCenter);
    startX += rootWidth + SIBLING_GAP;
  }

  let maxX = 0;
  let maxY = 0;
  for (const [, pos] of posMap) {
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  }

  const layoutNodes = nodes.map((n) => {
    const pos = posMap.get(n.id) || { x: PAD_X, y: PAD_Y };
    return { id: n.id, x: pos.x, y: pos.y };
  });

  return {
    layoutNodes,
    width: Math.max(maxX + PAD_X, 120),
    height: Math.max(maxY + PAD_Y + DOT_R * 2, 100),
  };
}

export function MiniGraph() {
  const storeNodes = useGraphStore((s) => s.nodes);
  const storeEdges = useGraphStore((s) => s.edges);
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const setActiveNode = useGraphStore((s) => s.setActiveNode);
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection);
  const setPreviewNode = useGraphStore((s) => s.setPreviewNode);
  const previewNodeId = useGraphStore((s) => s.previewNodeId);
  const { selectNode } = useAgentContext();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(300);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { layoutNodes: lNodes, width: treeW, height: treeH } = useMemo(
    () => layoutVertical(storeNodes),
    [storeNodes]
  );

  const posMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    for (const n of lNodes) map.set(n.id, n);
    return map;
  }, [lNodes]);

  const svgW = Math.max(treeW, containerW);
  const offsetX = (svgW - treeW) / 2;

  const handleClick = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      toggleNodeSelection(id);
      return;
    }
    setPreviewNode(id);
  };

  const handleOpen = (id: string) => {
    setActiveNode(id);
    selectNode(id);
    setPreviewNode(null);
  };

  const previewId = previewNodeId || activeNodeId;
  const previewNode = storeNodes.find((n) => n.id === previewId);

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-48 h-48 rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto relative z-10">
        <svg width={svgW} height={treeH} className="block">
          {storeEdges.map((edge, i) => {
            const s = posMap.get(edge.source);
            const t = posMap.get(edge.target);
            if (!s || !t) return null;

            const sx = offsetX + s.x;
            const sy = s.y + DOT_R;
            const tx = offsetX + t.x;
            const ty = t.y - DOT_R;
            const my = (sy + ty) / 2;

            const isActive =
              edge.source === activeNodeId || edge.target === activeNodeId;

            return (
              <path
                key={i}
                d={`M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                fill="none"
                stroke={isActive ? "var(--accent)" : "var(--accent-border)"}
                strokeWidth={isActive ? "1.5" : "1"}
                strokeOpacity={isActive ? "0.7" : "0.5"}
              />
            );
          })}

          {storeNodes.map((node) => {
            const pos = posMap.get(node.id);
            if (!pos) return null;

            const cx = offsetX + pos.x;
            const cy = pos.y;
            const isActive = node.id === activeNodeId;
            const isSelected = selectedNodeIds.includes(node.id);
            const isHovered = node.id === hoveredId;
            const isPreview = node.id === previewId;

            let fill = "var(--fg-muted)";
            let stroke = "var(--border-strong)";
            let sw = "1.5";
            let r = DOT_R;

            if (isActive) {
              fill = "var(--accent)";
              stroke = "var(--accent)";
              sw = "0";
              r = DOT_R + 1;
            } else if (isPreview) {
              fill = "var(--accent)";
              stroke = "var(--accent-hover)";
              sw = "2";
              r = DOT_R + 0.5;
            } else if (isSelected) {
              fill = "var(--purple)";
              stroke = "var(--purple)";
              sw = "0";
            } else if (isHovered) {
              fill = "var(--fg-secondary)";
              stroke = "var(--fg-secondary)";
              sw = "1.5";
            }

            return (
              <g
                key={node.id}
                onClick={(e) => handleClick(node.id, e)}
                onDoubleClick={() => handleOpen(node.id)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                {isActive && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 5}
                    fill="var(--accent)"
                    fillOpacity="0.20"
                  />
                )}
                {isPreview && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 4}
                    fill="var(--accent)"
                    fillOpacity="0.12"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={sw}
                />
                <title>{node.title}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="border-t border-border-subtle bg-bg-surface/80 backdrop-blur-sm shrink-0 relative z-10" style={{ height: "160px" }}>
        <NodePreview
          node={previewNode ?? null}
          onOpen={previewNode ? () => handleOpen(previewNode.id) : undefined}
        />
      </div>
    </div>
  );
}

function NodePreview({
  node,
  onOpen,
}: {
  node: Node | null;
  onOpen?: () => void;
}) {
  if (!node) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-bg-elevated/50 border border-border-subtle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted">
              <circle cx="12" cy="12" r="3"/>
              <circle cx="19" cy="5" r="2"/>
              <circle cx="5" cy="19" r="2"/>
              <line x1="12" y1="9" x2="12" y2="15"/>
              <line x1="14.5" y1="10.5" x2="17.5" y2="7"/>
              <line x1="9.5" y1="13.5" x2="6.5" y2="17"/>
            </svg>
          </div>
          <p className="text-xs text-fg-muted">Click a node to preview</p>
        </div>
      </div>
    );
  }

  const lastMessages = node.messages.slice(-3);

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(135deg, var(--accent), var(--blue))" }} />
          <span className="text-xs font-medium text-fg-primary truncate">{node.title}</span>
          <span className="text-[10px] text-fg-muted font-mono bg-bg-elevated px-1.5 py-0.5 rounded">{node.messages.length}</span>
        </div>
        {onOpen && (
          <button
            onClick={onOpen}
            className="text-[11px] text-accent hover:bg-accent-muted px-2 py-0.5 rounded-md transition-colors font-medium border border-accent/20"
          >
            Open
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {lastMessages.length === 0 ? (
          <p className="text-[11px] text-fg-muted text-center py-2">No messages</p>
        ) : (
          lastMessages.map((msg) => {
            const isUser = msg.role === "user";
            const text = msg.content.map((c) => c.text).filter(Boolean).join(" ");
            return (
              <div key={msg.id} className="flex gap-2 items-start">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5`}
                  style={{
                    background: isUser
                      ? "linear-gradient(135deg, var(--blue), var(--cyan))"
                      : "linear-gradient(135deg, var(--green), var(--teal))",
                  }}>
                  <div className="w-1 h-1 rounded-full bg-white/80" />
                </div>
                <div className={`flex-1 min-w-0 rounded-lg px-2 py-1 border ${
                  isUser ? "" : ""
                }`}
                  style={{
                    background: isUser
                      ? "linear-gradient(135deg, rgba(91, 158, 240, 0.08), rgba(56, 200, 224, 0.04))"
                      : "var(--bg-elevated)",
                    borderColor: isUser ? "rgba(91, 158, 240, 0.15)" : "var(--border-subtle)",
                  }}>
                  {isUser ? (
                    <p className="text-[11px] text-fg-secondary line-clamp-2">{text}</p>
                  ) : (
                    <div className="text-[11px] text-fg-secondary line-clamp-2">
                      <Markdown content={text} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
