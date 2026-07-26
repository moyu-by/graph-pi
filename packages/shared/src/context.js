export function buildAncestorPath(nodes, nodeId) {
    const path = [];
    let current = nodes.get(nodeId);
    while (current) {
        path.unshift(current);
        if (current.parentIds.length === 0)
            break;
        const parentId = current.parentIds[0];
        current = nodes.get(parentId);
        if (!current)
            break;
        if (path.includes(current))
            break;
    }
    return path;
}
export function buildContext(nodes, activeNodeId, systemPrompt) {
    const ancestorPath = buildAncestorPath(nodes, activeNodeId);
    const messages = [];
    const summaries = [];
    for (let i = 0; i < ancestorPath.length; i++) {
        const node = ancestorPath[i];
        if (node.isCompressed && node.compressedSummary) {
            summaries.push(node.compressedSummary);
        }
        else if (i === ancestorPath.length - 2 &&
            i > 0 &&
            node.splitAfterMessageId) {
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
        systemPrompt: systemPrompt + summaryBlock,
        messages,
    };
}
//# sourceMappingURL=context.js.map