// Terminal (non-browser) commands for graph-pi: `list`, `new`, `chat`.
//
// These import the compiled @graph-pi/server classes directly and drive them
// in-process — no HTTP/WS server is started. GraphStore, ContextBuilder and
// AgentService are the same classes the web server uses, so a graph created
// or edited here is fully interoperable with the web UI (same SQLite file,
// same DAG-aware context building, same "locked node" rule).
//
// This file is only ever loaded lazily via dynamic import() from
// bin/graph-pi.js, so a missing/stale packages/server/dist build can't break
// the default (no-args) web-launch path. graph-pi.js loads .env before ever
// reaching this module, so LLM_PROVIDER/LLM_MODEL/DB_PATH are already in
// process.env by the time any function below runs.

import { resolve, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { createInterface } from "node:readline/promises";

import { GraphStore } from "../packages/server/dist/db/graph-store.js";
import { ContextBuilder } from "../packages/server/dist/agent/context-builder.js";
import { AgentService } from "../packages/server/dist/agent/agent-service.js";

// ---------------------------------------------------------------------------
// Small helpers shared by all commands
// ---------------------------------------------------------------------------

function shortId(id) {
  return id.slice(0, 8);
}

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

/** Mirrors packages/server/src/index.ts's DB_PATH handling exactly, so the
 * CLI and the web server resolve to the same database file when run from the
 * same working directory with the same env. */
function openStore() {
  const dbPath = process.env.DB_PATH || "./data/graph-pi.db";
  const dbDir = dirname(resolve(dbPath));
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
  return new GraphStore(dbPath);
}

function matchGraphs(graphs, query) {
  const exact = graphs.filter((g) => g.id === query);
  if (exact.length > 0) return exact;

  const byPrefix = graphs.filter((g) => g.id.startsWith(query));
  if (byPrefix.length > 0) return byPrefix;

  const q = query.toLowerCase();
  return graphs.filter((g) => g.title.toLowerCase().includes(q));
}

function findNodesByShortIdPrefix(store, graphId, prefix) {
  if (!prefix) return [];
  const nodes = store.getNodesByGraph(graphId);
  const exact = nodes.filter((n) => n.id === prefix);
  if (exact.length > 0) return exact;
  return nodes.filter((n) => n.id.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// `graph-pi list`
// ---------------------------------------------------------------------------

export async function cmdList() {
  const store = openStore();
  try {
    const graphs = store.listGraphs();
    if (graphs.length === 0) {
      console.log("没有图谱。使用 `graph-pi new <标题>` 创建一个。");
      return;
    }
    console.log(`共 ${graphs.length} 个图谱:\n`);
    for (const g of graphs) {
      console.log(`  ${shortId(g.id)}  ${g.title}   (更新于 ${formatTime(g.updatedAt)})`);
    }
    console.log("");
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// `graph-pi new <title>`
// ---------------------------------------------------------------------------

export async function cmdNew(title) {
  const trimmedTitle = (title || "").trim();
  if (!trimmedTitle) {
    console.log("用法: graph-pi new <标题>");
    process.exitCode = 1;
    return;
  }

  const store = openStore();
  try {
    const graph = store.createGraph(trimmedTitle);
    console.log(`✓ 已创建图谱「${graph.title}」`);
    console.log(`  id:     ${graph.id}`);
    console.log(`  根节点: ${graph.rootNodeId}`);
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// `graph-pi chat [graph-id|前缀|标题]`
// ---------------------------------------------------------------------------

export async function cmdChat(arg) {
  const store = openStore();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // Ctrl+C: close things down cleanly instead of relying on the default
  // "kill the process mid-await" behavior.
  rl.on("SIGINT", () => {
    console.log("\n已退出。");
    rl.close();
    store.close();
    process.exit(0);
  });

  try {
    const graphs = store.listGraphs();
    if (graphs.length === 0) {
      console.log("没有图谱,请先 `graph-pi new <标题>`");
      return;
    }

    let graph = null;
    if (!arg) {
      graph = await pickGraphInteractive(rl, graphs, "请选择要进入的图谱:");
    } else {
      const matches = matchGraphs(graphs, arg);
      if (matches.length === 0) {
        console.log(`找不到匹配 "${arg}" 的图谱。使用 \`graph-pi list\` 查看所有图谱。`);
      } else if (matches.length === 1) {
        graph = matches[0];
      } else {
        graph = await pickGraphInteractive(
          rl,
          matches,
          `找到多个匹配 "${arg}" 的图谱,请选择:`
        );
      }
    }

    if (!graph) return;

    await runChatSession(store, rl, graph);
  } finally {
    rl.close();
    store.close();
  }
}

async function pickGraphInteractive(rl, graphs, promptMsg) {
  console.log(promptMsg);
  graphs.forEach((g, i) => {
    console.log(`  [${i + 1}] ${g.title}   (id: ${shortId(g.id)}, 更新于 ${formatTime(g.updatedAt)})`);
  });

  while (true) {
    const answer = (await rl.question("输入编号(直接回车取消)> ")).trim();
    if (!answer) return null;
    const idx = Number.parseInt(answer, 10);
    if (Number.isInteger(idx) && idx >= 1 && idx <= graphs.length) {
      return graphs[idx - 1];
    }
    console.log(`请输入 1-${graphs.length} 之间的编号,或直接回车取消。`);
  }
}

async function runChatSession(store, rl, graph) {
  const contextBuilder = new ContextBuilder(store);
  const agentService = new AgentService(store, contextBuilder);
  let currentNodeId = graph.rootNodeId;

  console.log(`\n已进入图谱「${graph.title}」(${shortId(graph.id)})`);
  console.log("直接输入文本发送消息;/help 查看命令;/exit 退出。\n");

  while (true) {
    const node = store.getNode(currentNodeId);
    if (!node) {
      console.log("✗ 当前节点已不存在,退出对话。");
      break;
    }

    let input;
    try {
      input = await rl.question(`[${graph.title}/${node.title}]> `);
    } catch {
      break; // stdin closed
    }

    const trimmed = input.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("/")) {
      const [cmd, ...cmdArgs] = trimmed.split(/\s+/);
      if (cmd === "/exit" || cmd === "/quit") break;

      try {
        if (cmd === "/help") {
          printChatHelp();
        } else if (cmd === "/nodes") {
          printNodes(store, graph.id, currentNodeId);
        } else if (cmd === "/branch") {
          currentNodeId = doBranch(store, graph.id, currentNodeId);
        } else if (cmd === "/switch") {
          currentNodeId = doSwitch(store, graph.id, currentNodeId, cmdArgs);
        } else if (cmd === "/merge") {
          const merged = doMerge(store, graph.id, cmdArgs);
          if (merged) currentNodeId = merged;
        } else {
          console.log(`未知命令: ${cmd},输入 /help 查看可用命令。`);
        }
      } catch (err) {
        console.log(`✗ 命令执行出错: ${err instanceof Error ? err.message : err}`);
      }
      continue;
    }

    if (store.hasChildren(currentNodeId)) {
      console.log(
        "⚠ 该节点已有子节点,已锁定,不能直接发消息。请先 /branch 创建新分支,或 /switch 切换到其它节点。"
      );
      continue;
    }

    await sendAndStream(agentService, currentNodeId, trimmed);
  }
}

async function sendAndStream(agentService, nodeId, content) {
  process.stdout.write("\nAI> ");
  let gotOutput = false;
  try {
    await agentService.sendMessage(nodeId, content, (event) => {
      if (event.type === "text_delta") {
        gotOutput = true;
        process.stdout.write(event.data.text);
      } else if (event.type === "toolcall_start") {
        gotOutput = true;
        process.stdout.write(`\n  [调用工具: ${event.data.toolName}]\n`);
      } else if (event.type === "error") {
        gotOutput = true;
        process.stdout.write(`\n✗ ${event.data}\n`);
      }
    });
  } catch (err) {
    gotOutput = true;
    process.stdout.write(`\n✗ ${err instanceof Error ? err.message : err}\n`);
  }
  // Some providers fail auth/config errors "silently" from AgentService's
  // point of view: no text_delta, no explicit error event, just a "done"
  // with an empty assistant message. Without this, the user just sees
  // "AI> " followed by nothing, which looks like a hang rather than a
  // failure. Surface it explicitly instead of leaving the terminal blank.
  if (!gotOutput) {
    process.stdout.write(
      "(未收到任何回复内容,请检查 LLM_PROVIDER / LLM_MODEL 以及对应的 API Key 是否配置正确)"
    );
  }
  process.stdout.write("\n\n");
}

function printChatHelp() {
  console.log(`
可用命令:
  <直接输入文本>        向当前节点发送消息(节点已锁定时需先 /branch)
  /nodes               列出当前图谱的所有节点(短id / 标题 / 父节点数 / 锁定状态 / 当前节点标记 *)
  /branch              从当前节点创建一个新分支并切换过去
  /merge <id> <id...>  将 2 个或更多节点(短id,支持前缀匹配)合并为一个新节点并切换过去
  /switch <id>         切换当前节点(短id,支持前缀匹配)
  /help                显示本帮助
  /exit, /quit         退出对话,返回 shell
`);
}

function printNodes(store, graphId, currentNodeId) {
  const nodes = store.getNodesByGraph(graphId);
  console.log(`\n节点列表(共 ${nodes.length} 个):`);
  for (const n of nodes) {
    const marker = n.id === currentNodeId ? "*" : " ";
    const lockTag = n.hasChildren ? "[locked]" : "";
    console.log(
      `  ${marker} ${shortId(n.id)}  ${n.title}  (父节点数: ${n.parentIds.length})  ${lockTag}`
    );
  }
  console.log("");
}

function doBranch(store, graphId, currentNodeId) {
  const current = store.getNode(currentNodeId);
  if (!current) {
    console.log("✗ 当前节点不存在。");
    return currentNodeId;
  }
  const branch = store.createNode(graphId, `Branch from ${current.title}`, [currentNodeId]);
  console.log(`✓ 已从「${current.title}」创建分支 ${shortId(branch.id)} 「${branch.title}」,已切换到该节点。`);
  return branch.id;
}

function doSwitch(store, graphId, currentNodeId, args) {
  const prefix = args[0];
  if (!prefix) {
    console.log("用法: /switch <短id>");
    return currentNodeId;
  }

  const matches = findNodesByShortIdPrefix(store, graphId, prefix);
  if (matches.length === 0) {
    console.log(`✗ 找不到匹配 "${prefix}" 的节点,使用 /nodes 查看节点列表。`);
    return currentNodeId;
  }
  if (matches.length > 1) {
    console.log("✗ 匹配到多个节点,请输入更长的前缀区分:");
    for (const m of matches) console.log(`    ${shortId(m.id)}  ${m.title}`);
    return currentNodeId;
  }

  console.log(`✓ 已切换到节点 ${shortId(matches[0].id)} 「${matches[0].title}」`);
  return matches[0].id;
}

function doMerge(store, graphId, args) {
  if (args.length < 2) {
    console.log("用法: /merge <短id1> <短id2> [...]  (至少 2 个不同节点)");
    return null;
  }

  const parentIds = [];
  for (const a of args) {
    const matches = findNodesByShortIdPrefix(store, graphId, a);
    if (matches.length === 0) {
      console.log(`✗ 找不到匹配 "${a}" 的节点,合并已取消。使用 /nodes 查看节点列表。`);
      return null;
    }
    if (matches.length > 1) {
      console.log(`✗ "${a}" 匹配到多个节点,请输入更长的前缀区分,合并已取消:`);
      for (const m of matches) console.log(`    ${shortId(m.id)}  ${m.title}`);
      return null;
    }
    const resolvedId = matches[0].id;
    // Preserve input order (matches web MergeDialog's "click order" semantics)
    // while ignoring accidental repeats of the same node.
    if (!parentIds.includes(resolvedId)) parentIds.push(resolvedId);
  }

  if (parentIds.length < 2) {
    console.log("✗ 合并至少需要 2 个不同的节点,合并已取消。");
    return null;
  }

  const merged = store.createNode(graphId, `Merge of ${parentIds.length} nodes`, parentIds);
  console.log(
    `✓ 已合并 ${parentIds.length} 个节点为新节点 ${shortId(merged.id)} 「${merged.title}」,已切换到该节点。`
  );
  return merged.id;
}
