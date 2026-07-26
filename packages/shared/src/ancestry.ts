import type { Node } from "./types.js";

export type NodeLookup = (id: string) => Node | undefined;

/**
 * Returns every ancestor of `nodeId` (including `nodeId` itself) in a valid
 * topological order — every node appears after all of its own parents.
 * Shared ancestors reached via more than one parent (diamonds created by
 * merges) appear exactly once. Parent order per node drives sibling-branch
 * order, so callers should read `parentIds` from a source that orders them
 * deterministically (see graph-store.ts's `ORDER BY rowid`).
 */
export function getAncestorClosure(nodeId: string, getNode: NodeLookup): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    const node = getNode(id);
    if (!node) return;
    for (const parentId of node.parentIds) visit(parentId);
    order.push(id);
  }

  visit(nodeId);
  return order;
}

/** Nodes that share at least one parent with `nodeId` (excluding itself). */
export function findSiblings(nodeId: string, allNodes: Node[]): Node[] {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node || node.parentIds.length === 0) return [];
  const parentSet = new Set(node.parentIds);
  return allNodes.filter(
    (n) => n.id !== nodeId && n.parentIds.some((pid) => parentSet.has(pid))
  );
}
