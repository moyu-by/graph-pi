import type { Server } from "http";
import type { GraphStore } from "../db/graph-store.js";
import type { AgentTool } from "@earendil-works/pi-agent-core";
export declare class WebSocketHandler {
    private store;
    private tools;
    private wss;
    private clients;
    constructor(server: Server, store: GraphStore, tools?: AgentTool[]);
    private handleMessage;
    private handleListModels;
    private handleSetModel;
    private handleSelectGraph;
    private handleSelectNode;
    private handleSendMessage;
    private handleCreateBranch;
    private handleMergeNodes;
    private handleCompressNode;
    private handleDeleteNode;
    private handleUpdateNodeTitle;
    private getGraphStateMessage;
    private broadcastGraphState;
    private send;
}
//# sourceMappingURL=handler.d.ts.map