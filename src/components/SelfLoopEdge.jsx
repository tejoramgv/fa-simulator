import { BaseEdge, getBezierPath, EdgeLabelRenderer } from 'reactflow';

export default function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
  style = {},
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const labelText = label || data?.label || '';

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: '#64748b',
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 30}px)`,
            pointerEvents: 'all',
            background: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '14px',
            color: '#0f172a',
          }}
          className="edge-label"
        >
          {labelText}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}