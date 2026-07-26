export class ContextBuilder {
    store;
    constructor(store) {
        this.store = store;
    }
    build(nodeId, baseSystemPrompt) {
        const ancestorPath = this.store.getAncestorPath(nodeId);
        const messages = [];
        const summaries = [];
        for (let i = 0; i < ancestorPath.length; i++) {
            const node = this.store.getNode(ancestorPath[i]);
            if (!node)
                continue;
            if (node.isCompressed && node.compressedSummary) {
                summaries.push(`[${node.title}]: ${node.compressedSummary}`);
            }
            else if (node.splitAfterMessageId &&
                i < ancestorPath.length - 1 &&
                ancestorPath[i + 1]) {
                const splitIdx = node.messages.findIndex((m) => m.id === node.splitAfterMessageId);
                if (splitIdx >= 0) {
                    messages.push(...node.messages.slice(0, splitIdx + 1));
                }
                else {
                    messages.push(...node.messages);
                }
            }
            else {
                messages.push(...node.messages);
            }
        }
        const summaryBlock = summaries.length > 0
            ? `\n\n[Previous conversation summaries:]\n${summaries.join("\n---\n")}`
            : "";
        return {
            systemPrompt: baseSystemPrompt + summaryBlock,
            messages,
        };
    }
}
//# sourceMappingURL=context-builder.js.map