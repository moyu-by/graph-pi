import { builtinModels } from "@earendil-works/pi-ai/providers/all";
// Shared models instance
let sharedModels = null;
function getModels() {
    if (!sharedModels) {
        sharedModels = builtinModels();
        void sharedModels.refresh();
    }
    return sharedModels;
}
export class Compressor {
    async summarize(messages, nodeTitle) {
        const conversationText = messages
            .map((m) => `[${m.role.toUpperCase()}]: ${m.content
            .map((c) => c.text || JSON.stringify(c))
            .join(" ")}`)
            .join("\n");
        const prompt = `Summarize the following conversation from "${nodeTitle}" in a concise paragraph. Focus on the key topics, decisions, and conclusions. Do not include meta-commentary.

${conversationText}`;
        try {
            const models = getModels();
            const providerId = process.env.LLM_PROVIDER || "xiaomi";
            const modelId = process.env.LLM_MODEL || "mimo-v2.5";
            let model = models.getModel(providerId, modelId);
            if (!model) {
                const allModels = models.getModels();
                model = allModels[0];
            }
            if (!model)
                return conversationText.slice(0, 500);
            const llmMsg = {
                role: "user",
                content: [{ type: "text", text: prompt }],
                timestamp: Date.now(),
            };
            const result = await models.complete(model, {
                systemPrompt: "You are a conversation summarizer. Produce concise, factual summaries.",
                messages: [llmMsg],
            });
            const text = result.content?.[0] && "text" in result.content[0]
                ? result.content[0].text
                : undefined;
            return text || conversationText.slice(0, 500);
        }
        catch {
            return conversationText.slice(0, 500);
        }
    }
}
//# sourceMappingURL=compressor.js.map