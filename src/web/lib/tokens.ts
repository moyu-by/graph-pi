import type { Message } from "@graph-pi/shared";

function estimateTextTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  for (const char of text) {
    if (char.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/)) {
      tokens += 1.5;
    } else if (char.match(/\s/)) {
      tokens += 0.25;
    } else {
      tokens += 0.3;
    }
  }
  return Math.ceil(tokens);
}

function estimateMessageTokens(msg: Message): number {
  const text = msg.content.map((c) => c.text || "").filter(Boolean).join(" ");
  const roleOverhead = msg.role === "assistant" ? 8 : msg.role === "user" ? 4 : 2;
  return estimateTextTokens(text) + roleOverhead;
}

export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}

export function formatTokens(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(count >= 10000 ? 0 : 1) + "k";
  }
  return String(count);
}
