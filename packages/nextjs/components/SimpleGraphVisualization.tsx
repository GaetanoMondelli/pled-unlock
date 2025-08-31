'use client';

import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Simple static nodes for demo
const initialNodes = [
  {
    id: 'DataSource_A',
    type: 'default',
    position: { x: 50, y: 100 },
    data: { 
      label: (
        <div className="p-2 bg-cyan-100 rounded">
          <div className="font-semibold text-cyan-800">Data Source A</div>
          <div className="text-xs text-gray-600">Interval: 3s</div>
        </div>
      )
    },
    sourcePosition: Position.Right,
  },
  {
    id: 'Queue_B',
    type: 'default', 
    position: { x: 300, y: 100 },
    data: { 
      label: (
        <div className="p-2 bg-teal-100 rounded">
          <div className="font-semibold text-teal-800">Queue B</div>
          <div className="text-xs text-gray-600">Window: 10s</div>
        </div>
      )
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'Sink_E',
    type: 'default',
    position: { x: 550, y: 100 },
    data: { 
      label: (
        <div className="p-2 bg-rose-100 rounded">
          <div className="font-semibold text-rose-800">Sink E</div>
          <div className="text-xs text-gray-600">Max: 1000</div>
        </div>
      )
    },
    targetPosition: Position.Left,
  },
];

const initialEdges = [
  {
    id: 'e-DataSource_A-Queue_B',
    source: 'DataSource_A',
    target: 'Queue_B',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e-Queue_B-Sink_E', 
    source: 'Queue_B',
    target: 'Sink_E',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

const SimpleGraphVisualization: React.FC = () => {
  return (
    <ReactFlow
      nodes={initialNodes}
      edges={initialEdges}
      fitView
      className="bg-background"
      defaultEdgeOptions={{
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--foreground))' },
      }}
    >
      <Controls />
      <Background color="hsl(var(--border))" gap={16} />
    </ReactFlow>
  );
};

export default SimpleGraphVisualization;