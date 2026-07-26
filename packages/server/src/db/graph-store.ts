import { DatabaseSync } from "node:sqlite";
import { v4 as uuid } from "uuid";
import type { Graph, Node, Message } from "@graph-pi/shared";
import { SCHEMA_SQL } from "./schema.js";

interface NodeRow {
  id: string;
  graph_id: string;
  title: string;
  split_after_message_id: string | null;
  is_compressed: number;
  compressed_summary: string | null;
  created_at: number;
  metadata: string | null;
}

interface MessageRow {
  id: string;
  node_id: string;
  role: string;
  content: string;
  tool_call_id: string | null;
  timestamp: number;
  seq: number;
}

interface CountRow {
  count: number;
}

export class GraphStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(SCHEMA_SQL);
  }

  close(): void {
    this.db.close();
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  // Graph CRUD

  createGraph(title: string): Graph {
    const id = uuid();
    const now = Date.now();
    const rootNodeId = uuid();

    this.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO graphs (id, title, root_node_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run(id, title, rootNodeId, now, now);

      this.db
        .prepare(
          "INSERT INTO nodes (id, graph_id, title, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(rootNodeId, id, "Root", now);
    });

    return { id, title, rootNodeId, createdAt: now, updatedAt: now };
  }

  getGraph(graphId: string): Graph | null {
    const row = this.db
      .prepare("SELECT * FROM graphs WHERE id = ?")
      .get(graphId) as Record<string, unknown> | undefined;

    if (!row) return null;
    return {
      id: row.id as string,
      title: row.title as string,
      rootNodeId: row.root_node_id as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  listGraphs(): Graph[] {
    const rows = this.db
      .prepare("SELECT * FROM graphs ORDER BY updated_at DESC")
      .all() as Record<string, unknown>[];

    return rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      rootNodeId: r.root_node_id as string,
      createdAt: r.created_at as number,
      updatedAt: r.updated_at as number,
    }));
  }

  updateGraph(graphId: string, updates: { title?: string }): void {
    if (updates.title !== undefined) {
      this.db
        .prepare("UPDATE graphs SET title = ?, updated_at = ? WHERE id = ?")
        .run(updates.title, Date.now(), graphId);
    }
  }

  deleteGraph(graphId: string): void {
    this.transaction(() => {
      this.db
        .prepare(
          "DELETE FROM messages WHERE node_id IN (SELECT id FROM nodes WHERE graph_id = ?)"
        )
        .run(graphId);
      this.db
        .prepare(
          "DELETE FROM node_parents WHERE node_id IN (SELECT id FROM nodes WHERE graph_id = ?)"
        )
        .run(graphId);
      this.db
        .prepare("DELETE FROM nodes WHERE graph_id = ?")
        .run(graphId);
      this.db.prepare("DELETE FROM graphs WHERE id = ?").run(graphId);
    });
  }

  // Node CRUD

  createNode(
    graphId: string,
    title: string,
    parentIds: string[],
    splitAfterMessageId?: string
  ): Node {
    const id = uuid();
    const now = Date.now();

    this.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO nodes (id, graph_id, title, split_after_message_id, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run(id, graphId, title, splitAfterMessageId || null, now);

      for (const parentId of parentIds) {
        this.db
          .prepare(
            "INSERT INTO node_parents (node_id, parent_id) VALUES (?, ?)"
          )
          .run(id, parentId);
      }
    });

    return {
      id,
      graphId,
      title,
      parentIds,
      splitAfterMessageId,
      messages: [],
      isCompressed: false,
      hasChildren: false,
      createdAt: now,
    };
  }

  getNode(nodeId: string): Node | null {
    const row = this.db
      .prepare("SELECT * FROM nodes WHERE id = ?")
      .get(nodeId) as unknown as NodeRow | undefined;
    if (!row) return null;

    const parentRows = this.db
      .prepare("SELECT parent_id FROM node_parents WHERE node_id = ? ORDER BY rowid")
      .all(nodeId) as unknown as { parent_id: string }[];

    const messages = this.getMessages(nodeId);
    const hasChildren = this.hasChildren(nodeId);

    return {
      id: row.id,
      graphId: row.graph_id,
      title: row.title,
      parentIds: parentRows.map((p) => p.parent_id),
      splitAfterMessageId: row.split_after_message_id ?? undefined,
      messages,
      isCompressed: row.is_compressed === 1,
      compressedSummary: row.compressed_summary ?? undefined,
      hasChildren,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getNodeChildren(nodeId: string): Node[] {
    const childRows = this.db
      .prepare(
        "SELECT n.* FROM nodes n JOIN node_parents np ON n.id = np.node_id WHERE np.parent_id = ?"
      )
      .all(nodeId) as unknown as NodeRow[];

    return childRows.map((row) => this.getNode(row.id)!);
  }

  hasChildren(nodeId: string): boolean {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM node_parents WHERE parent_id = ?")
      .get(nodeId) as unknown as CountRow;
    return row.count > 0;
  }

  getNodesByGraph(graphId: string): Node[] {
    const rows = this.db
      .prepare("SELECT * FROM nodes WHERE graph_id = ?")
      .all(graphId) as unknown as NodeRow[];

    return rows.map((row) => this.getNode(row.id)!);
  }

  updateNode(
    nodeId: string,
    updates: {
      title?: string;
      isCompressed?: boolean;
      compressedSummary?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      sets.push("title = ?");
      vals.push(updates.title);
    }
    if (updates.isCompressed !== undefined) {
      sets.push("is_compressed = ?");
      vals.push(updates.isCompressed ? 1 : 0);
    }
    if (updates.compressedSummary !== undefined) {
      sets.push("compressed_summary = ?");
      vals.push(updates.compressedSummary);
    }
    if (updates.metadata !== undefined) {
      sets.push("metadata = ?");
      vals.push(JSON.stringify(updates.metadata));
    }

    if (sets.length > 0) {
      vals.push(nodeId);
      this.db
        .prepare(`UPDATE nodes SET ${sets.join(", ")} WHERE id = ?`)
        .run(...(vals as [string | number | null, ...(string | number | null)[]]));
    }
  }

  deleteNode(nodeId: string): void {
    this.transaction(() => {
      this.db.prepare("DELETE FROM messages WHERE node_id = ?").run(nodeId);
      this.db
        .prepare("DELETE FROM node_parents WHERE node_id = ?")
        .run(nodeId);
      this.db
        .prepare("DELETE FROM node_parents WHERE parent_id = ?")
        .run(nodeId);
      this.db.prepare("DELETE FROM nodes WHERE id = ?").run(nodeId);
    });
  }

  // Message CRUD

  addMessage(
    nodeId: string,
    message: Omit<Message, "id" | "timestamp"> & {
      id?: string;
      timestamp?: number;
    }
  ): Message {
    const id = message.id || uuid();
    const timestamp = message.timestamp || Date.now();
    const maxSeq = this.db
      .prepare(
        "SELECT COALESCE(MAX(seq), -1) as max_seq FROM messages WHERE node_id = ?"
      )
      .get(nodeId) as unknown as CountRow & { max_seq: number };

    this.db
      .prepare(
        "INSERT INTO messages (id, node_id, role, content, tool_call_id, timestamp, seq) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        nodeId,
        message.role,
        JSON.stringify(message.content),
        message.toolCallId || null,
        timestamp,
        maxSeq.max_seq + 1
      );

    return {
      id,
      role: message.role,
      content: message.content,
      timestamp,
      toolCallId: message.toolCallId,
    };
  }

  getMessages(nodeId: string): Message[] {
    const rows = this.db
      .prepare("SELECT * FROM messages WHERE node_id = ? ORDER BY seq")
      .all(nodeId) as unknown as MessageRow[];

    return rows.map((r) => ({
      id: r.id,
      role: r.role as Message["role"],
      content: JSON.parse(r.content),
      toolCallId: r.tool_call_id ?? undefined,
      timestamp: r.timestamp,
    }));
  }

  deleteMessagesAfter(nodeId: string, messageId: string): void {
    const msgSeq = this.db
      .prepare("SELECT seq FROM messages WHERE id = ? AND node_id = ?")
      .get(messageId, nodeId) as unknown as { seq: number } | undefined;

    if (msgSeq) {
      this.db
        .prepare("DELETE FROM messages WHERE node_id = ? AND seq > ?")
        .run(nodeId, msgSeq.seq);
    }
  }

  // Graph traversal

  getAllEdges(graphId: string): { source: string; target: string }[] {
    const rows = this.db
      .prepare(
        `SELECT np.node_id, np.parent_id
         FROM node_parents np
         JOIN nodes n ON np.node_id = n.id
         WHERE n.graph_id = ?`
      )
      .all(graphId) as unknown as { node_id: string; parent_id: string }[];

    return rows.map((r) => ({ source: r.parent_id, target: r.node_id }));
  }
}
