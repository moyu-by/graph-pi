#!/usr/bin/env node
import { spawn } from "child_process";
import { createServer } from "net";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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

  const WEB_DIST = resolve(ROOT, "packages/web/dist");

  console.log(`\n  ⚡ Graph PI v${process.env.npm_package_version || "0.1.0"}`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Server API → http://localhost:${serverPort}`);
  console.log(`  Web UI     → http://localhost:${serverPort}`);
  console.log(`  ${"─".repeat(40)}\n`);

  const server = spawn("npx", ["tsx", resolve(ROOT, "packages/server/src/index.ts")], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(serverPort),
      WEB_DIST: WEB_DIST,
    },
  });

  const cleanup = () => { server.kill(); process.exit(0); };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();
