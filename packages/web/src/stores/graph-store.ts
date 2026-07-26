import { create } from "zustand";
import type { Graph, Node } from "@graph-pi/shared";

export type CanvasMode = "expanded" | "collapsed" | "hidden";

interface GraphState {
  graph: Graph | null;
  nodes: Node[];
  edges: { source: string; target: string }[];
  selectedNodeIds: string[];
  activeNodeId: string | null;
  canvasMode: CanvasMode;
  previewNodeId: string | null;

  setGraphState: (g: Graph, ns: Node[], es: { source: string; target: string }[]) => void;
  setActiveNode: (id: string) => void;
  toggleNodeSelection: (id: string) => void;
  clearSelection: () => void;
  setCanvasMode: (mode: CanvasMode) => void;
  cycleCanvasMode: () => void;
  setPreviewNode: (id: string | null) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  activeNodeId: null,
  canvasMode: "expanded",
  previewNodeId: null,

  setGraphState: (graph, nodes, edges) =>
    set((s) => {
      // graph_state is re-broadcast after every message/branch/merge, not just
      // on first load — resetting to root unconditionally on each one would
      // silently pull the user back to root while they're mid-conversation on
      // a branch. Keep the current active node as long as it still exists;
      // only fall back to root on first load or if it was deleted.
      const currentStillValid = s.activeNodeId !== null && nodes.some((n) => n.id === s.activeNodeId);
      const root = nodes.find((n) => n.id === graph.rootNodeId);
      return {
        graph,
        nodes,
        edges,
        activeNodeId: currentStillValid ? s.activeNodeId : (root?.id ?? null),
      };
    }),

  setActiveNode: (id) => set({ activeNodeId: id, selectedNodeIds: [] }),

  toggleNodeSelection: (id) =>
    set((s) => ({
      selectedNodeIds: s.selectedNodeIds.includes(id)
        ? s.selectedNodeIds.filter((nid) => nid !== id)
        : [...s.selectedNodeIds, id],
    })),

  clearSelection: () => set({ selectedNodeIds: [] }),

  setCanvasMode: (mode) => set({ canvasMode: mode, previewNodeId: null }),

  cycleCanvasMode: () =>
    set((s) => {
      const next: CanvasMode =
        s.canvasMode === "expanded" ? "collapsed" : s.canvasMode === "collapsed" ? "hidden" : "expanded";
      return { canvasMode: next, previewNodeId: null };
    }),

  setPreviewNode: (id) => set({ previewNodeId: id }),
}));
