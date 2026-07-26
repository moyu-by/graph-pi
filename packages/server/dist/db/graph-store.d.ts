import type { Graph, Node, Message } from "@graph-pi/shared";
export declare class GraphStore {
    private db;
    constructor(dbPath: string);
    close(): void;
    transaction<T>(fn: () => T): T;
    createGraph(title: string): Graph;
    getGraph(graphId: string): Graph | null;
    listGraphs(): Graph[];
    updateGraph(graphId: string, updates: {
        title?: string;
    }): void;
    deleteGraph(graphId: string): void;
    createNode(graphId: string, title: string, parentIds: string[], splitAfterMessageId?: string): Node;
    getNode(nodeId: string): Node | null;
    getNodeChildren(nodeId: string): Node[];
    hasChildren(nodeId: string): boolean;
    getNodesByGraph(graphId: string): Node[];
    updateNode(nodeId: string, updates: {
        title?: string;
        isCompressed?: boolean;
        compressedSummary?: string;
        metadata?: Record<string, unknown>;
    }): void;
    deleteNode(nodeId: string): void;
    addMessage(nodeId: string, message: Omit<Message, "id" | "timestamp"> & {
        id?: string;
        timestamp?: number;
    }): Message;
    getMessages(nodeId: string): Message[];
    deleteMessagesAfter(nodeId: string, messageId: string): void;
    getAncestorPath(nodeId: string): string[];
    getAllEdges(graphId: string): {
        source: string;
        target: string;
    }[];
}
//# sourceMappingURL=graph-store.d.ts.map