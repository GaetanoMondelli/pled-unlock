'use client';

import React, { useState, useEffect } from 'react';

const GraphVisualization: React.FC = () => {
  const [scenario, setScenario] = useState<any>(null);

  useEffect(() => {
    // Static scenario data - no store subscription
    const staticScenario = {
      "nodes": [
        {
          "nodeId": "DataSource_A",
          "type": "DataSource",
          "displayName": "Source A",
          "position": { "x": 50, "y": 100 },
          "interval": 3,
          "valueMin": 1,
          "valueMax": 10,
          "destinationNodeId": "Queue_B"
        },
        {
          "nodeId": "DataSource_X",
          "type": "DataSource",
          "displayName": "Source X",
          "position": { "x": 50, "y": 300 },
          "interval": 5,
          "valueMin": 100,
          "valueMax": 200,
          "destinationNodeId": "Queue_B"
        },
        {
          "nodeId": "Queue_B",
          "type": "Queue",
          "displayName": "Queue B",
          "position": { "x": 300, "y": 100 },
          "timeWindow": 10,
          "aggregationMethod": "sum",
          "capacity": 10,
          "destinationNodeId": "Process_C"
        },
        {
          "nodeId": "Process_C",
          "type": "ProcessNode",
          "displayName": "Processor C",
          "position": { "x": 550, "y": 200 },
          "inputNodeIds": ["Queue_B"],
          "outputs": [
            { "formula": "inputs.Queue_B.value + 10", "destinationNodeId": "Queue_D" },
            { "formula": "inputs.Queue_B.value * 0.5", "destinationNodeId": "Sink_E" }
          ]
        },
        {
          "nodeId": "Queue_D",
          "type": "Queue",
          "displayName": "Output Queue D",
          "position": { "x": 800, "y": 100 },
          "timeWindow": 5,
          "aggregationMethod": "average",
          "capacity": 5,
          "destinationNodeId": "Sink_F"
        },
        {
          "nodeId": "Sink_E",
          "type": "Sink",
          "displayName": "Sink E (Processed 0.5*B)",
          "position": { "x": 800, "y": 300 }
        },
        {
          "nodeId": "Sink_F",
          "type": "Sink",
          "displayName": "Sink F (Avg D)",
          "position": { "x": 1050, "y": 100 }
        }
      ]
    };
    setScenario(staticScenario);
  }, []);

  if (!scenario) {
    return (
      <div className="flex-grow flex items-center justify-center text-muted-foreground">
        Loading scenario...
      </div>
    );
  }

  return (
    <div className="flex-grow relative bg-background overflow-auto">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="hsl(var(--foreground))"
              opacity="0.6"
            />
          </marker>
        </defs>
        
        {/* Render connections */}
        {scenario.nodes.map((node: any) => {
          if (node.type === 'DataSource' || node.type === 'Queue') {
            const destNode = node.destinationNodeId ? scenario.nodes.find((n: any) => n.nodeId === node.destinationNodeId) : null;
            if (destNode) {
              return (
                <line
                  key={`${node.nodeId}-${destNode.nodeId}`}
                  x1={node.position.x + 120}
                  y1={node.position.y + 40}
                  x2={destNode.position.x}
                  y2={destNode.position.y + 40}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                  opacity="0.6"
                  markerEnd="url(#arrowhead)"
                />
              );
            }
          }
          if (node.type === 'ProcessNode') {
            return node.outputs.map((output: any, index: number) => {
              const destNode = scenario.nodes.find((n: any) => n.nodeId === output.destinationNodeId);
              if (destNode) {
                return (
                  <line
                    key={`${node.nodeId}-output${index}-${destNode.nodeId}`}
                    x1={node.position.x + 120}
                    y1={node.position.y + 40}
                    x2={destNode.position.x}
                    y2={destNode.position.y + 40}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                    opacity="0.6"
                    markerEnd="url(#arrowhead)"
                  />
                );
              }
              return null;
            });
          }
          return null;
        })}
      </svg>
      
      {/* Render nodes */}
      {scenario.nodes.map((node: any) => (
        <div
          key={node.nodeId}
          className={`absolute border-2 rounded-lg p-3 cursor-pointer shadow-md bg-card hover:shadow-lg transition-shadow ${
            node.type === 'DataSource' ? 'border-blue-500 bg-blue-50' :
            node.type === 'Queue' ? 'border-green-500 bg-green-50' :
            node.type === 'ProcessNode' ? 'border-purple-500 bg-purple-50' :
            'border-gray-500 bg-gray-50'
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            minWidth: 120,
          }}
          onClick={() => console.log('Clicked node:', node.nodeId)}
        >
          <div className="font-semibold text-sm">{node.displayName}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {node.type}
          </div>
          {node.type === 'DataSource' && (
            <div className="text-xs mt-1">
              Interval: {node.interval}s
            </div>
          )}
          {node.type === 'Queue' && (
            <div className="text-xs mt-1">
              Window: {node.timeWindow}s
            </div>
          )}
          {node.type === 'ProcessNode' && (
            <div className="text-xs mt-1">
              Outputs: {node.outputs.length}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GraphVisualization;