import { memo } from "react";
import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, getBezierPath } from "@xyflow/react";

function EdgeLineComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return <BaseEdge id={id} path={edgePath} style={{ stroke: "var(--accent-border)", strokeWidth: 1.5 }} />;
}

export const EdgeLine = memo(EdgeLineComponent);
