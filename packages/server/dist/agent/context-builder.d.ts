import type { GraphStore } from "../db/graph-store.js";
import type { Message } from "@graph-pi/shared";
export interface BuiltContext {
    systemPrompt: string;
    messages: Message[];
}
export declare class ContextBuilder {
    private store;
    constructor(store: GraphStore);
    build(nodeId: string, baseSystemPrompt: string): BuiltContext;
}
//# sourceMappingURL=context-builder.d.ts.map