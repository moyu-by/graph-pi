import { useRef, useEffect, useState } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [visible, setVisible] = useState(false);

  // Adjust position to stay within viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let adjX = x;
    let adjY = y;
    if (x + rect.width > window.innerWidth - 8) {
      adjX = x - rect.width;
    }
    if (y + rect.height > window.innerHeight - 8) {
      adjY = y - rect.height;
    }
    setPos({ x: adjX, y: adjY });
    requestAnimationFrame(() => setVisible(true));
  }, [x, y]);

  // Close on outside click and Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 py-1 rounded-lg border shadow-lg min-w-[160px] transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        left: pos.x,
        top: pos.y,
        background: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
            item.disabled
              ? "opacity-40 cursor-not-allowed"
              : item.danger
                ? "text-red hover:bg-red-muted/50"
                : "text-fg-secondary hover:bg-accent-muted hover:text-fg-primary"
          }`}
          style={item.danger && !item.disabled ? { color: "var(--red)" } : {}}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
        >
          {item.label}
          {item.disabled && item.disabledReason && (
            <span className="block text-[10px] text-fg-faint mt-0.5">
              {item.disabledReason}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
