import { useState, useRef, useEffect } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useChatStore } from "@/stores/chat-store";
import { useAgentContext } from "@/hooks/useAgentContext";

export function ChatInput() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const isLocked = useChatStore((s) => s.isLocked);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const { sendMessage, createBranch } = useAgentContext();

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeNodeId]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !activeNodeId || isLocked || isStreaming) return;
    setInput("");
    sendMessage(activeNodeId, trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBranchNew = () => {
    if (!activeNodeId) return;
    const node = useGraphStore.getState().nodes.find(
      (n) => n.id === activeNodeId
    );
    if (!node || node.messages.length === 0) return;
    const lastMsgId = node.messages[node.messages.length - 1].id;
    createBranch(activeNodeId, lastMsgId);
  };

  const canSend = input.trim() && !isLocked && !isStreaming && activeNodeId;

  return (
    <div className="px-6 py-4">
      <div className="w-[92%] min-w-[360px] max-w-[960px] mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              className="w-full bg-bg-elevated/80 backdrop-blur-sm border border-border-strong rounded-xl px-4 py-3 pr-10 resize-none text-sm text-fg-primary placeholder:text-fg-muted transition-all focus:border-accent focus:shadow-glow"
              rows={1}
              style={{ minHeight: "44px", maxHeight: "200px", color: "var(--fg-primary)", backgroundColor: "var(--bg-elevated)" }}
              placeholder={isLocked ? "This node has child branches..." : "Message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLocked || isStreaming}
            />
            {!isLocked && (
              <button
                onClick={handleBranchNew}
                className="absolute right-2 bottom-2.5 p-1.5 text-fg-muted hover:text-cyan rounded-md hover:bg-cyan-muted transition-colors"
                title="Branch from last message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="6" y1="3" x2="6" y2="15"/>
                  <circle cx="18" cy="6" r="3"/>
                  <circle cx="6" cy="18" r="3"/>
                  <path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
              </button>
            )}
          </div>
          <button
            className={`flex items-center justify-center rounded-xl transition-all shrink-0 ${
              canSend
                ? "text-white shadow-glow hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                : "bg-bg-elevated text-fg-muted border border-border-strong"
            }`}
            style={{
              width: "44px",
              height: "44px",
              ...(canSend ? { background: "var(--gradient-primary)" } : {}),
            }}
            onClick={handleSend}
            disabled={!canSend}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
      {isStreaming && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-fg-muted">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            generating...
          </span>
        </div>
      )}
    </div>
  );
}
