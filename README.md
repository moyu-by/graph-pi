# Graph PI — 基于图谱的 AI 对话管理

> 🎵 **VibeCoding 产物**  
> 本项目全部代码、UI 和文档由 AI 编程代理 [Kilo](https://kilo.ai) 通过对话生成，无人手写。

将 AI 对话历史组织成有向图结构。每次分支创建新的节点，形成一棵上下文树 —— 与传统的线性聊天 UI 不同，探索新路径时旧上下文不会被丢弃。

## 核心概念

### 图谱化对话
每段 AI 对话从一个**根节点**开始。每轮新消息在当前节点上延续。从任意消息**分支**会创建**子节点**，形成一棵树。这模拟了人类的自然思维方式：探索一条路径→回溯→尝试另一条→不丢弃之前的工作。

### 上下文继承
查看叶子节点时，祖先节点的消息以内联方式展示（可折叠）。Token 消耗量累加整个祖先链，实时反映上下文窗口使用情况。

## 创新点

**1. 图谱原生对话树**
与 ChatGPT、Claude、Copilot 等将分支线性化为孤立线程不同，Graph PI 渲染完整的对话图谱——每个分支都作为节点显示在交互式流程图中，父上下文被继承而非复制。

**2. 可拖拽调整的双面板布局**
左侧面板（图谱列表 + 模型选择器）、中间面板（聊天）、右侧面板（图谱画布）均支持拖拽调整宽度。聊天面板强制执行可配置的最小百分比（默认 40%），确保不会被挤没。

**3. 统一滚动 + 祖先内联**
祖先消息和当前节点消息共享同一个滚动容器，使用 `content-visibility: auto` 实现大历史记录下接近零的渲染开销。浮动滚动到底部按钮追踪新消息并显示未读数。

**4. 运行时模型目录 + 供应商认证检测**
侧边栏模型选择器在运行时查询完整的 [`@earendil-works/pi-ai`](https://www.npmjs.com/package/@earendil-works/pi-ai) 目录。配置了有效 API key 的供应商优先显示；未配置的供应商默认折叠。15 秒超时 + 重试。

**5. 带谱系感知的 Token 估算**
客户端 Token 估算器（支持中英文混合文本）计算每个节点和累加谱系的总 token 数，同时显示在聊天底部和图谱节点详情面板中。

**6. 弹性 WebSocket + 自动重连**
WsClient 跟踪连接状态，断线期间队列出站消息，触发重连回调，重连后自动重新请求图谱/模型状态——用户无感知。

## 架构

```
packages/
  web/        React + Vite + Tailwind + Zustand + React Flow
  server/     Express + ws + pi-ai providers + SQLite
  shared/     前后端共享的 TypeScript 类型
```

### 前端 (`packages/web`)
- **路由**: react-router-dom（`/`, `/graph/:id`）
- **状态管理**: Zustand store（graph、chat、model）
- **WebSocket**: 通过 AgentProvider 上下文共享单连接
- **图谱渲染**: `@xyflow/react`（React Flow）+ 自定义 `NodeCard`/`EdgeLine`
- **样式**: Tailwind CSS 3 + CSS 自定义属性（暗色主题、渐变、发光）

### 后端 (`packages/server`)
- **传输**: Express REST（图谱/节点 CRUD）+ WebSocket（实时聊天）
- **AI 引擎**: [`@earendil-works/pi-agent-core`](https://www.npmjs.com/package/@earendil-works/pi-agent-core) — 模块化 LLM Agent 运行时
- **AI 供应商**: [`@earendil-works/pi-ai`](https://www.npmjs.com/package/@earendil-works/pi-ai) — 多供应商模型目录（Anthropic、OpenAI、Google、DeepSeek、xAI、Groq、OpenRouter、Xiaomi 等 30+ 个）
- **数据库**: SQLite（通过 Node.js 内置 `node:sqlite` 模块）

## 使用到的库与项目

| 库 | 作用 |
|---|---|
| [`@earendil-works/pi-ai`](https://www.npmjs.com/package/@earendil-works/pi-ai) | 多供应商 AI 模型目录 + 流式推理 |
| [`@earendil-works/pi-agent-core`](https://www.npmjs.com/package/@earendil-works/pi-agent-core) | Agent 运行时、工具执行、消息管理 |
| [`@xyflow/react`](https://xyflow.com)（React Flow） | 交互式图谱可视化 |
| [React](https://react.dev) 18 | UI 框架 |
| [Vite](https://vitejs.dev) 5 | 构建工具 |
| [Tailwind CSS](https://tailwindcss.com) 3 | 原子化样式 |
| [Zustand](https://zustand-demo.pmnd.rs) 5 | 轻量状态管理 |
| [Express](https://expressjs.com) | HTTP 服务 + REST API |
| [`ws`](https://github.com/websockets/ws) | WebSocket 服务端 |
| [react-router-dom](https://reactrouter.com) 6 | 客户端路由 |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 聊天消息中的 Markdown 渲染 |
| [SQLite](https://sqlite.org) | 嵌入式数据库（通过 Node.js 内置 `node:sqlite` 模块，非第三方依赖）|
## 快速开始

包名：**`graph-pi`**

### 一行命令启动（无需安装）

```bash
npx graph-pi
```

npx 会自动下载并运行最新版本。终端输出类似：

```
  ⚡ Graph PI v0.1.2
  ────────────────────────────────────────
  Server API → http://localhost:3002
  Web UI     → http://localhost:3002
  ────────────────────────────────────────
```

打开输出的地址即可使用。

### 全局安装

```bash
npm install -g graph-pi
graph-pi
```

### 本地开发

```bash
# 克隆仓库后安装依赖
git clone https://github.com/moyu-by/graph-pi.git
cd graph-pi
npm install

# 构建共享类型和前端
npm run build

# 通过本地 CLI 启动
npm run graph-pi
```
## 端口占用怎么办？

`npm run graph-pi` 脚本会在以下端口依次尝试，直到找到空闲端口：

| 服务 | 尝试范围 |
|---|---|
| Web UI | 3000 → 3001 → ... → 3019 |
| Server API | 3001 → 3002 → ... → 3020 |

发现端口被占用时会自动递增，并在终端输出实际使用的端口号。无需手动干预。

你也可以通过环境变量指定端口：

```bash
WEB_PORT=4000 PORT=5000 npm run graph-pi
```

## 环境变量

复制 `.env.example` 为 `.env` 并按需配置：

```bash
cp .env.example .env
```

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3001` | API 服务端口 |
| `WEB_PORT` | `3000` | Web 界面端口 |
| `DB_PATH` | `./data/graph-pi.db` | SQLite 数据库路径 |
| `HOST` | `127.0.0.1` | 服务器绑定地址,仅本机可访问;设为 `0.0.0.0` 可开放局域网访问 |
| `ALLOWED_ORIGIN` | (空) | 额外允许跨域访问 API 的来源,逗号分隔,配合 `HOST=0.0.0.0` 的局域网场景使用 |
| `LLM_PROVIDER` | `xiaomi` | 默认模型供应商 |
| `LLM_MODEL` | `mimo-v2.5` | 默认模型 ID |

### 局域网访问与安全提示

默认情况下 Graph PI **只能从本机访问**(服务器绑定在 `127.0.0.1`,且只信任 `http://localhost:*` / `http://127.0.0.1:*` 发起的跨域请求)。这是刻意的安全默认值:这个服务没有身份验证,任何能连到它的人都可以读写你的对话记录,并消耗你在 `.env` 里配置的模型 API Key 额度。

如果你确实需要局域网访问(例如服务跑在电脑上,想用手机连过去用),显式设置:

```bash
HOST=0.0.0.0 npm run graph-pi
```

并在需要从局域网内某个具体地址的浏览器打开 Web UI 时,把该地址加入 `ALLOWED_ORIGIN`(否则 API 请求会被浏览器的 CORS 检查拦截):

```bash
HOST=0.0.0.0 ALLOWED_ORIGIN=http://192.168.1.23:3000 npm run graph-pi
```

**请只在你信任的网络(如家庭局域网)中这样做** —— 打开 `0.0.0.0` 后,同一网络下的任何设备都能访问你的图谱数据和模型额度,公共/办公网络下这样做有被滥用的风险。

### API Key 配置

将对应供应商的环境变量写入 `.env` 即可生效。模型选择器 UI 会自动检测哪些供应商已配置。

| 供应商 | 环境变量 |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| Google Vertex | `GOOGLE_CLOUD_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| xAI (Grok) | `XAI_API_KEY` |
| Groq | `GROQ_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together | `TOGETHER_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| NVIDIA | `NVIDIA_API_KEY` |
| HuggingFace | `HF_TOKEN` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |
| Xiaomi MiMo | `XIAOMI_API_KEY` |
| Kimi | `KIMI_API_KEY` |
| Minimax | `MINIMAX_API_KEY` / `MINIMAX_CN_API_KEY` |
| Moonshot AI | `MOONSHOT_API_KEY` |
| Z.AI | `ZAI_API_KEY` |
| OpenCode | `OPENCODE_API_KEY` |
| Radius | `RADIUS_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |
| Cloudflare | `CLOUDFLARE_API_KEY` |
| Qwen Token Plan | `QWEN_TOKEN_PLAN_API_KEY` |
| Ant Ling | `ANT_LING_API_KEY` |
| Amazon Bedrock | `AWS_BEARER_TOKEN_BEDROCK` / `AWS_WEB_IDENTITY_TOKEN_FILE` |

直接在系统环境变量中设置同样生效，无需 `.env` 文件。

设置方式（示例）：

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
```

## 源代码目录结构

```
graph-pi/
├── bin/graph-pi.js        # CLI 启动脚本（npm run graph-pi）
├── packages/
│   ├── shared/            # 前后端共享的 TypeScript 类型
│   ├── server/            # API 服务 + AI Agent 引擎
│   │   ├── src/agent/     # Agent 运行时、上下文构建
│   │   ├── src/db/        # SQLite 图谱存储
│   │   ├── src/ws/        # WebSocket 消息处理
│   │   └── src/index.ts   # 服务入口
│   └── web/               # 前端 React 应用
│       ├── src/components/ # 所有 UI 组件
│       ├── src/hooks/      # WebSocket、Agent 上下文
│       ├── src/stores/     # Zustand 状态管理
│       └── src/lib/        # 工具函数
├── .env.example           # 环境变量模板
└── package.json           # 根配置 + CLI 入口
```

## 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](./LICENSE)。

本软件使用了以下第三方开源库，分别遵循各自的许可证条款（详见 [THIRD-PARTY-LICENSES](./THIRD-PARTY-LICENSES)）：

- **MIT**: React, Express, Vite, Tailwind CSS, Zustand, React Flow, pi-ai, pi-agent-core 等
- **BSD-2-Clause**: dotenv
- **Apache-2.0**: TypeScript
