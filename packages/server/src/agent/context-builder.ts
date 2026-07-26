import type { GraphStore } from "../db/graph-store.js";
import type { Message } from "@graph-pi/shared";

export interface BuiltContext {
  systemPrompt: string;
  messages: Message[];
}

export class ContextBuilder {
  constructor(private store: GraphStore) {}

  build(nodeId: string, baseSystemPrompt: string): BuiltContext {
    const ancestorPath = this.store.getAncestorPath(nodeId);
    const messages: Message[] = [];
    const summaries: string[] = [];

    for (let i = 0; i < ancestorPath.length; i++) {
      const node = this.store.getNode(ancestorPath[i]);
      if (!node) continue;

      if (node.isCompressed && node.compressedSummary) {
        summaries.push(`[${node.title}]: ${node.compressedSummary}`);
      } else if (
        node.splitAfterMessageId &&
        i < ancestorPath.length - 1 &&
        ancestorPath[i + 1]
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
      systemPrompt: baseSystemPrompt + summaryBlock,
      messages,
    };
  }
}
