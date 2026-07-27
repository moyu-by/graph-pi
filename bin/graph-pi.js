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

// Default behavior (no subcommand): launch the web server + UI, unchanged from
// the original single-purpose CLI.
async function serveWeb() {
  const webPort = await findPort(parseInt(process.env.WEB_PORT || "3000", 10), "web");
  const serverPort = await findPort(parseInt(process.env.PORT || "3001", 10), "server");

  const WEB_DIST = resolve(ROOT, "packages/web/dist");

      console.log(`  Server API → http://localhost:${serverPort}`);
      console.log(`  Web UI     → http://localhost:${serverPort}`);

  const server = spawn(process.execPath, [resolve(ROOT, "packages/server/dist/index.js")], {
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

function printUsage() {
  console.log(`
Graph PI — graph-structured conversations with AI

Usage:
  graph-pi                          启动网页服务(浏览器 UI + API)
  graph-pi list                     列出所有图谱
  graph-pi new <title>              创建一个新图谱
  graph-pi chat [id|前缀|标题]       在终端中进行图结构多轮对话
  graph-pi help                     显示本帮助

chat 内可用命令: /nodes /branch /merge /switch /help /exit
`);
}

// Subcommands that talk to the DB (list/new/chat) live in cli-commands.js and
// import the compiled server package directly (no HTTP/WS round trip). That
// module is only loaded lazily, on demand, so the default `graph-pi` (no
// args) web-launch path above never pays for it and can't be broken by it.
async function withCli(fn) {
  let cli;
  try {
    cli = await import("./cli-commands.js");
  } catch (err) {
    console.error("  ✗  无法加载 CLI 命令模块,请确认 server 包已构建:");
    console.error("     cd packages/server && npx tsc -b");
    console.error(`     (${err instanceof Error ? err.message : err})`);
    process.exitCode = 1;
    return;
  }

  try {
    await fn(cli);
  } catch (err) {
    console.error(`  ✗  ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  switch (cmd) {
    case undefined:
      await serveWeb();
      break;
    case "list":
      await withCli((cli) => cli.cmdList());
      break;
    case "new":
      await withCli((cli) => cli.cmdNew(rest.join(" ")));
      break;
    case "chat":
      await withCli((cli) => cli.cmdChat(rest[0]));
      break;
    case "help":
    case "-h":
    case "--help":
      printUsage();
      break;
    default:
      console.error(`  ✗  未知命令: ${cmd}`);
      printUsage();
      process.exitCode = 1;
  }
}

main();
