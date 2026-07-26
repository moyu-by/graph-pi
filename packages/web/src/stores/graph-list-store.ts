import { create } from "zustand";
import { config } from "@/lib/config";

export interface GraphSummary {
  id: string;
  title: string;
  createdAt: number;
}

interface GraphListState {
  graphs: GraphSummary[];
  loading: boolean;
  error: string | null;
  load: () => void;
}

// HomePage and Sidebar both need "all graphs" and were each independently
// fetching /api/graphs on mount — same data, two requests, and any change
// made through one (create/rename) wasn't reflected in the other until its
// own next fetch. Centralizing here means one fetch, one cache, both read it.
let inFlight: Promise<void> | null = null;

export const useGraphListStore = create<GraphListState>((set) => ({
  graphs: [],
  loading: true,
  error: null,

  load: () => {
    if (inFlight) return;
    set({ loading: true, error: null });
    inFlight = fetch(`${config.apiUrl}/api/graphs`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load graphs (${r.status})`);
        return r.json();
      })
      .then((graphs: GraphSummary[]) => set({ graphs, loading: false }))
      .catch((err) => {
        set({
          error: err instanceof Error ? err.message : "Failed to load graphs",
          loading: false,
        });
      })
      .finally(() => {
        inFlight = null;
      });
  },
}));
