import { useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeCard, type GraphNode } from "./NodeCard";
import { EdgeLine } from "./EdgeLine";
import { MiniGraph } from "./MiniGraph";
import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";

const nodeTypes = { nodeCard: NodeCard };
const edgeTypes = { edgeLine: EdgeLine };

const POSITION_OFFSET_X = 240;
const POSITION_OFFSET_Y = 140;

function layoutTree(
  nodes: { id: string; parentIds: string[] }[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
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

  let yOffset = 0;
  function placeTree(nodeId: string, x: number) {
    positions.set(nodeId, { x, y: yOffset });
    yOffset += POSITION_OFFSET_Y;
    const children = childrenMap.get(nodeId) || [];
    for (const child of children) {
      placeTree(child, x + POSITION_OFFSET_X);
    }
  }

  for (const root of roots) {
    placeTree(root, 0);
  }

  return positions;
}

export function GraphPanel() {
  const storeNodes = useGraphStore((s) => s.nodes);
  const storeEdges = useGraphStore((s) => s.edges);
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const setActiveNode = useGraphStore((s) => s.setActiveNode);
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection);
  const canvasMode = useGraphStore((s) => s.canvasMode);
  const { selectNode } = useAgentContext();

  const positions = useMemo(() => layoutTree(storeNodes), [storeNodes]);

  const computedNodes: GraphNode[] = useMemo(
    () =>
      storeNodes.map((n) => ({
        id: n.id,
        type: "nodeCard",
        position: positions.get(n.id) || { x: 0, y: 0 },
        data: {
          label: n.title,
          messageCount: n.messages.length,
          isActive: n.id === activeNodeId,
          isLocked: n.hasChildren === true,
          isCompressed: n.isCompressed,
          isSelected: selectedNodeIds.includes(n.id),
        },
      })),
    [storeNodes, activeNodeId, positions, selectedNodeIds]
  );

  const computedEdges: Edge[] = useMemo(
    () =>
      storeEdges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: "edgeLine",
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [storeEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.shiftKey) {
        toggleNodeSelection(node.id);
        return;
      }

      if (node.id !== activeNodeId) {
        setActiveNode(node.id);
        selectNode(node.id);
      }
    },
    [activeNodeId, setActiveNode, selectNode, toggleNodeSelection]
  );

  if (canvasMode === "collapsed") {
    return <MiniGraph />;
  }

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "200px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesConnectable={false}
        elementsSelectable
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
