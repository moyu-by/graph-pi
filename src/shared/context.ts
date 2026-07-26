import type { Message, Node } from "./types.js";

export interface BuiltContext {
  systemPrompt: string;
  messages: Message[];
}

export function buildAncestorPath(
  nodes: Map<string, Node>,
  nodeId: string
): Node[] {
  const path: Node[] = [];
  let current = nodes.get(nodeId);
  while (current) {
    path.unshift(current);
    if (current.parentIds.length === 0) break;
    const parentId = current.parentIds[0];
    current = nodes.get(parentId);
    if (!current) break;
    if (path.includes(current)) break;
  }
  return path;
}

export function buildContext(
  nodes: Map<string, Node>,
  activeNodeId: string,
  systemPrompt: string
): BuiltContext {
  const ancestorPath = buildAncestorPath(nodes, activeNodeId);
  const messages: Message[] = [];
  const summaries: string[] = [];

  for (let i = 0; i < ancestorPath.length; i++) {
    const node = ancestorPath[i];
    if (node.isCompressed && node.compressedSummary) {
      summaries.push(node.compressedSummary);
    } else if (
      i === ancestorPath.length - 2 &&
      i > 0 &&
      node.splitAfterMessageId
    ) {
      const splitIdx = node.messages.findIndex(
        (m) => m.id === node.splitAfterMessageId
      );
      if (splitIdx >= 0) {
        messages.push(...node.messages.slice(0, splitIdx + 1));
      } else {
        messages.push(...node.messages);
      }
    } else {
      messages.push(...node.messages);
    }
  }

  const summaryBlock =
    summaries.length > 0
      ? `\n\n[Previous conversation summaries:]\n${summaries.join("\n---\n")}`
      : "";

  return {
    systemPrompt: systemPrompt + summaryBlock,
    messages,
  };
}
