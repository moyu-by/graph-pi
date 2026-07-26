import { DatabaseSync } from "node:sqlite";
import { v4 as uuid } from "uuid";
import { SCHEMA_SQL } from "./schema.js";
export class GraphStore {
    db;
    constructor(dbPath) {
        this.db = new DatabaseSync(dbPath);
        this.db.exec("PRAGMA foreign_keys = ON");
        this.db.exec(SCHEMA_SQL);
    }
    close() {
        this.db.close();
    }
    transaction(fn) {
        this.db.exec("BEGIN");
        try {
            const result = fn();
            this.db.exec("COMMIT");
            return result;
        }
        catch (e) {
            this.db.exec("ROLLBACK");
            throw e;
        }
    }
    // Graph CRUD
    createGraph(title) {
        const id = uuid();
        const now = Date.now();
        const rootNodeId = uuid();
        this.transaction(() => {
            this.db
                .prepare("INSERT INTO graphs (id, title, root_node_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
                .run(id, title, rootNodeId, now, now);
            this.db
                .prepare("INSERT INTO nodes (id, graph_id, title, created_at) VALUES (?, ?, ?, ?)")
                .run(rootNodeId, id, "Root", now);
        });
        return { id, title, rootNodeId, createdAt: now, updatedAt: now };
    }
    getGraph(graphId) {
        const row = this.db
            .prepare("SELECT * FROM graphs WHERE id = ?")
            .get(graphId);
        if (!row)
            return null;
        return {
            id: row.id,
            title: row.title,
            rootNodeId: row.root_node_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    listGraphs() {
        const rows = this.db
            .prepare("SELECT * FROM graphs ORDER BY updated_at DESC")
            .all();
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            rootNodeId: r.root_node_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    }
    updateGraph(graphId, updates) {
        if (updates.title !== undefined) {
            this.db
                .prepare("UPDATE graphs SET title = ?, updated_at = ? WHERE id = ?")
                .run(updates.title, Date.now(), graphId);
        }
    }
    deleteGraph(graphId) {
        this.transaction(() => {
            this.db
                .prepare("DELETE FROM messages WHERE node_id IN (SELECT id FROM nodes WHERE graph_id = ?)")
                .run(graphId);
            this.db
                .prepare("DELETE FROM node_parents WHERE node_id IN (SELECT id FROM nodes WHERE graph_id = ?)")
                .run(graphId);
            this.db
                .prepare("DELETE FROM nodes WHERE graph_id = ?")
                .run(graphId);
            this.db.prepare("DELETE FROM graphs WHERE id = ?").run(graphId);
        });
    }
    // Node CRUD
    createNode(graphId, title, parentIds, splitAfterMessageId) {
        const id = uuid();
        const now = Date.now();
        this.transaction(() => {
            this.db
                .prepare("INSERT INTO nodes (id, graph_id, title, split_after_message_id, created_at) VALUES (?, ?, ?, ?, ?)")
                .run(id, graphId, title, splitAfterMessageId || null, now);
            for (const parentId of parentIds) {
                this.db
                    .prepare("INSERT INTO node_parents (node_id, parent_id) VALUES (?, ?)")
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
    getNode(nodeId) {
        const row = this.db
            .prepare("SELECT * FROM nodes WHERE id = ?")
            .get(nodeId);
        if (!row)
            return null;
        const parentRows = this.db
            .prepare("SELECT parent_id FROM node_parents WHERE node_id = ?")
            .all(nodeId);
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
    getNodeChildren(nodeId) {
        const childRows = this.db
            .prepare("SELECT n.* FROM nodes n JOIN node_parents np ON n.id = np.node_id WHERE np.parent_id = ?")
            .all(nodeId);
        return childRows.map((row) => this.getNode(row.id));
    }
    hasChildren(nodeId) {
        const row = this.db
            .prepare("SELECT COUNT(*) as count FROM node_parents WHERE parent_id = ?")
            .get(nodeId);
        return row.count > 0;
    }
    getNodesByGraph(graphId) {
        const rows = this.db
            .prepare("SELECT * FROM nodes WHERE graph_id = ?")
            .all(graphId);
        return rows.map((row) => this.getNode(row.id));
    }
    updateNode(nodeId, updates) {
        const sets = [];
        const vals = [];
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
                .run(...vals);
        }
    }
    deleteNode(nodeId) {
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
    addMessage(nodeId, message) {
        const id = message.id || uuid();
        const timestamp = message.timestamp || Date.now();
        const maxSeq = this.db
            .prepare("SELECT COALESCE(MAX(seq), -1) as max_seq FROM messages WHERE node_id = ?")
            .get(nodeId);
        this.db
            .prepare("INSERT INTO messages (id, node_id, role, content, tool_call_id, timestamp, seq) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(id, nodeId, message.role, JSON.stringify(message.content), message.toolCallId || null, timestamp, maxSeq.max_seq + 1);
        return {
            id,
            role: message.role,
            content: message.content,
            timestamp,
            toolCallId: message.toolCallId,
        };
    }
    getMessages(nodeId) {
        const rows = this.db
            .prepare("SELECT * FROM messages WHERE node_id = ? ORDER BY seq")
            .all(nodeId);
        return rows.map((r) => ({
            id: r.id,
            role: r.role,
            content: JSON.parse(r.content),
            toolCallId: r.tool_call_id ?? undefined,
            timestamp: r.timestamp,
        }));
    }
    deleteMessagesAfter(nodeId, messageId) {
        const msgSeq = this.db
            .prepare("SELECT seq FROM messages WHERE id = ? AND node_id = ?")
            .get(messageId, nodeId);
        if (msgSeq) {
            this.db
                .prepare("DELETE FROM messages WHERE node_id = ? AND seq > ?")
                .run(nodeId, msgSeq.seq);
        }
    }
    // Graph traversal
    getAncestorPath(nodeId) {
        const path = [];
        let currentId = nodeId;
        const visited = new Set();
        while (currentId) {
            if (visited.has(currentId))
                break;
            visited.add(currentId);
            path.unshift(currentId);
            const parents = this.db
                .prepare("SELECT parent_id FROM node_parents WHERE node_id = ?")
                .all(currentId);
            if (parents.length === 0)
                break;
            currentId = parents[0].parent_id;
        }
        return path;
    }
    getAllEdges(graphId) {
        const rows = this.db
            .prepare(`SELECT np.node_id, np.parent_id
         FROM node_parents np
         JOIN nodes n ON np.node_id = n.id
         WHERE n.graph_id = ?`)
            .all(graphId);
        return rows.map((r) => ({ source: r.parent_id, target: r.node_id }));
    }
}
//# sourceMappingURL=graph-store.js.map