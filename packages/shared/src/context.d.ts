import type { Message, Node } from "./types.js";
export interface BuiltContext {
    systemPrompt: string;
    messages: Message[];
}
export declare function buildAncestorPath(nodes: Map<string, Node>, nodeId: string): Node[];
export declare function buildContext(nodes: Map<string, Node>, activeNodeId: string, systemPrompt: string): BuiltContext;
//# sourceMappingURL=context.d.ts.map