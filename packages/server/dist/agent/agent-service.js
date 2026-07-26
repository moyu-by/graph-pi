import { Agent, convertToLlm } from "@earendil-works/pi-agent-core";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
// Shared models instance - created once and reused
let sharedModels = null;
let modelsReady = null;
async function getModels() {
    if (!sharedModels) {
        sharedModels = builtinModels();
        modelsReady = sharedModels.refresh().then(() => { modelsReady = null; });
    }
    if (modelsReady)
        await modelsReady;
    return sharedModels;
}
function isLlmMessage(msg) {
    return "content" in msg;
}
function getAssistantContent(msg) {
    if (isLlmMessage(msg) && msg.role === "assistant") {
        return msg.content;
    }
    return undefined;
}
export class AgentService {
    store;
    contextBuilder;
    tools;
    providerId;
    modelId;
    baseSystemPrompt;
    constructor(store, contextBuilder, tools = [], providerId = process.env.LLM_PROVIDER || "xiaomi", modelId = process.env.LLM_MODEL || "mimo-v2.5", baseSystemPrompt = "You are a helpful AI assistant.") {
        this.store = store;
        this.contextBuilder = contextBuilder;
        this.tools = tools;
        this.providerId = providerId;
        this.modelId = modelId;
        this.baseSystemPrompt = baseSystemPrompt;
    }
    async sendMessage(nodeId, content, onStream) {
        const node = this.store.getNode(nodeId);
        if (!node)
            throw new Error(`Node ${nodeId} not found`);
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
                thinkingLevel: "off",
            },
        });
        agent.subscribe((event) => {
            switch (event.type) {
                case "message_start":
                    onStream({ type: "start" });
                    break;
                case "message_update": {
                    const msgEvent = event;
                    if (msgEvent.assistantMessageEvent.type === "text_delta" &&
                        msgEvent.assistantMessageEvent.delta) {
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
                    const e = event;
                    onStream({
                        type: "toolcall_start",
                        data: { toolCallId: e.toolCallId, toolName: e.toolName },
                    });
                    break;
                }
                case "tool_execution_update": {
                    const e = event;
                    onStream({
                        type: "toolcall_delta",
                        data: { toolCallId: e.toolCallId, partialResult: e.partialResult },
                    });
                    break;
                }
                case "tool_execution_end": {
                    const e = event;
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
                    const endEvent = event;
                    const lastMsg = endEvent.messages[endEvent.messages.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                        const content = getAssistantContent(lastMsg);
                        if (content) {
                            const assistantMessage = this.store.addMessage(nodeId, {
                                role: "assistant",
                                content: content,
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
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            onStream({ type: "error", data: errorMsg });
        }
    }
    convertToAgentMessages(messages) {
        return messages.map((msg) => {
            if (msg.role === "toolResult") {
                return {
                    role: "toolResult",
                    toolCallId: msg.toolCallId || "",
                    toolName: "",
                    content: msg.content,
                    isError: false,
                    timestamp: msg.timestamp,
                };
            }
            if (msg.role === "assistant") {
                return {
                    role: "assistant",
                    content: msg.content,
                    api: "",
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
                    stopReason: "stop",
                    timestamp: msg.timestamp,
                };
            }
            return {
                role: "user",
                content: msg.content,
                timestamp: msg.timestamp,
            };
        });
    }
}
//# sourceMappingURL=agent-service.js.map