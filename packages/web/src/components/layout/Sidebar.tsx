import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGraphStore } from "@/stores/graph-store";
import { useGraphListStore } from "@/stores/graph-list-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import { config } from "@/lib/config";
import { graphAvatarColor } from "@/lib/colors";
import { ModelSelector } from "./ModelSelector";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const router = useNavigate();
  const params = useParams();
  const currentGraphId = params.id;
  const graphs = useGraphListStore((s) => s.graphs);
  const graphsLoading = useGraphListStore((s) => s.loading);
  const graphsError = useGraphListStore((s) => s.error);
  const loadGraphs = useGraphListStore((s) => s.load);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const nodes = useGraphStore((s) => s.nodes);
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const { selectNode } = useAgentContext();
  const sidebarWidthRef = useRef(224);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const dragSidebar = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const onSidebarDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragSidebar.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidthRef.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragSidebar.current) return;
      const newW = Math.min(400, Math.max(160, dragStartW.current + e.clientX - dragStartX.current));
      sidebarWidthRef.current = newW;
      setSidebarWidth(newW);
    };
    const onMouseUp = () => {
      if (dragSidebar.current) {
        dragSidebar.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    loadGraphs();
  }, [loadGraphs]);

  const createGraph = async () => {
    if (creating) return;
    const title = newTitle.trim() || "Untitled Graph";
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${config.apiUrl}/api/graphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Failed to create graph (${res.status})`);
      const graph = await res.json();
      setNewTitle("");
      loadGraphs();
      router(`/graph/${graph.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create graph");
    } finally {
      setCreating(false);
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 bg-bg-surface/80 backdrop-blur-sm flex flex-col items-center py-3 gap-1.5 shrink-0 border-r border-border-subtle">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-accent hover:bg-accent-muted transition-colors"
          onClick={onToggle}
          title="Expand sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <div className="w-4 h-px bg-border-subtle my-1" />
        {graphsLoading && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse mt-1"
            style={{ background: "var(--fg-faint)" }}
            title="Loading graphs…"
          />
        )}
        {!graphsLoading && graphsError && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-red hover:bg-accent-muted transition-colors"
            onClick={loadGraphs}
            title={`${graphsError} — click to retry`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="7" x2="12" y2="13"/>
              <line x1="12" y1="16.5" x2="12" y2="16.5"/>
            </svg>
          </button>
        )}
        {!graphsLoading && !graphsError && graphs.map((g, i) => (
          <button
            key={g.id}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
              g.id === currentGraphId
                ? "text-white shadow-glow scale-105"
                : "text-fg-muted hover:text-fg-primary hover:bg-bg-hover"
            }`}
            style={g.id === currentGraphId ? {
              background: `linear-gradient(135deg, ${graphAvatarColor(i)}, ${graphAvatarColor(i + 1)})`
            } : {}}
            onClick={() => router(`/graph/${g.id}`)}
            title={g.title}
          >
            {g.title.charAt(0).toUpperCase()}
          </button>
        ))}

        <div className="flex-1" />

        <ModelSelector collapsed />
      </div>
    );
  }

  return (
    <div className="bg-bg-surface/80 backdrop-blur-sm flex flex-col shrink-0 relative border-r border-border-subtle"
      style={{ width: sidebarWidth }}>
      <div
        className="absolute right-0 top-0 bottom-0 w-px hover:w-[3px] active:bg-accent cursor-col-resize transition-all z-10 group"
        onMouseDown={onSidebarDragStart}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-accent/10 transition-colors" />
      </div>
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-glow"
            style={{ background: "var(--gradient-primary)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span className="text-sm font-semibold bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-primary)" }}>Graph PI</span>
        </div>
        <button
          className="w-6 h-6 rounded-md flex items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-hover transition-colors"
          onClick={onToggle}
          title="Collapse sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="flex gap-1.5">
          <input
            className="flex-1 bg-bg-elevated/80 border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-fg-primary placeholder:text-fg-muted min-w-0 transition-all focus:border-accent focus:shadow-glow"
            placeholder="New graph..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGraph()}
          />
          <button
            className="text-white px-2.5 py-1.5 rounded-lg text-xs transition-all hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-glow"
            style={{ background: "var(--gradient-primary)" }}
            onClick={createGraph}
            disabled={creating}
            title="Create graph"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        {createError && (
          <p className="text-[10px] text-red mt-1.5 px-0.5">{createError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-1.5">
        {graphsLoading && (
          <p className="text-[11px] text-fg-muted px-2.5 py-2">Loading graphs…</p>
        )}
        {!graphsLoading && graphsError && (
          <div className="px-2.5 py-2">
            <p className="text-[11px] text-red mb-1">{graphsError}</p>
            <button className="text-[11px] text-accent hover:underline" onClick={loadGraphs}>
              Retry
            </button>
          </div>
        )}
        {!graphsLoading && !graphsError && graphs.map((g, i) => {
          const color = graphAvatarColor(i);
          return (
            <div key={g.id}>
              <button
                className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-all flex items-center gap-2 ${
                  g.id === currentGraphId
                    ? "text-white shadow-sm"
                    : "text-fg-secondary hover:bg-bg-hover/50 hover:text-fg-primary"
                }`}
                style={g.id === currentGraphId ? {
                  background: `linear-gradient(135deg, ${color}20, ${color}08)`,
                  borderColor: `${color}40`,
                  borderWidth: "1px",
                  borderStyle: "solid",
                } : {}}
                onClick={() => router(`/graph/${g.id}`)}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                  g.id === currentGraphId ? "scale-125" : ""
                }`} style={{ background: g.id === currentGraphId ? color : "var(--fg-faint)" }} />
                <span className="truncate">{g.title}</span>
              </button>
              {g.id === currentGraphId && nodes.length > 0 && (
                <div className="ml-4 border-l pl-2 py-0.5 mb-1" style={{ borderColor: `${color}30` }}>
                  {nodes.slice(0, 20).map((node) => (
                    <button
                      key={node.id}
                      className={`w-full text-left px-2 py-1 text-[11px] rounded-md transition-all truncate block ${
                        node.id === activeNodeId
                          ? "font-medium"
                          : "text-fg-muted hover:text-fg-secondary hover:bg-bg-hover/30"
                      }`}
                      style={node.id === activeNodeId ? {
                        color: color,
                        background: `${color}15`,
                      } : {}}
                      onClick={() => {
                        useGraphStore.getState().setActiveNode(node.id);
                        selectNode(node.id);
                      }}
                    >
                      {node.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ModelSelector collapsed={false} />
    </div>
  );
}
