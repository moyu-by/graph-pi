import { test } from "node:test";
import assert from "node:assert/strict";
import { getAncestorClosure } from "@graph-pi/shared";
import type { Node } from "@graph-pi/shared";

function makeNode(id: string, parentIds: string[] = []): Node {
  return {
    id,
    graphId: "g1",
    title: id,
    parentIds,
    messages: [],
    isCompressed: false,
    createdAt: 0,
  };
}

function lookupIn(nodes: Node[]): (id: string) => Node | undefined {
  const map = new Map(nodes.map((n) => [n.id, n]));
  return (id: string) => map.get(id);
}

test("linear chain returns ancestors in root-to-leaf order", () => {
  const a = makeNode("A");
  const b = makeNode("B", ["A"]);
  const c = makeNode("C", ["B"]);
  const getNode = lookupIn([a, b, c]);

  assert.deepEqual(getAncestorClosure("C", getNode), ["A", "B", "C"]);
});

test("diamond merge includes the shared ancestor exactly once, before its children, with the merge node last", () => {
  // R is the common ancestor of A and B; M merges A and B.
  const r = makeNode("R");
  const a = makeNode("A", ["R"]);
  const b = makeNode("B", ["R"]);
  const m = makeNode("M", ["A", "B"]);
  const getNode = lookupIn([r, a, b, m]);

  const result = getAncestorClosure("M", getNode);

  assert.equal(result.filter((id) => id === "R").length, 1, "R should appear exactly once");
  assert.equal(result[result.length - 1], "M", "M should be last");
  assert.ok(result.indexOf("R") < result.indexOf("A"), "R must come before A");
  assert.ok(result.indexOf("R") < result.indexOf("B"), "R must come before B");
  assert.deepEqual(result, ["R", "A", "B", "M"]);
});

test("multi-parent merge (3+ parents) includes every parent once and the merge node last", () => {
  const r = makeNode("R");
  const a = makeNode("A", ["R"]);
  const b = makeNode("B", ["R"]);
  const c = makeNode("C", ["R"]);
  const m = makeNode("M", ["A", "B", "C"]);
  const getNode = lookupIn([r, a, b, c, m]);

  const result = getAncestorClosure("M", getNode);

  assert.deepEqual(result, ["R", "A", "B", "C", "M"]);
  assert.equal(new Set(result).size, result.length, "no duplicates");
});

test("unknown nodeId resolves gracefully without throwing", () => {
  const getNode = lookupIn([]);

  assert.doesNotThrow(() => getAncestorClosure("does-not-exist", getNode));
  const result = getAncestorClosure("does-not-exist", getNode);
  // Implementation returns [] when the id can't be resolved (no self-entry
  // is fabricated for a node that doesn't exist) — either [] or [id] would
  // be an acceptable "graceful" result; assert the actual documented shape.
  assert.deepEqual(result, []);
});

test("unknown parentId referenced by an existing node is skipped without throwing", () => {
  const b = makeNode("B", ["missing-parent"]);
  const getNode = lookupIn([b]);

  const result = getAncestorClosure("B", getNode);
  assert.deepEqual(result, ["B"]);
});
