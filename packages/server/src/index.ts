import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath, URL } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try loading .env from multiple locations
const envPaths = [
  resolve(__dirname, "../../../.env"),
  resolve(__dirname, "../../.env"),
  resolve(__dirname, "../.env"),
  resolve(process.cwd(), ".env"),
];
for (const p of envPaths) config({ path: p });

import express from "express";
import { createServer } from "http";
import { GraphStore } from "./db/graph-store.js";
import { WebSocketHandler } from "./ws/handler.js";

// Last-resort safety nets: log clearly instead of letting the process die
// silently (or crash without explanation) on a bug we didn't anticipate.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] unhandled error — the process may now be in an inconsistent state:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] unhandled promise rejection:", reason);
});

const PORT = parseInt(process.env.PORT || "3001", 10);
// Default to loopback-only so a locally running graph-pi isn't reachable by
// anyone else on the network out of the box. Set HOST=0.0.0.0 to opt in to
// LAN access (see README for the security tradeoffs of doing so).
const HOST = process.env.HOST || "127.0.0.1";
const DB_PATH = process.env.DB_PATH || "./data/graph-pi.db";

// Ensure database directory exists
const dbDir = dirname(resolve(DB_PATH));
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const app = express();
app.use(express.json());

// CORS middleware — by default only requests from this same machine
// (http://localhost:* or http://127.0.0.1:*) get a CORS grant. Set
// ALLOWED_ORIGIN to a comma-separated list of additional origins to trust
// (e.g. when the server is exposed on a LAN and the web UI is loaded from
// another device's browser at http://192.168.x.x:PORT).
const extraAllowedOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (extraAllowedOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
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

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`LLM: ${process.env.LLM_PROVIDER}/${process.env.LLM_MODEL}`);
  if (HOST !== "127.0.0.1" && HOST !== "localhost") {
    console.warn(
      `⚠ Bound to ${HOST}: this server is reachable from other devices on your network. ` +
        `Anyone on that network can read/write your conversations and spend your configured model API budget.`
    );
  }
});
