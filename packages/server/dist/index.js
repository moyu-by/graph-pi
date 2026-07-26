import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
// Try loading .env from multiple locations
const envPaths = [
    resolve(__dirname, "../../../.env"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../.env"),
    resolve(process.cwd(), ".env"),
];
for (const p of envPaths)
    config({ path: p });
import express from "express";
import { createServer } from "http";
import { GraphStore } from "./db/graph-store.js";
import { WebSocketHandler } from "./ws/handler.js";
const PORT = parseInt(process.env.PORT || "3001", 10);
const DB_PATH = process.env.DB_PATH || "./data/graph-pi.db";
// Ensure database directory exists
const dbDir = dirname(resolve(DB_PATH));
if (!existsSync(dbDir))
    mkdirSync(dbDir, { recursive: true });
const app = express();
app.use(express.json());
// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});
const server = createServer(app);
const store = new GraphStore(DB_PATH);
new WebSocketHandler(server, store);
app.get("/api/graphs", (_req, res) => {
    res.json(store.listGraphs());
});
app.post("/api/graphs", (req, res) => {
    const { title } = req.body;
    if (!title) {
        res.status(400).json({ error: "title is required" });
        return;
    }
    const graph = store.createGraph(title);
    res.json(graph);
});
app.get("/api/graphs/:id", (req, res) => {
    const graph = store.getGraph(req.params.id);
    if (!graph) {
        res.status(404).json({ error: "Graph not found" });
        return;
    }
    res.json(graph);
});
app.get("/api/graphs/:id/nodes", (req, res) => {
    const nodes = store.getNodesByGraph(req.params.id);
    res.json(nodes);
});
app.get("/api/nodes/:id", (req, res) => {
    const node = store.getNode(req.params.id);
    if (!node) {
        res.status(404).json({ error: "Node not found" });
        return;
    }
    res.json(node);
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Serve pre-built web UI if available
const webDist = process.env.WEB_DIST;
if (webDist) {
    app.use(express.static(webDist));
    app.get("*", (_req, res) => {
        res.sendFile(resolve(webDist, "index.html"));
    });
    console.log(`  → Serving web UI from ${webDist}`);
}
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`LLM: ${process.env.LLM_PROVIDER}/${process.env.LLM_MODEL}`);
});
//# sourceMappingURL=index.js.map