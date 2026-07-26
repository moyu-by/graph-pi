import { useCallback, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { useChatStore } from "@/stores/chat-store";
import { useGraphStore } from "@/stores/graph-store";
import { useModelStore } from "@/stores/model-store";
import type { ServerMessage, GraphState } from "@graph-pi/shared";

export function useAgent() {
  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "graph_state": {
          const gs = msg.graph as unknown as GraphState;
          useGraphStore.getState().setGraphState(gs.graph, gs.nodes, gs.edges);
          break;
        }
        case "node_selected": {
          useChatStore.getState().setMessages(msg.node.messages);
          useChatStore.getState().setIsLocked(msg.node.hasChildren === true);
          break;
        }
        case "message_stream": {
          const event = msg.event;
          const chatStore = useChatStore.getState();
          if (event.type === "start") {
            chatStore.setIsStreaming(true);
            chatStore.setStreamingMessage("");
          } else if (event.type === "text_delta") {
            const data = event.data as { text: string };
            chatStore.appendStreaming(data.text);
          } else if (event.type === "message_end") {
            chatStore.setIsStreaming(false);
          } else if (event.type === "done") {
            chatStore.setIsStreaming(false);
            const data = event.data as {
              id: string;
              role: string;
              content: unknown[];
              timestamp: number;
            };
            chatStore.addMessage({
              id: data.id,
              role: "assistant",
              content: data.content as never,
              timestamp: data.timestamp,
            });
            chatStore.setStreamingMessage("");
          } else if (event.type === "error") {
            chatStore.setIsStreaming(false);
            chatStore.setError(event.data as string);
          }
          break;
        }
        case "branch_created": {
          useGraphStore.getState().setActiveNode(msg.node.id);
          // Mirror the select_node round-trip a manual node click triggers,
          // so chatStore.messages/isLocked reflect the new (empty) branch
          // instead of staying on the old node's data.
          send({ type: "select_node", nodeId: msg.node.id });
          break;
        }
        case "merge_created": {
          useGraphStore.getState().setActiveNode(msg.newNode.id);
          send({ type: "select_node", nodeId: msg.newNode.id });
          break;
        }
        case "node_compressed": {
          const { nodes } = useGraphStore.getState();
          const updatedNodes = nodes.map((n) =>
            n.id === msg.nodeId
              ? { ...n, isCompressed: true, compressedSummary: msg.summary }
              : n
          );
          useGraphStore.setState({ nodes: updatedNodes });
          break;
        }
        case "models_list": {
          useModelStore.getState().setProviders(msg.providers);
          useModelStore.getState().setCurrent(msg.current.provider, msg.current.modelId);
          useModelStore.getState().setLoading(false);
          useModelStore.getState().setError(null);
          break;
        }
        case "model_changed": {
          useModelStore.getState().setCurrent(msg.provider, msg.modelId);
          break;
        }
        case "error": {
          const modelStore = useModelStore.getState();
          if (modelStore.loading) {
            modelStore.setError(msg.message);
            modelStore.setLoading(false);
          }
          useChatStore.getState().setError(msg.message);
          break;
        }
      }
    },
    []
  );

  // Declared before the useWebSocket() call below (which needs it as an
  // argument) even though it calls `send`, which that same call produces.
  // This is safe: `send`'s identity never changes across renders (see
  // useWebSocket's own useCallback(..., [])), and this callback's body only
  // runs later, asynchronously, on an actual reconnect — by then `send` is
  // long assigned.
  const onReconnect = useCallback(() => {
    const graphId = useGraphStore.getState().graph?.id;
    if (graphId) send({ type: "select_graph", graphId });
    send({ type: "list_models" });
  }, []);

  const { send, isConnected } = useWebSocket(handleMessage, onReconnect);

  useEffect(() => {
    send({ type: "list_models" });
  }, [send]);

  const selectGraph = useCallback(
    (graphId: string) => send({ type: "select_graph", graphId }),
    [send]
  );

  const selectNode = useCallback(
    (nodeId: string) => send({ type: "select_node", nodeId }),
    [send]
  );

  const sendMessage = useCallback(
    (nodeId: string, content: string) =>
      send({ type: "send_message", nodeId, content }),
    [send]
  );

  const createBranch = useCallback(
    (parentNodeId: string, afterMessageId: string) =>
      send({ type: "create_branch", parentNodeId, afterMessageId }),
    [send]
  );

  const compressNode = useCallback(
    (nodeId: string) => send({ type: "compress_node", nodeId }),
    [send]
  );

  const deleteNode = useCallback(
    (nodeId: string) => send({ type: "delete_node", nodeId }),
    [send]
  );

  const setActiveNode = useCallback(
    (nodeId: string) => useGraphStore.getState().setActiveNode(nodeId),
    []
  );

  return {
    selectGraph,
    selectNode,
    sendMessage,
    createBranch,
    compressNode,
    deleteNode,
    setActiveNode,
    send,
    isConnected,
  };
}
