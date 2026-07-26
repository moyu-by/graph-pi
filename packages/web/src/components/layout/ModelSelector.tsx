import { useState, useRef, useEffect, forwardRef } from "react";
import { useModelStore } from "@/stores/model-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import type { ModelProvider } from "@graph-pi/shared";

export function ModelSelector({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const providers = useModelStore((s) => s.providers);
  const currentProvider = useModelStore((s) => s.currentProvider);
  const currentModelId = useModelStore((s) => s.currentModelId);
  const setCurrent = useModelStore((s) => s.setCurrent);
  const loading = useModelStore((s) => s.loading);
  const error = useModelStore((s) => s.error);
  const setError = useModelStore((s) => s.setError);
  const setLoading = useModelStore((s) => s.setLoading);
  const { send } = useAgentContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const currentModel = useModelStore((s) => s.getCurrentModel());

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Check server connection.");
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading, setError, setLoading]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelectModel = (provider: string, modelId: string) => {
    setCurrent(provider, modelId);
    send({ type: "set_model", provider, modelId });
    setOpen(false);
  };

  if (collapsed) {
    return (
      <div className="relative px-1 py-1 border-t border-border-subtle">
        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-center h-8 rounded-lg text-fg-muted hover:text-accent hover:bg-accent-muted transition-colors"
          title={currentModel ? `${currentModel.name}` : "Select model"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </button>
        {open && (
          <ModelPanel
            ref={panelRef}
            providers={providers}
            currentProvider={currentProvider}
            currentModelId={currentModelId}
            loading={loading}
            error={error}
            onRetry={() => { setError(null); setLoading(true); send({ type: "list_models" }); }}
            onSelect={handleSelectModel}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative px-2 py-2 border-t border-border-subtle">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-bg-hover/50 transition-colors group"
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-primary)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-medium text-fg-primary truncate leading-tight" title={currentModel?.name || "Select model"}>
            {currentModel?.name || "Select model"}
          </p>
          <p className="text-[10px] text-fg-muted truncate leading-tight mt-0.5" title={currentModel?.id || ""}>
            {currentModel?.id || ""}
          </p>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-fg-faint group-hover:text-accent transition-colors shrink-0">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <ModelPanel
          ref={panelRef}
          providers={providers}
          currentProvider={currentProvider}
          currentModelId={currentModelId}
          loading={loading}
          error={error}
          onRetry={() => { setError(null); setLoading(true); send({ type: "list_models" }); }}
          onSelect={handleSelectModel}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

interface PanelProps {
  providers: ModelProvider[];
  currentProvider: string;
  currentModelId: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (provider: string, modelId: string) => void;
  onClose: () => void;
}

const ModelPanel = forwardRef<HTMLDivElement, PanelProps>(
  ({ providers, currentProvider, currentModelId, loading, error, onRetry, onSelect }, ref) => {
    const [search, setSearch] = useState("");
    const [expandedAll, setExpandedAll] = useState(true);

    const configuredProviders = providers.filter((p) => p.configured);
    const unconfiguredProviders = providers.filter((p) => !p.configured);

    const matches = (p: ModelProvider) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.models.some((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      );
    };

    const filteredConfigured = configuredProviders.filter(matches);
    const filteredUnconfigured = unconfiguredProviders.filter(matches);

    if (!loading && search) setExpandedAll(true);

    return (
      <div
        ref={ref}
        className="absolute bottom-full left-2 right-2 mb-2 bg-bg-surface border border-border-default rounded-xl shadow-lg overflow-hidden z-50"
        style={{ maxHeight: "min(400px, 60vh)" }}
      >
        <div className="p-3 border-b border-border-subtle"
          style={{ background: "linear-gradient(135deg, rgba(124, 108, 240, 0.06), rgba(91, 158, 240, 0.03))" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="text-xs font-medium text-fg-primary">Switch Model</span>
            </div>
            <button
              onClick={() => setExpandedAll((v) => !v)}
              className="text-[10px] text-fg-muted hover:text-accent transition-colors px-1.5 py-0.5 rounded hover:bg-accent-muted"
            >
              {expandedAll ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <input
            className="w-full bg-bg-elevated border border-border-strong rounded-lg px-2.5 py-1.5 text-xs text-fg-primary placeholder:text-fg-muted transition-all focus:border-accent"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="overflow-y-auto max-h-72">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
              <span className="text-xs text-fg-muted ml-2">Loading models...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center py-6 px-4 text-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red mb-2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <p className="text-xs text-fg-muted mb-2">{error}</p>
              <button onClick={onRetry} className="text-[11px] text-accent hover:bg-accent-muted px-2.5 py-1 rounded-md transition-colors font-medium">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredConfigured.length === 0 && filteredUnconfigured.length === 0 && (
            <div className="flex flex-col items-center py-8 px-4 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-faint mb-2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p className="text-xs text-fg-faint">No models match</p>
            </div>
          )}

          {!loading && filteredConfigured.map((p) => (
            <ProviderGroup
              key={p.id}
              provider={p}
              currentProvider={currentProvider}
              currentModelId={currentModelId}
              onSelect={onSelect}
              configured
              defaultExpanded={expandedAll}
            />
          ))}

          {filteredUnconfigured.length > 0 && (
            <div className="border-t border-border-subtle">
              <div className="px-3 py-1.5">
                <p className="text-[10px] text-fg-faint uppercase tracking-wider font-medium">Unconfigured</p>
              </div>
              {filteredUnconfigured.map((p) => (
                <ProviderGroup
                  key={p.id}
                  provider={p}
                  currentProvider={currentProvider}
                  currentModelId={currentModelId}
                  onSelect={onSelect}
                  configured={false}
                  defaultExpanded={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ModelPanel.displayName = "ModelPanel";

function ProviderGroup({
  provider,
  currentProvider,
  currentModelId,
  onSelect,
  configured,
  defaultExpanded,
}: {
  provider: ModelProvider;
  currentProvider: string;
  currentModelId: string;
  onSelect: (provider: string, modelId: string) => void;
  configured: boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const providerColors: Record<string, string> = {
    anthropic: "var(--amber)",
    openai: "var(--green)",
    google: "var(--blue)",
    deepseek: "var(--cyan)",
    xiaomi: "var(--accent)",
    openrouter: "var(--purple)",
    groq: "var(--pink)",
    github: "var(--fg-primary)",
  };
  const color = Object.entries(providerColors).find(([k]) =>
    provider.id.includes(k)
  )?.[1] || "var(--fg-muted)";

  return (
    <div className="px-2 py-0.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg hover:bg-bg-hover/30 transition-colors"
      >
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-fg-faint transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[11px] font-medium text-fg-secondary">{provider.name}</span>
        {!configured && (
          <span className="text-[9px] text-fg-faint bg-bg-elevated px-1 py-0.5 rounded ml-auto">no key</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-0.5 pl-5 mt-0.5">
          {provider.models.map((m) => {
            const isActive = provider.id === currentProvider && m.id === currentModelId;
            return (
              <button
                key={`${provider.id}/${m.id}`}
                onClick={() => configured && onSelect(provider.id, m.id)}
                disabled={!configured}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                  isActive
                    ? "shadow-sm"
                    : configured
                      ? "hover:bg-bg-hover/50"
                      : "opacity-50 cursor-not-allowed"
                }`}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${color}20, ${color}08)`,
                  border: `1px solid ${color}30`,
                } : {
                  border: "1px solid transparent",
                }}
              >
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                )}
                {!isActive && <div className="w-1.5 h-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-fg-primary truncate font-medium" title={m.name}>{m.name}</p>
                  <p className="text-[10px] text-fg-faint truncate font-mono" title={`${m.contextWindow.toLocaleString()} ctx${m.reasoning ? " · thinking" : ""}`}>
                    {m.contextWindow.toLocaleString()} ctx
                    {m.reasoning && " · thinking"}
                  </p>
                </div>
                <div className="text-[9px] text-fg-faint font-mono shrink-0 text-right">
                  <span>${m.cost.output.toFixed(2)}/M</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
