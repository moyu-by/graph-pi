import { create } from "zustand";
import type { ModelInfo, ModelProvider } from "@graph-pi/shared";

const STORAGE_KEY = "graph-pi-model";

function loadPersisted(): { provider: string; modelId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: "xiaomi", modelId: "mimo-v2.5" };
}

function persist(provider: string, modelId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, modelId }));
  } catch {}
}

interface ModelState {
  providers: ModelProvider[];
  currentProvider: string;
  currentModelId: string;
  loading: boolean;
  error: string | null;
  setProviders: (providers: ModelProvider[]) => void;
  setCurrent: (provider: string, modelId: string) => void;
  setLoading: (v: boolean) => void;
  setError: (err: string | null) => void;
  getCurrentModel: () => ModelInfo | undefined;
}

const persisted = loadPersisted();

export const useModelStore = create<ModelState>((set, get) => ({
  providers: [],
  currentProvider: persisted.provider,
  currentModelId: persisted.modelId,
  loading: false,
  error: null,
  setProviders: (providers) => set({ providers }),
  setCurrent: (currentProvider, currentModelId) => {
    persist(currentProvider, currentModelId);
    set({ currentProvider, currentModelId });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  getCurrentModel: () => {
    const { providers, currentProvider, currentModelId } = get();
    const prov = providers.find((p) => p.id === currentProvider);
    if (!prov) return undefined;
    return prov.models.find((m) => m.id === currentModelId);
  },
}));
