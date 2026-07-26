import { useGraphStore } from "@/stores/graph-store";

export function useGraph() {
  const graph = useGraphStore((s) => s.graph);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const canvasMode = useGraphStore((s) => s.canvasMode);
  const previewNodeId = useGraphStore((s) => s.previewNodeId);
  const setActiveNode = useGraphStore((s) => s.setActiveNode);
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setCanvasMode = useGraphStore((s) => s.setCanvasMode);
  const cycleCanvasMode = useGraphStore((s) => s.cycleCanvasMode);
  const setPreviewNode = useGraphStore((s) => s.setPreviewNode);

  const activeNode = nodes.find((n) => n.id === activeNodeId) ?? null;
  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  return {
    graph,
    nodes,
    edges,
    activeNode,
    activeNodeId,
    selectedNodes,
    selectedNodeIds,
    canvasMode,
    previewNodeId,
    setActiveNode,
    toggleNodeSelection,
    clearSelection,
    setCanvasMode,
    cycleCanvasMode,
    setPreviewNode,
  };
}
