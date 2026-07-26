import { useRef, useState, useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { MessageItem } from "./MessageItem";
import { AncestorContext } from "./AncestorContext";
import { Markdown } from "@/components/ui/Markdown";

export function MessageList() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const prevMsgLen = useRef(0);
  const messages = useChatStore((s) => s.messages);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const checkAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 20;
    const nowAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setAtBottom(nowAtBottom);
    if (nowAtBottom) setNewCount(0);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setNewCount(0);
  };

  useEffect(() => {
    if (messages.length > prevMsgLen.current && !atBottom) {
      setNewCount((c) => c + (messages.length - prevMsgLen.current));
    }
    prevMsgLen.current = messages.length;
    if (atBottom) {
      scrollToBottom();
    }
  }, [messages, streamingMessage, atBottom]);

  return (
    <div className="flex-1 overflow-y-auto relative" ref={scrollRef} onScroll={checkAtBottom}>
      <div className="w-[92%] min-w-[360px] max-w-[960px] mx-auto px-6 py-4 space-y-4">
        <AncestorContext />
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {isStreaming && streamingMessage && (
          <div className="group relative py-1">
            <div className="flex gap-3">
              <div className="w-5 shrink-0 flex justify-end pt-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--green), var(--teal))" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-sm rounded-xl rounded-tl-sm px-3.5 py-2.5 border"
                style={{
                  background: "linear-gradient(135deg, rgba(62, 219, 160, 0.06), rgba(48, 216, 184, 0.03))",
                  borderColor: "rgba(62, 219, 160, 0.12)",
                }}>
                <Markdown content={streamingMessage} />
                <span className="inline-block w-1 h-4 ml-0.5 align-middle rounded-full animate-pulse"
                  style={{ background: "var(--accent)" }} />
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center bg-bg-elevated/50 border border-border-subtle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm text-fg-secondary mb-1">Start a conversation</p>
            <p className="text-xs text-fg-faint">Send a message to begin</p>
          </div>
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 text-xs font-medium rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 border z-10"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-default)",
            color: "var(--accent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {newCount > 0
              ? <span>{newCount} new message{newCount > 1 ? "s" : ""}</span>
              : <span>Scroll to bottom</span>}
          </div>
        </button>
      )}
    </div>
  );
}
