import { Agent, convertToLlm } from "@earendil-works/pi-agent-core";
import type { AgentMessage, AgentTool, AgentEvent } from "@earendil-works/pi-agent-core";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import type { Model, Api, Message as LlmMessage, AssistantMessage } from "@earendil-works/pi-ai";
import type { GraphStore } from "../db/graph-store.js";
import { ContextBuilder } from "./context-builder.js";
import type { StreamEvent, Message } from "@graph-pi/shared";

type StreamCallback = (event: StreamEvent) => void;

// Shared models instance - created once and reused
let sharedModels: ReturnType<typeof builtinModels> | null = null;
let modelsReady: Promise<void> | null = null;

async function getModels(): Promise<ReturnType<typeof builtinModels>> {
  if (!sharedModels) {
    sharedModels = builtinModels();
    modelsReady = sharedModels.refresh().then(() => { modelsReady = null; });
  }
  if (modelsReady) await modelsReady;
  return sharedModels;
}

function isLlmMessage(msg: AgentMessage): msg is LlmMessage {
  return "content" in msg;
}

function getAssistantContent(
  msg: AgentMessage
): unknown[] | undefined {
  if (isLlmMessage(msg) && msg.role === "assistant") {
    return (msg as AssistantMessage).content as unknown as unknown[];
  }
  return undefined;
}

export class AgentService {
  constructor(
    private store: GraphStore,
    private contextBuilder: ContextBuilder,
    private tools: AgentTool[] = [],
    private providerId: string = process.env.LLM_PROVIDER || "xiaomi",
    private modelId: string = process.env.LLM_MODEL || "mimo-v2.5",
    private baseSystemPrompt: string = "You are a helpful AI assistant."
  ) {}

  async sendMessage(
    nodeId: string,
    content: string,
    onStream: StreamCallback
  ): Promise<void> {
    const node = this.store.getNode(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);
    if (this.store.hasChildren(nodeId))
      throw new Error("Node is locked: has children");

    this.store.addMessage(nodeId, {
      role: "user",
      content: [{ type: "text", text: content }],
    });

    const context = this.contextBuilder.build(nodeId, this.baseSystemPrompt);
    const models = await getModels();

    let model = models.getModel(this.providerId, this.modelId);

    // Fallback: try to find any available model
    if (!model) {
      const allModels = models.getModels();
      model = allModels[0];
    }

    if (!model) {
      onStream({
        type: "error",
        data: `Model "${this.providerId}/${this.modelId}" not available. Select a different model from the sidebar or configure API keys.`,
      });
      return;
    }

    const agent = new Agent({
      streamFn: models.streamSimple.bind(models),
      convertToLlm,
      initialState: {
        model,
        systemPrompt: context.systemPrompt,
        messages: this.convertToAgentMessages(context.messages),
        tools: this.tools,
        thinkingLevel: "off" as const,
      },
    });

    agent.subscribe((event: AgentEvent) => {
      switch (event.type) {
        case "message_start":
          onStream({ type: "start" });
          break;

        case "message_update": {
          const msgEvent = event as AgentEvent & {
            assistantMessageEvent: { type: string; delta?: string };
          };
          if (
            msgEvent.assistantMessageEvent.type === "text_delta" &&
            msgEvent.assistantMessageEvent.delta
          ) {
            onStream({
              type: "text_delta",
              data: { text: msgEvent.assistantMessageEvent.delta },
            });
          }
          break;
        }

        case "message_end":
          onStream({ type: "message_end" });
          break;

        case "tool_execution_start": {
          const e = event as AgentEvent & {
            toolCallId: string;
            toolName: string;
          };
          onStream({
            type: "toolcall_start",
            data: { toolCallId: e.toolCallId, toolName: e.toolName },
          });
          break;
        }

        case "tool_execution_update": {
          const e = event as AgentEvent & {
            toolCallId: string;
            partialResult: unknown;
          };
          onStream({
            type: "toolcall_delta",
            data: { toolCallId: e.toolCallId, partialResult: e.partialResult },
          });
          break;
        }

        case "tool_execution_end": {
          const e = event as AgentEvent & {
            toolCallId: string;
            result: unknown;
            isError: boolean;
          };
          onStream({
            type: "toolcall_end",
            data: {
              toolCallId: e.toolCallId,
              result: e.result,
              isError: e.isError,
            },
          });
          break;
        }

        case "agent_end": {
          const endEvent = event as AgentEvent & {
            messages: AgentMessage[];
          };
          const lastMsg = endEvent.messages[endEvent.messages.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            const content = getAssistantContent(lastMsg);
            if (content) {
              const assistantMessage = this.store.addMessage(nodeId, {
                role: "assistant",
                content: content as Message["content"],
              });
              onStream({ type: "done", data: assistantMessage });
            }
          }
          this.store.updateGraph(node.graphId, {});
          break;
        }
      }
    });

    try {
      await agent.prompt(content);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error";
      onStream({ type: "error", data: errorMsg });
    }
  }

  private convertToAgentMessages(messages: Message[]): AgentMessage[] {
    return messages.map((msg) => {
      if (msg.role === "toolResult") {
        return {
          role: "toolResult" as const,
          toolCallId: msg.toolCallId || "",
          toolName: "",
          content: msg.content as LlmMessage["content"],
          isError: false,
          timestamp: msg.timestamp,
        } as AgentMessage;
      }
      if (msg.role === "assistant") {
        return {
          role: "assistant" as const,
          content: msg.content,
          api: "" as Api,
          provider: "",
          model: "",
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
          stopReason: "stop" as const,
          timestamp: msg.timestamp,
        } as AgentMessage;
      }
      return {
        role: "user" as const,
        content: msg.content,
        timestamp: msg.timestamp,
      } as AgentMessage;
    });
  }
}
