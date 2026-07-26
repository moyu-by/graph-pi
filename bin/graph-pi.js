#!/usr/bin/env node
import { spawn, execSync } from "child_process";
import { createServer } from "net";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SHARED = resolve(ROOT, "packages/shared");
const SERVER = resolve(ROOT, "packages/server");
const WEB = resolve(ROOT, "packages/web");

config({ path: resolve(ROOT, ".env") });

function portInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => { server.close(); resolve(false); });
    server.listen(port, "127.0.0.1");
  });
}

async function findPort(preferred, label) {
  for (let port = preferred; port < preferred + 20; port++) {
    const busy = await portInUse(port);
    if (!busy) return port;
    console.log(`  ⚠  Port ${port} (${label}) is in use, trying ${port + 1}...`);
  }
  console.error(`  ✗  No available port found for ${label}`);
  process.exit(1);
}

async function main() {
  const webPort = await findPort(parseInt(process.env.WEB_PORT || "3000", 10), "web");
  const serverPort = await findPort(parseInt(process.env.PORT || "3001", 10), "server");

  console.log(`\n  ⚡ Graph PI v${process.env.npm_package_version || "0.1.0"}`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Server API → http://localhost:${serverPort}`);
  console.log(`  Web UI     → http://localhost:${webPort}`);
  console.log(`  ${"─".repeat(40)}\n`);

  // Build shared types if needed
  try { execSync("npx tsc", { cwd: SHARED, stdio: "pipe" }); } catch {}

  // Start server
  const server = spawn("npx", ["tsx", "watch", "src/index.ts"], {
    cwd: SERVER,
    stdio: "inherit",
    env: { ...process.env, PORT: String(serverPort) },
  });

  // Start web dev server with explicit port and API proxy
  const web = spawn("npx", [
    "vite", "--port", String(webPort),
    ...(serverPort !== 3001 ? ["--proxy-api", `http://localhost:${serverPort}`] : []),
  ], {
    cwd: WEB,
    stdio: "inherit",
    env: { ...process.env, VITE_API_URL: `http://localhost:${serverPort}`, VITE_WS_URL: `ws://localhost:${serverPort}` },
  });

  const cleanup = () => { server.kill(); web.kill(); process.exit(0); };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();
