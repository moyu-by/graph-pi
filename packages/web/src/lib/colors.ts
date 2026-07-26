// Deliberately excludes --accent and --pink: that pairing is the merge
// feature's signature gradient (MergeDialog, the "Merge (N)" button,
// selected-node highlighting), so reusing it for an incidental per-graph
// avatar color would make the same hue mean two unrelated things.
export const GRAPH_AVATAR_COLORS = [
  "var(--blue)",
  "var(--green)",
  "var(--cyan)",
  "var(--teal)",
  "var(--amber)",
];

export function graphAvatarColor(index: number): string {
  return GRAPH_AVATAR_COLORS[index % GRAPH_AVATAR_COLORS.length];
}
