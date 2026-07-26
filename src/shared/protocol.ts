import type { Graph, Node, ContextPreview, StreamEvent, ModelInfo } from "./types.js";

export type ClientMessage =
  | { type: "select_graph"; graphId: string }
  | { type: "select_node"; nodeId: string }
  | { type: "send_message"; nodeId: string; content: string }
  | { type: "create_branch"; parentNodeId: string; afterMessageId: string }
  | { type: "merge_nodes"; parentNodeIds: string[]; compressNodeIds: string[] }
  | { type: "compress_node"; nodeId: string }
  | { type: "delete_node"; nodeId: string }
  | { type: "update_node_title"; nodeId: string; title: string }
  | { type: "list_models" }
  | { type: "set_model"; provider: string; modelId: string };

export type ServerMessage =
  | { type: "graph_state"; graph: GraphState }
  | { type: "node_selected"; node: Node; context: ContextPreview }
  | { type: "message_stream"; nodeId: string; event: StreamEvent }
  | { type: "branch_created"; node: Node; parent: Node }
  | { type: "merge_created"; newNode: Node }
  | { type: "node_compressed"; nodeId: string; summary: string }
  | { type: "models_list"; providers: ModelProvider[]; current: { provider: string; modelId: string } }
  | { type: "model_changed"; provider: string; modelId: string }
  | { type: "error"; message: string };

export interface ModelProvider {
  id: string;
  name: string;
  models: ModelInfo[];
  configured: boolean;
}

export interface GraphState {
  graph: Graph;
  nodes: Node[];
  edges: { source: string; target: string }[];
  activeNodeId: string | null;
}
