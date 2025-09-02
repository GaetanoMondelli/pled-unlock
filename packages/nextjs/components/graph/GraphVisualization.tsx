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
import 'reactflow/dist/style.css';
import { useSimulationStore } from '@/stores/simulationStore';
import { type RFNodeData, type AnyNode, type RFEdgeData } from '@/lib/simulation/types';

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
  const scenario = useSimulationStore(state => state.scenario);
  const nodeStates = useSimulationStore(state => state.nodeStates);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const currentTime = useSimulationStore(state => state.currentTime);
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const setSelectedNodeId = useSimulationStore(state => state.setSelectedNodeId);

  const [rfNodes, setRfNodes] = useState<Node<RFNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge<RFEdgeData>[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [animatedEdges, setAnimatedEdges] = useState<Set<string>>(new Set());

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

  // Initialize nodes and edges when scenario loads
  useEffect(() => {
    if (!scenario) return;

    const initialNodes: Node<RFNodeData>[] = scenario.nodes.map((node: AnyNode) => ({
      id: node.nodeId,
      type: node.type,
      position: node.position,
      data: {
        label: node.displayName,
        type: node.type,
        config: node,
        isActive: false,
        details: '',
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
  }, [scenario]);

  // Update visual states based on recent activity
  useEffect(() => {
    if (!scenario || !nodeActivityLogs) return;

    const flashDuration = 1; // seconds - short flash
    const newActiveNodes = new Set<string>();
    const newAnimatedEdges = new Set<string>();

    // Check for very recent activity in each node (just happened this tick)
    Object.entries(nodeActivityLogs).forEach(([nodeId, logs]) => {
      const veryRecentLogs = logs.filter(log => currentTime - log.timestamp <= flashDuration);
      if (veryRecentLogs.length > 0) {
        newActiveNodes.add(nodeId);
        
        // Check for token flow events to animate edges
        veryRecentLogs.forEach(log => {
          if (log.action === 'EMITTED' || log.action === 'OUTPUT_GENERATED' || log.action === 'TOKEN_FORWARDED_FROM_OUTPUT') {
            // Find edges from this node and animate them
            const nodeConfig = nodesConfig[nodeId];
            if (nodeConfig) {
              if (nodeConfig.type === 'DataSource' || nodeConfig.type === 'Queue') {
                if (nodeConfig.destinationNodeId) {
                  newAnimatedEdges.add(`e-${nodeId}-${nodeConfig.destinationNodeId}`);
                }
              } else if (nodeConfig.type === 'ProcessNode') {
                nodeConfig.outputs.forEach((output, index) => {
                  newAnimatedEdges.add(`e-${nodeId}-output${index}-${output.destinationNodeId}`);
                });
              }
            }
          }
        });
      }
    });

    setActiveNodes(newActiveNodes);
    setAnimatedEdges(newAnimatedEdges);

    // Clear animations after a short delay
    const animationTimeout = setTimeout(() => {
      setActiveNodes(new Set());
      setAnimatedEdges(new Set());
    }, 800);

    return () => clearTimeout(animationTimeout);
  }, [currentTime, nodeActivityLogs, nodesConfig, scenario]);

  // Update node data with activity states
  useEffect(() => {
    setRfNodes(prevNodes => 
      prevNodes.map(node => {
        const isActive = activeNodes.has(node.id);
        const nodeState = nodeStates[node.id];
        const recentLogs = nodeActivityLogs[node.id]?.filter(log => currentTime - log.timestamp <= 2) || [];
        const latestLog = recentLogs[recentLogs.length - 1];
        
        let details = '';
        if (nodeState) {
          switch (node.data.config.type) {
            case 'DataSource':
              const dsState = nodeState as any;
              details = `Last emission: ${dsState.lastEmissionTime >= 0 ? dsState.lastEmissionTime + 's' : 'Never'}`;
              break;
            case 'Queue':
              const qState = nodeState as any;
              details = `Buffer: ${qState.inputBuffer?.length || 0} in, ${qState.outputBuffer?.length || 0} out`;
              break;
            case 'ProcessNode':
              const pState = nodeState as any;
              const totalInputs = Object.values(pState.inputBuffers || {}).reduce((sum: number, buffer: any) => sum + (buffer?.length || 0), 0);
              details = `Inputs: ${totalInputs}, Last fired: ${pState.lastFiredTime >= 0 ? pState.lastFiredTime + 's' : 'Never'}`;
              break;
            case 'Sink':
              const sState = nodeState as any;
              details = `Consumed: ${sState.consumedTokenCount || 0} tokens`;
              break;
          }
        }

        return {
          ...node,
          data: {
            ...node.data,
            isActive,
            details,
            error: latestLog?.action === 'FORMULA_ERROR' ? latestLog.details : undefined,
          }
        };
      })
    );
  }, [activeNodes, nodeStates, nodeActivityLogs, currentTime]);

  // Update edge animations
  useEffect(() => {
    setRfEdges(prevEdges =>
      prevEdges.map(edge => ({
        ...edge,
        animated: animatedEdges.has(edge.id),
        style: animatedEdges.has(edge.id) ? { 
          stroke: 'hsl(var(--primary))', 
          strokeWidth: 2 
        } : undefined,
      }))
    );
  }, [animatedEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<RFNodeData>) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  if (!scenario) {
    return (
      <div className="flex-grow flex items-center justify-center text-muted-foreground">
        Loading scenario data or scenario is invalid...
      </div>
    );
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