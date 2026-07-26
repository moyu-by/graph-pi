import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { config } from "@/lib/config";
import { useGraphListStore } from "@/stores/graph-list-store";
import { graphAvatarColor } from "@/lib/colors";

export default function HomePage() {
  const router = useNavigate();
  const graphs = useGraphListStore((s) => s.graphs);
  const graphsLoading = useGraphListStore((s) => s.loading);
  const graphsError = useGraphListStore((s) => s.error);
  const loadGraphs = useGraphListStore((s) => s.load);
  const [newTitle, setNewTitle] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      loadGraphs();
      router(`/graph/${graph.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create graph");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-screen flex bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--blue) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--cyan) 0%, transparent 70%)" }} />
      </div>

      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 relative z-10">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-glow relative"
            style={{ background: "var(--gradient-primary)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5" strokeOpacity="0.5"/>
              <line x1="12" y1="19" x2="12" y2="22" strokeOpacity="0.5"/>
              <line x1="2" y1="12" x2="5" y2="12" strokeOpacity="0.5"/>
              <line x1="19" y1="12" x2="22" y2="12" strokeOpacity="0.5"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-primary)" }}>
            Graph PI
          </h1>
          <p className="text-xs text-fg-muted mt-2">Graph-based context management for AI agents</p>
        </div>

        <div className="flex gap-2 w-full max-w-sm">
          <input
            className="flex-1 bg-bg-elevated/80 backdrop-blur-sm border border-border-strong rounded-xl px-4 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted transition-all focus:border-accent focus:shadow-glow"
            placeholder="Graph title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGraph()}
          />
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-glow hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-glow"
            style={{ background: "var(--gradient-primary)" }}
            onClick={createGraph}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {createError && (
          <p className="text-xs text-red text-center max-w-sm -mt-2">{createError}</p>
        )}

        <div className="w-full max-w-md mt-4">
          {graphsLoading && (
            <div className="text-center mt-8">
              <p className="text-xs text-fg-muted">Loading graphs…</p>
            </div>
          )}
          {!graphsLoading && graphsError && (
            <div className="text-center mt-8">
              <p className="text-xs text-red mb-2">{graphsError}</p>
              <button
                className="text-xs text-accent hover:underline"
                onClick={loadGraphs}
              >
                Retry
              </button>
            </div>
          )}
          {!graphsLoading && !graphsError && graphs.length === 0 && (
            <div className="text-center mt-8">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-bg-elevated/50 border border-border-subtle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
              <p className="text-xs text-fg-muted">Create your first graph to get started</p>
            </div>
          )}
          {!graphsLoading && !graphsError && graphs.map((g, i) => {
            const color = graphAvatarColor(i);
            return (
            <div
              key={g.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group hover:bg-bg-elevated/60 hover:border-border-default border border-transparent hover:shadow-sm mb-1"
              onClick={() => router(`/graph/${g.id}`)}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)`, border: `1px solid ${color}30)` }}>
                <span className="text-xs font-semibold" style={{ color }}>
                  {g.title.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-fg-primary truncate group-hover:text-white transition-colors">{g.title}</h3>
                <p className="text-[10px] text-fg-muted font-mono mt-0.5">
                  {new Date(g.createdAt).toLocaleDateString()}
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                className="text-fg-faint group-hover:text-accent transition-all group-hover:translate-x-0.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
