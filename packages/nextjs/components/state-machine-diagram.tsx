"use client";

import React, { useMemo } from "react";
import ReactFlow, { Edge, MarkerType, Node, Position } from "reactflow";
import "reactflow/dist/style.css";

type Props = {
  definition: string;
  height?: number;
};

// Very small static layout renderer for short FSL-like definitions
export const StateMachineDiagram: React.FC<Props> = ({ definition, height = 140 }) => {
  const { nodes, edges } = useMemo(() => {
    // Parse lines: state 'event' -> state
    type T = { from: string; to: string; event: string };
    const transitions: T[] = [];
    const states = new Set<string>();
    definition
      .split(";")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(line => {
        const m = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
        if (m) {
          const [, from, event, to] = m;
          transitions.push({ from, event, to });
          states.add(from);
          states.add(to);
        }
      });

    // Simple grid layout: wrap to two rows for readability if many states
    const stateList = Array.from(states);
    const xGap = 120;
    const yGap = 60;
    const wrap = stateList.length > 6 ? Math.ceil(stateList.length / 2) : stateList.length;
    const nodes: Node[] = stateList.map((s, i) => {
      const row = stateList.length > 6 && i >= wrap ? 1 : 0;
      const col = row === 0 ? i : i - wrap;
      return {
        id: s,
        position: { x: col * xGap, y: 20 + row * yGap },
        data: { label: s },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      } as Node;
    });
    const edges: Edge[] = transitions.map((t, i) => ({
      id: `e${i}`,
      source: t.from,
      target: t.to,
      label: t.event,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.5 },
    }));

    return { nodes, edges };
  }, [definition]);

  return (
    <div style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
};

