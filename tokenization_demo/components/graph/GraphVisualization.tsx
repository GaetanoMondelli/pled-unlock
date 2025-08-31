
'use client';
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  MarkerType,
  Position,
} from 'reactflow';
import { useSimulationStore } from '@/stores/simulationStore';
import { type RFNodeData, type AnyNode, type RFEdgeData, type QueueState, type DataSourceState, type ProcessNodeState, type SinkState } from '@/lib/simulation/types';

import DataSourceNodeDisplay from './nodes/DataSourceNodeDisplay';
import QueueNodeDisplay from './nodes/QueueNodeDisplay';
import ProcessNodeDisplay from './nodes/ProcessNodeDisplay';
import SinkNodeDisplay from './nodes/SinkNodeDisplay';

const nodeTypes = {
  DataSource: DataSourceNodeDisplay,
  Queue: QueueNodeDisplay,
  ProcessNode: ProcessNodeDisplay,
  Sink: SinkNodeDisplay,
};

const GraphVisualization: React.FC = () => {
  const { scenario, nodeStates, setSelectedNodeId, nodesConfig, currentTime } = useSimulationStore(state => ({
    scenario: state.scenario,
    nodeStates: state.nodeStates,
    setSelectedNodeId: state.setSelectedNodeId,
    nodesConfig: state.nodesConfig,
    currentTime: state.currentTime,
  }));

  const [rfNodes, setRfNodes] = useState<Node<RFNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge<RFEdgeData>[]>([]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setRfNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setRfEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setRfEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: false }, eds)),
    []
  );

  useEffect(() => {
    if (scenario) {
      const initialNodes: Node<RFNodeData>[] = scenario.nodes.map((node: AnyNode) => ({
        id: node.nodeId,
        type: node.type,
        position: node.position,
        data: {
          label: node.displayName,
          type: node.type,
          config: node,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }));
      setRfNodes(initialNodes);

      const initialEdges: Edge<RFEdgeData>[] = [];
      scenario.nodes.forEach(node => {
        if (node.type === 'DataSource' || node.type === 'Queue') {
          if (node.destinationNodeId) {
            initialEdges.push({
              id: `e-${node.nodeId}-${node.destinationNodeId}`,
              source: node.nodeId,
              target: node.destinationNodeId,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--foreground))' },
              data: { animated: false }
            });
          }
        } else if (node.type === 'ProcessNode') {
          node.outputs.forEach((output, index) => {
            initialEdges.push({
              id: `e-${node.nodeId}-output${index}-${output.destinationNodeId}`,
              source: node.nodeId,
              sourceHandle: `output-${index}`, 
              target: output.destinationNodeId,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--foreground))' },
              data: { animated: false }
            });
          });
        }
      });
      setRfEdges(initialEdges);
    }
  }, [scenario]);

  // Update node data based on simulation state (e.g., activity, errors, details)
  useEffect(() => {
    setRfNodes(prevNodes =>
      prevNodes.map(rfNode => {
        const nodeConfig = nodesConfig[rfNode.id];
        const state = nodeStates[rfNode.id];
        if (!nodeConfig || !state) return rfNode;

        let details = '';
        let isActive = false; 

        switch(nodeConfig.type) {
          case 'DataSource':
            const dsState = state as DataSourceState;
            isActive = dsState.lastEmissionTime === currentTime && currentTime > 0;
            details = `Last emit: ${dsState.lastEmissionTime >=0 ? dsState.lastEmissionTime.toFixed(0)+'s' : 'N/A'}`;
            break;
          case 'Queue':
            const qState = state as QueueState;
            isActive = qState.outputBuffer.length > 0 || (qState.lastAggregationTime === currentTime && currentTime > 0);
            details = `In: ${qState.inputBuffer.length}, Out: ${qState.outputBuffer.length}`;
            break;
          case 'ProcessNode':
            const pnState = state as ProcessNodeState;
            isActive = pnState.lastFiredTime === currentTime && currentTime > 0;
            // Details for ProcessNode could be complex, e.g. counts from its inputBuffers.
            // For simplicity, keeping it minimal for now.
            const inputBufferCounts = Object.entries(pnState.inputBuffers)
                .map(([key, val]) => `${nodesConfig[key]?.displayName.substring(0,3) || key.substring(0,3)}:${val.length}`)
                .join(', ');
            details = inputBufferCounts ? `Inputs: ${inputBufferCounts}` : 'Awaiting inputs';

            break;
          case 'Sink':
            const sinkState = state as SinkState;
            isActive = sinkState.lastConsumedTime === currentTime && currentTime > 0;
            details = `Consumed: ${sinkState.consumedTokenCount}`;
            break;
        }
        
        return {
          ...rfNode,
          data: {
            ...rfNode.data,
            details,
            isActive,
          },
          // className: isActive ? 'node-active' : '', // Or use data.isActive in NodeDisplay components
        };
      })
    );
  }, [nodeStates, nodesConfig, currentTime]);

   // Update edge animation based on Queue output buffers
   useEffect(() => {
    setRfEdges(prevEdges =>
      prevEdges.map(edge => {
        const sourceNodeConfig = nodesConfig[edge.source];
        let hasActiveOutput = false;
        if (sourceNodeConfig && sourceNodeConfig.type === 'Queue') {
            const qState = nodeStates[edge.source] as QueueState;
            if (qState && qState.outputBuffer.length > 0 && sourceNodeConfig.destinationNodeId === edge.target) {
                hasActiveOutput = true;
            }
        }
        // Potentially add animation for ProcessNode outputs if needed, based on lastFiredTime and matching output edge

        return {
          ...edge,
          animated: hasActiveOutput,
          style: hasActiveOutput ? { stroke: 'hsl(var(--primary))', strokeWidth: 2.5 } : { strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: hasActiveOutput ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' },
        };
      })
    );
  }, [nodeStates, nodesConfig, currentTime]);


  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<RFNodeData>) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  if (!scenario) {
    return <div className="flex-grow flex items-center justify-center text-muted-foreground">Loading scenario data or scenario is invalid...</div>;
  }
  
  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
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

export default GraphVisualization;
