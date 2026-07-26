import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { NodeDetail } from "@/components/graph/NodeDetail";
import { MergeDialog } from "@/components/merge/MergeDialog";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResizablePanels } from "@/components/layout/ResizablePanels";
import { useAgentContext } from "@/hooks/useAgentContext";
import { useGraphStore } from "@/stores/graph-store";
import { useChatStore } from "@/stores/chat-store";

export default function GraphPage() {
  const params = useParams();
  const graphId = params.id as string;
  const { selectGraph } = useAgentContext();
  const graph = useGraphStore((s) => s.graph);
  const [showMerge, setShowMerge] = useState(false);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const error = useChatStore((s) => s.error);
  const setError = useChatStore((s) => s.setError);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const canvasMode = useGraphStore((s) => s.canvasMode);
  const cycleCanvasMode = useGraphStore((s) => s.cycleCanvasMode);

  useEffect(() => {
    if (graphId) {
      selectGraph(graphId);
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [graphId, selectGraph]);

  useEffect(() => {
    if (graph) setLoading(false);
  }, [graph]);

  const rightVisible = canvasMode !== "hidden";

  const rightPanel = (
    <div className="flex-1 flex flex-col min-h-0 bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--cyan) 0%, transparent 70%)" }} />
      </div>
      <div className="flex items-center justify-between px-4 py-2 shrink-0 relative z-10">
        <span className="text-xs text-fg-muted flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cyan)" }} />
          {canvasMode === "expanded" ? "Graph" : "Tree"}
        </span>
        <button
          className="text-fg-muted hover:text-accent p-1.5 rounded-md hover:bg-accent-muted transition-colors"
          onClick={cycleCanvasMode}
        >
          {canvasMode === "expanded" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          ) : canvasMode === "collapsed" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          )}
        </button>
      </div>
      <div className="flex-1 min-h-0 relative z-10">
        <GraphPanel />
      </div>
      {canvasMode === "expanded" && <NodeDetail />}
    </div>
  );

  return (
    <div className="h-screen flex bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
      </div>

      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border-subtle"
          style={{ background: "linear-gradient(180deg, var(--bg-surface) 0%, transparent 100%)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
            <h1 className="text-sm font-medium text-fg-primary">
              {loading ? "Loading..." : graph?.title ?? "Untitled"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedNodeIds.length >= 2 && (
              <button
                className="px-3 py-1.5 text-xs text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--purple), var(--pink))" }}
                onClick={() => setShowMerge(true)}
              >
                Merge ({selectedNodeIds.length})
              </button>
            )}
            {!rightVisible && (
              <button
                className="p-2 text-fg-muted hover:text-accent rounded-lg hover:bg-accent-muted transition-colors"
                onClick={cycleCanvasMode}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3"/>
                  <circle cx="19" cy="5" r="2"/>
                  <circle cx="5" cy="19" r="2"/>
                  <line x1="12" y1="9" x2="12" y2="15"/>
                  <line x1="14.5" y1="10.5" x2="17.5" y2="7"/>
                  <line x1="9.5" y1="13.5" x2="6.5" y2="17"/>
                </svg>
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="mx-5 mb-2 px-3 py-2 bg-red-muted rounded-lg text-red text-xs flex items-center justify-between border border-red/10">
            <span>{error}</span>
            <button className="text-red/60 hover:text-red p-0.5" onClick={() => setError(null)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        <ResizablePanels
          left={<ChatPanel />}
          right={rightPanel}
          rightVisible={rightVisible}
          initialRightWidth={canvasMode === "collapsed" ? 280 : 420}
          minRightWidth={canvasMode === "collapsed" ? 240 : 320}
          maxRightWidth={800}
        />
      </div>

      {showMerge && <MergeDialog onClose={() => setShowMerge(false)} />}
    </div>
  );
}
