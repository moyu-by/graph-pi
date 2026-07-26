import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  initialRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  rightVisible: boolean;
  minLeftPercent?: number;
}

export function ResizablePanels({
  left,
  right,
  initialRightWidth = 420,
  minRightWidth = 240,
  maxRightWidth = 800,
  rightVisible,
  minLeftPercent = 40,
}: Props) {
  const [containerW, setContainerW] = useState(0);
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clamp rightWidth so left panel never goes below minLeftPercent
  const clampRightWidth = useCallback(
    (w: number, cw: number) => {
      if (cw <= 0) return w;
      const maxAllowed = cw - Math.round(cw * (minLeftPercent / 100));
      return Math.min(Math.max(w, minRightWidth), Math.min(maxRightWidth, maxAllowed));
    },
    [minRightWidth, maxRightWidth, minLeftPercent]
  );

  // Track container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      setContainerW(cw);
      if (cw > 0 && !dragging.current) {
        setRightWidth((prev) => clampRightWidth(prev, cw));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [clampRightWidth]);

  // Clamp initial value once container is measured
  useEffect(() => {
    if (containerW > 0) {
      setRightWidth((prev) => clampRightWidth(prev, containerW));
    }
  }, [containerW, clampRightWidth, initialRightWidth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = rightWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [rightWidth]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = clampRightWidth(startWidth.current + delta, containerW);
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minRightWidth, maxRightWidth, containerW, clampRightWidth]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">{left}</div>
      {rightVisible && (
        <>
          <div
            className="w-px hover:w-1 active:bg-accent cursor-col-resize transition-all shrink-0 relative group"
            style={{ background: "var(--accent-border)" }}
            onMouseDown={onMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-accent/10 transition-colors" />
          </div>
          <div
            className="shrink-0 flex flex-col min-h-0"
            style={{ width: rightWidth }}
          >
            {right}
          </div>
        </>
      )}
    </div>
  );
}
