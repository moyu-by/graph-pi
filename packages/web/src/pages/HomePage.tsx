import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { config } from "@/lib/config";
import { useGraphListStore } from "@/stores/graph-list-store";

export default function HomePage() {
  const router = useNavigate();
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

        {/* Graph network illustration */}
        <div className="relative w-48 h-48 mx-auto mt-6 select-none">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 192 192" fill="none">
            <circle cx="96" cy="96" r="72" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 4" />
            <circle cx="96" cy="96" r="48" stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="2 5" />
            <line x1="96" y1="24" x2="96" y2="48" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
            <line x1="158.5" y1="58.5" x2="130" y2="72" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
            <line x1="158.5" y1="133.5" x2="130" y2="120" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
            <line x1="96" y1="168" x2="96" y2="144" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
            <line x1="33.5" y1="133.5" x2="62" y2="120" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
            <line x1="33.5" y1="58.5" x2="62" y2="72" stroke="var(--border-default)" strokeWidth="1" opacity="0.6" />
            <line x1="48" y1="96" x2="72" y2="96" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
            <line x1="120" y1="96" x2="144" y2="96" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
            <line x1="96" y1="138" x2="96" y2="124" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
            <line x1="96" y1="68" x2="96" y2="54" stroke="var(--border-default)" strokeWidth="0.8" opacity="0.4" />
          </svg>
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full animate-glow-pulse"
            style={{ background: "var(--purple)", boxShadow: "0 0 6px var(--purple)" }} />
          <div className="absolute top-[52px] right-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
            style={{ background: "var(--blue)", boxShadow: "0 0 6px var(--blue)", animationDelay: "0.3s" }} />
          <div className="absolute bottom-[52px] right-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
            style={{ background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)", animationDelay: "0.6s" }} />
          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full animate-glow-pulse"
            style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)", animationDelay: "0.9s" }} />
          <div className="absolute bottom-[52px] left-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
            style={{ background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)", animationDelay: "1.2s" }} />
          <div className="absolute top-[52px] left-[8px] w-2.5 h-2.5 rounded-full animate-glow-pulse"
            style={{ background: "var(--blue)", boxShadow: "0 0 6px var(--blue)", animationDelay: "0.15s" }} />
          <div className="absolute top-[62px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 4px var(--accent)" }} />
          <div className="absolute top-[88px] right-[62px] w-2 h-2 rounded-full"
            style={{ background: "var(--purple)", boxShadow: "0 0 4px var(--purple)" }} />
          <div className="absolute top-[88px] left-[62px] w-2 h-2 rounded-full"
            style={{ background: "var(--purple)", boxShadow: "0 0 4px var(--purple)" }} />
          <div className="absolute bottom-[62px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 4px var(--accent)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex items-center justify-center animate-glow-pulse shadow-glow"
            style={{ background: "var(--gradient-primary)" }}>
            <span className="text-white text-2xl font-bold font-mono leading-none" style={{ fontFamily: "var(--font-mono)" }}>π</span>
          </div>
        </div>
      </div>
    </div>
  );
}
