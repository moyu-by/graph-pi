import type { Message } from "@graph-pi/shared";
import { useGraphStore } from "@/stores/graph-store";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Markdown } from "@/components/ui/Markdown";

interface Props {
  message: Message;
}

export function MessageItem({ message }: Props) {
  const activeNodeId = useGraphStore((s) => s.activeNodeId);
  const { createBranch } = useAgentContext();

  const isUser = message.role === "user";
  const text = message.content.map((c) => c.text).filter(Boolean).join(" ");

  const handleBranch = () => {
    if (activeNodeId) {
      createBranch(activeNodeId, message.id);
    }
  };

  return (
    <div className="group relative py-1" style={{ contentVisibility: "auto", containIntrinsicSize: "64px" }}>
      <div className="flex gap-3">
        <div className="w-5 shrink-0 flex justify-end pt-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${
            isUser
              ? ""
              : ""
          }`}
            style={{
              background: isUser
                ? "linear-gradient(135deg, var(--blue), var(--cyan))"
                : "linear-gradient(135deg, var(--green), var(--teal))",
            }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {isUser ? (
            <div className="rounded-xl rounded-tl-sm px-3.5 py-2.5 border"
              style={{
                background: "linear-gradient(135deg, rgba(91, 158, 240, 0.10), rgba(56, 200, 224, 0.06))",
                borderColor: "rgba(91, 158, 240, 0.20)",
              }}>
              <p className="text-sm text-fg-primary whitespace-pre-wrap leading-relaxed">{text}</p>
            </div>
          ) : (
            <div className="text-sm rounded-xl rounded-tl-sm px-3.5 py-2.5 border"
              style={{
                background: "linear-gradient(135deg, rgba(62, 219, 160, 0.06), rgba(48, 216, 184, 0.03))",
                borderColor: "rgba(62, 219, 160, 0.12)",
              }}>
              <Markdown content={text} />
            </div>
          )}
          {message.toolCallId && (
            <div className="mt-1.5 text-[10px] text-cyan font-mono bg-cyan-muted/30 rounded-md px-2 py-0.5 inline-block border border-cyan/10">
              {message.toolCallId}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={handleBranch}
        className="absolute left-0 top-1 opacity-0 group-hover:opacity-100 -translate-x-6 flex items-center justify-center w-5 h-5 text-fg-muted hover:text-accent hover:bg-accent-muted rounded-md transition-all"
        title="Branch from this message"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
