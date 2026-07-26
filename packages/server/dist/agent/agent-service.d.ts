import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { GraphStore } from "../db/graph-store.js";
import { ContextBuilder } from "./context-builder.js";
import type { StreamEvent } from "@graph-pi/shared";
type StreamCallback = (event: StreamEvent) => void;
export declare class AgentService {
    private store;
    private contextBuilder;
    private tools;
    private providerId;
    private modelId;
    private baseSystemPrompt;
    constructor(store: GraphStore, contextBuilder: ContextBuilder, tools?: AgentTool[], providerId?: string, modelId?: string, baseSystemPrompt?: string);
    sendMessage(nodeId: string, content: string, onStream: StreamCallback): Promise<void>;
    private convertToAgentMessages;
}
export {};
//# sourceMappingURL=agent-service.d.ts.map