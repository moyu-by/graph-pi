import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { ClientMessage, ServerMessage, GraphState, ModelInfo } from "@graph-pi/shared";
import { getAncestorClosure } from "@graph-pi/shared";
import type { GraphStore } from "../db/graph-store.js";
import { AgentService } from "../agent/agent-service.js";
import { ContextBuilder } from "../agent/context-builder.js";
import { Compressor } from "../compress/compressor.js";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import type { Model, Api } from "@earendil-works/pi-ai";

interface ClientState {
  graphId: string | null;
  activeNodeId: string | null;
  provider: string;
  modelId: string;
}

let sharedModels: ReturnType<typeof builtinModels> | null = null;
let modelsReady: Promise<void> | null = null;

async function getModels(): Promise<ReturnType<typeof builtinModels>> {
  if (!sharedModels) {
    sharedModels = builtinModels();
    modelsReady = sharedModels.refresh().then(() => { modelsReady = null; });
  }
  if (modelsReady) await modelsReady;
  return sharedModels;
}

function toModelInfo(model: Model<Api>): ModelInfo {
  return {
    id: model.id,
    name: model.name,
    api: model.api,
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    reasoning: model.reasoning,
    input: [...model.input],
    cost: {
      input: model.cost.input,
      output: model.cost.output,
      cacheRead: model.cost.cacheRead,
      cacheWrite: model.cost.cacheWrite,
    },
  };
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientState>();

  constructor(
    server: Server,
    private store: GraphStore,
    private tools: AgentTool[] = []
  ) {
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws) => {
      const state: ClientState = {
        graphId: null,
        activeNodeId: null,
        provider: process.env.LLM_PROVIDER || "xiaomi",
        modelId: process.env.LLM_MODEL || "mimo-v2.5",
      };
      this.clients.set(ws, state);

      ws.on("message", (data) => {
        try {
          const msg: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(ws, state, msg);
        } catch {
          this.send(ws, {
            type: "error",
            message: "Invalid message format",
          });
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });
  }

  private async handleMessage(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage
  ): Promise<void> {
    try {
      switch (msg.type) {
        case "select_graph":
          await this.handleSelectGraph(ws, state, msg.graphId);
          break;
        case "select_node":
          await this.handleSelectNode(ws, state, msg.nodeId);
          break;
        case "send_message":
          await this.handleSendMessage(ws, state, msg);
          break;
        case "create_branch":
          await this.handleCreateBranch(ws, state, msg);
          break;
        case "merge_nodes":
          await this.handleMergeNodes(ws, state, msg);
          break;
        case "compress_node":
          await this.handleCompressNode(ws, state, msg);
          break;
        case "delete_node":
          await this.handleDeleteNode(ws, state, msg);
          break;
        case "update_node_title":
          await this.handleUpdateNodeTitle(ws, state, msg);
          break;
        case "list_models":
          await this.handleListModels(ws, state);
          break;
        case "set_model":
          await this.handleSetModel(ws, state, msg);
          break;
        default:
          this.send(ws, { type: "error", message: "Unknown message type" });
      }
    } catch (err) {
      this.send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  private async handleListModels(ws: WebSocket, state: ClientState): Promise<void> {
    const models = await getModels();

    const providers = models.getProviders();
    const results = await Promise.allSettled(
      providers.map(async (p) => {
        const providerModels = models.getModels(p.id);
        let configured = false;
        try {
          configured = !!(await models.checkAuth(p.id));
        } catch {
          configured = false;
        }
        return {
          id: p.id,
          name: p.name || p.id,
          models: providerModels.map(toModelInfo),
          configured,
        };
      })
    );

    const result: {
      id: string; name: string; models: ModelInfo[]; configured: boolean;
    }[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") result.push(r.value);
    }

    this.send(ws, {
      type: "models_list",
      providers: result,
      current: { provider: state.provider, modelId: state.modelId },
    });
  }

  private async handleSetModel(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "set_model" }
  ): Promise<void> {
    const models = await getModels();
    const model = models.getModel(msg.provider, msg.modelId);
    if (!model) {
      this.send(ws, {
        type: "error",
        message: `Model "${msg.provider}/${msg.modelId}" not found`,
      });
      return;
    }
    state.provider = msg.provider;
    state.modelId = msg.modelId;
    this.send(ws, {
      type: "model_changed",
      provider: msg.provider,
      modelId: msg.modelId,
    });
  }

  private async handleSelectGraph(
    ws: WebSocket,
    state: ClientState,
    graphId: string
  ): Promise<void> {
    state.graphId = graphId;
    const graphState = this.getGraphStateMessage(graphId);
    if (graphState) {
      this.send(ws, graphState);
    }
  }

  private async handleSelectNode(
    ws: WebSocket,
    state: ClientState,
    nodeId: string
  ): Promise<void> {
    state.activeNodeId = nodeId;
    const node = this.store.getNode(nodeId);
    if (!node) {
      this.send(ws, { type: "error", message: "Node not found" });
      return;
    }

    const ancestorClosure = getAncestorClosure(nodeId, (id) => this.store.getNode(id) ?? undefined);
    const compressedNodes = ancestorClosure
      .map((id) => this.store.getNode(id)!)
      .filter((n) => n.isCompressed)
      .map((n) => n.title);

    this.send(ws, {
      type: "node_selected",
      node,
      context: {
        nodeCount: ancestorClosure.length,
        totalMessages: node.messages.length,
        compressedNodes,
      },
    });
  }

  private async handleSendMessage(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "send_message" }
  ): Promise<void> {
    if (this.store.hasChildren(msg.nodeId)) {
      this.send(ws, {
        type: "error",
        message: "Node is locked: has children",
      });
      return;
    }

    const contextBuilder = new ContextBuilder(this.store);
    const agentService = new AgentService(
      this.store,
      contextBuilder,
      this.tools,
      state.provider,
      state.modelId
    );

    await agentService.sendMessage(msg.nodeId, msg.content, (event) => {
      this.send(ws, {
        type: "message_stream",
        nodeId: msg.nodeId,
        event,
      });
    });

    this.broadcastGraphState(msg.nodeId);
  }

  private async handleCreateBranch(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "create_branch" }
  ): Promise<void> {
    const parentNode = this.store.getNode(msg.parentNodeId);
    if (!parentNode) {
      this.send(ws, { type: "error", message: "Parent node not found" });
      return;
    }

    const branch = this.store.createNode(
      parentNode.graphId,
      `Branch from ${parentNode.title}`,
      [msg.parentNodeId],
      msg.afterMessageId
    );

    this.send(ws, { type: "branch_created", node: branch, parent: parentNode });
    this.broadcastGraphState(msg.parentNodeId);
  }

  private async handleMergeNodes(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "merge_nodes" }
  ): Promise<void> {
    const { parentNodeIds, compressNodeIds } = msg;

    const firstParent = this.store.getNode(parentNodeIds[0]);
    if (!firstParent) {
      this.send(ws, { type: "error", message: "Parent nodes not found" });
      return;
    }

    const compressor = new Compressor();

    for (const nodeId of compressNodeIds) {
      const node = this.store.getNode(nodeId);
      if (node && !node.isCompressed) {
        const summary = await compressor.summarize(
          node.messages,
          node.title
        );
        this.store.updateNode(nodeId, {
          isCompressed: true,
          compressedSummary: summary,
        });
      }
    }

    const merged = this.store.createNode(
      firstParent.graphId,
      `Merge of ${parentNodeIds.length} nodes`,
      parentNodeIds
    );

    this.send(ws, { type: "merge_created", newNode: merged });
    this.broadcastGraphState(merged.id);
  }

  private async handleCompressNode(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "compress_node" }
  ): Promise<void> {
    const node = this.store.getNode(msg.nodeId);
    if (!node || node.isCompressed) return;

    const compressor = new Compressor();
    const summary = await compressor.summarize(node.messages, node.title);

    this.store.updateNode(msg.nodeId, {
      isCompressed: true,
      compressedSummary: summary,
    });

    this.send(ws, {
      type: "node_compressed",
      nodeId: msg.nodeId,
      summary,
    });

    if (state.activeNodeId === msg.nodeId) {
      const updatedNode = this.store.getNode(msg.nodeId);
      if (updatedNode) {
        this.send(ws, {
          type: "node_selected",
          node: updatedNode,
          context: {
            nodeCount: 1,
            totalMessages: updatedNode.messages.length,
            compressedNodes: [updatedNode.title],
          },
        });
      }
    }
  }

  private async handleDeleteNode(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "delete_node" }
  ): Promise<void> {
    if (this.store.hasChildren(msg.nodeId)) {
      this.send(ws, {
        type: "error",
        message: "Cannot delete node with children. Delete children first.",
      });
      return;
    }

    const node = this.store.getNode(msg.nodeId);
    const graphId = node?.graphId;

    this.store.deleteNode(msg.nodeId);

    if (graphId) {
      const message = this.getGraphStateMessage(graphId);
      if (message) {
        const serialized = JSON.stringify(message);
        for (const [client] of this.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(serialized);
          }
        }
      }
    }
  }

  private async handleUpdateNodeTitle(
    ws: WebSocket,
    state: ClientState,
    msg: ClientMessage & { type: "update_node_title" }
  ): Promise<void> {
    this.store.updateNode(msg.nodeId, { title: msg.title });
    this.broadcastGraphState(msg.nodeId);
  }

  private getGraphStateMessage(graphId: string): ServerMessage | null {
    const graph = this.store.getGraph(graphId);
    if (!graph) return null;

    const nodes = this.store.getNodesByGraph(graphId);
    const edges = this.store.getAllEdges(graphId);

    return {
      type: "graph_state",
      graph: {
        graph,
        nodes,
        edges,
        activeNodeId: graph.rootNodeId,
      },
    };
  }

  private broadcastGraphState(nodeId: string): void {
    const node = this.store.getNode(nodeId);
    if (!node) return;

    const message = this.getGraphStateMessage(node.graphId);
    if (!message) return;

    const serialized = JSON.stringify(message);
    for (const [client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}
