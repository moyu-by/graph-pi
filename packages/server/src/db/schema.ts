export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS graphs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  root_node_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL REFERENCES graphs(id),
  title TEXT NOT NULL DEFAULT 'Untitled',
  split_after_message_id TEXT,
  is_compressed INTEGER NOT NULL DEFAULT 0,
  compressed_summary TEXT,
  created_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS node_parents (
  node_id TEXT NOT NULL REFERENCES nodes(id),
  parent_id TEXT NOT NULL REFERENCES nodes(id),
  PRIMARY KEY (node_id, parent_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'toolResult')),
  content TEXT NOT NULL,
  tool_call_id TEXT,
  timestamp INTEGER NOT NULL,
  seq INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_node ON messages(node_id, seq);
CREATE INDEX IF NOT EXISTS idx_nodes_graph ON nodes(graph_id);
`;
