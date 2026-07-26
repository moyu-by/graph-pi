import type { GraphStore } from "../db/graph-store.js";
import { getAncestorClosure } from "@graph-pi/shared";
import type { Message, Node } from "@graph-pi/shared";

export interface BuiltContext {
  systemPrompt: string;
  messages: Message[];
}

export class ContextBuilder {
  constructor(private store: GraphStore) {}

  build(nodeId: string, baseSystemPrompt: string): BuiltContext {
    const closure = getAncestorClosure(nodeId, (id) => this.store.getNode(id) ?? undefined);
    const nodesById = new Map<string, Node>();
    for (const id of closure) {
      const node = this.store.getNode(id);
      if (node) nodesById.set(id, node);
    }

    const branchStartIds = this.findBranchStartIds(nodesById);
    const { truncateAt, forceFull } = this.computeTruncationCutoffs(nodesById);

    const messages: Message[] = [];
    const notes: string[] = [];

    for (const id of closure) {
      const node = nodesById.get(id);
      if (!node) continue;

      if (branchStartIds.has(node.id)) {
        notes.push(`[Branch: "${node.title}"]`);
      }
      if (node.parentIds.length > 1) {
        notes.push(`[Merged ${node.parentIds.length} branches into "${node.title}"]`);
      }

      if (node.isCompressed && node.compressedSummary) {
        notes.push(`[${node.title}]: ${node.compressedSummary}`);
      } else if (!forceFull.has(node.id) && truncateAt.has(node.id)) {
        messages.push(...node.messages.slice(0, truncateAt.get(node.id)! + 1));
      } else {
        messages.push(...node.messages);
      }
    }

    const notesBlock =
      notes.length > 0 ? `\n\n[Context notes:]\n${notes.join("\n---\n")}` : "";

    return {
      systemPrompt: baseSystemPrompt + notesBlock,
      messages,
    };
  }

  /** Direct parents of any merge point in the closure — where a distinct branch's content begins. */
  private findBranchStartIds(nodesById: Map<string, Node>): Set<string> {
    const branchStartIds = new Set<string>();
    for (const node of nodesById.values()) {
      if (node.parentIds.length > 1) {
        for (const parentId of node.parentIds) branchStartIds.add(parentId);
      }
    }
    return branchStartIds;
  }

  /**
   * A node's `splitAfterMessageId` is set on the CHILD created via "branch from this
   * message", but the referenced message id lives in the PARENT's own message list.
   * So truncation must be computed from each node's children, not its own field.
   * A parent can have multiple children in the closure (fan-out before a later merge);
   * if any of them needs the full history, or a split point can't be found, we fall
   * back to including everything for that parent rather than risk dropping content a
   * branch still depends on.
   */
  private computeTruncationCutoffs(
    nodesById: Map<string, Node>
  ): { truncateAt: Map<string, number>; forceFull: Set<string> } {
    const truncateAt = new Map<string, number>();
    const forceFull = new Set<string>();

    for (const node of nodesById.values()) {
      for (const parentId of node.parentIds) {
        const parent = nodesById.get(parentId);
        if (!parent || forceFull.has(parentId)) continue;

        const splitIdx = node.splitAfterMessageId
          ? parent.messages.findIndex((m) => m.id === node.splitAfterMessageId)
          : -1;

        if (splitIdx < 0) {
          forceFull.add(parentId);
          truncateAt.delete(parentId);
          continue;
        }
        const prev = truncateAt.get(parentId);
        if (prev === undefined || splitIdx > prev) truncateAt.set(parentId, splitIdx);
      }
    }

    return { truncateAt, forceFull };
  }
}
