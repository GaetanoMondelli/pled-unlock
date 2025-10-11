"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataSourceNodeDisplay from "./nodes/DataSourceNodeDisplay";
import ProcessNodeDisplay from "./nodes/ProcessNodeDisplay";
import QueueNodeDisplay from "./nodes/QueueNodeDisplay";
import SinkNodeDisplay from "./nodes/SinkNodeDisplay";
import FSMNodeDisplay from "./nodes/FSMNodeDisplay";
import StateMultiplexerDisplay from "./nodes/StateMultiplexerDisplay";
import ModuleNodeDisplay from "./nodes/ModuleNodeDisplay";
import GroupNodeDisplay from "./nodes/GroupNodeDisplay";
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import { type AnyNode, type RFEdgeData, type RFNodeData } from "@/lib/simulation/types";
import { useSimulationStore } from "@/stores/simulationStore";
import { cn } from "@/lib/utils";
import ReactFlow, {
  Background,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import DeletableEdge from "./edges/DeletableEdge";
import {
  GroupNavigationManager,
  getNodesForCurrentView,
  generateGroupedScenario,
  createAutomaticGroups,
} from "@/lib/utils/advancedGroupingUtils";

const nodeTypes = {
  DataSource: DataSourceNodeDisplay,
  Queue: QueueNodeDisplay,
  ProcessNode: ProcessNodeDisplay,
  FSMProcessNode: FSMNodeDisplay,
  StateMultiplexer: StateMultiplexerDisplay,
  Sink: SinkNodeDisplay,
  Module: ModuleNodeDisplay,
  Group: GroupNodeDisplay,
};

const edgeTypes = {
  default: DeletableEdge,
};

interface EnhancedGraphVisualizationProps {
  className?: string;
}

const EnhancedGraphVisualization: React.FC<EnhancedGraphVisualizationProps> = ({ className }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const nodeStates = useSimulationStore(state => state.nodeStates);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const currentTime = useSimulationStore(state => state.currentTime);
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const setSelectedNodeId = useSimulationStore(state => state.setSelectedNodeId);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const saveSnapshot = useSimulationStore(state => state.saveSnapshot);

  const [rfNodes, setRfNodes] = useState<Node<RFNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge<RFEdgeData>[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [animatedEdges, setAnimatedEdges] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  // Navigation state
  const [navigationManager] = useState(() => new GroupNavigationManager("Template Instance"));
  const [navigationState, setNavigationState] = useState(() => navigationManager.getCurrentState());
  const [isGroupModeEnabled, setIsGroupModeEnabled] = useState(false);

  // Get nodes to display based on current navigation context
  const displayNodes = useMemo(() => {
    if (!scenario) return [];

    if (isGroupModeEnabled && navigationState.currentView === 'template') {
      // Show grouped view
      return generateGroupedScenario(scenario).nodes;
    } else {
      // Use the navigation-based filtering
      return getNodesForCurrentView(scenario, navigationState);
    }
  }, [scenario, navigationState, isGroupModeEnabled]);

  // Navigation handlers
  const handleNavigateToGroup = useCallback((groupTag: string) => {
    if (!scenario) return;

    const groupNodes = scenario.nodes.filter(node =>
      node.tags?.includes(groupTag) && !node.tags?.includes("_system_group")
    );

    const newState = navigationManager.navigateToGroup(groupTag, groupNodes);
    setNavigationState(newState);
  }, [scenario, navigationManager]);

  const handleNavigateToFSM = useCallback((fsmNodeId: string, fsmDisplayName: string) => {
    const newState = navigationManager.navigateToFSM(fsmNodeId, fsmDisplayName);
    setNavigationState(newState);
  }, [navigationManager]);

  const handleNavigateBack = useCallback(() => {
    const newState = navigationManager.navigateBack();
    setNavigationState(newState);
  }, [navigationManager]);

  const handleNavigateTo = useCallback((breadcrumbIndex: number) => {
    const newState = navigationManager.navigateTo(breadcrumbIndex);
    setNavigationState(newState);
  }, [navigationManager]);

  const handleToggleGroupMode = useCallback(() => {
    setIsGroupModeEnabled(prev => !prev);
  }, []);

  // Convert scenario nodes to ReactFlow format
  useEffect(() => {
    const nodes: Node<RFNodeData>[] = displayNodes.map((node) => {
      const nodeState = nodeStates[node.nodeId];
      const nodeConfig = nodesConfig[node.nodeId];
      const activityLog = nodeActivityLogs[node.nodeId] || [];
      const isActive = activeNodes.has(node.nodeId);

      // Calculate node count for group nodes
      let nodeCount = 0;
      if (node.type === "Group" && node.containedNodes) {
        nodeCount = node.containedNodes.length;
      }

      return {
        id: node.nodeId,
        position: node.position,
        type: node.type,
        data: {
          label: node.displayName,
          type: node.type,
          config: node,
          isActive,
          details: nodeState ? JSON.stringify(nodeState, null, 2) : undefined,
          stateMachine: nodeState?.stateMachine,
          nodeCount,
          nodeState,
        },
      };
    });

    setRfNodes(nodes);
  }, [displayNodes, nodeStates, nodesConfig, nodeActivityLogs, activeNodes]);

  // Convert connections to ReactFlow edges
  useEffect(() => {
    const edges: Edge<RFEdgeData>[] = [];

    displayNodes.forEach((node) => {
      if (node.outputs) {
        node.outputs.forEach((output) => {
          if (output.destinationNodeId) {
            // Check if the destination node is in the current view
            const destinationExists = displayNodes.some(n => n.nodeId === output.destinationNodeId);

            if (destinationExists) {
              const edgeId = `e-${node.nodeId}-${output.name}-${output.destinationNodeId}`;
              const isAnimated = animatedEdges.has(edgeId);

              edges.push({
                id: edgeId,
                source: node.nodeId,
                target: output.destinationNodeId,
                sourceHandle: `output-${output.name}`,
                targetHandle: `input-${output.destinationInputName}`,
                type: "default",
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: isAnimated ? "#10b981" : "#64748b",
                },
                style: {
                  stroke: isAnimated ? "#10b981" : "#64748b",
                  strokeWidth: isAnimated ? 3 : 2,
                },
                animated: isAnimated,
                data: { animated: isAnimated },
              });
            }
          }
        });
      }
    });

    setRfEdges(edges);
  }, [displayNodes, animatedEdges]);

  // Handle node clicks for group exploration
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<RFNodeData>) => {
    // Set selected node
    setSelectedNodeId(node.id);

    // Handle group navigation
    if (node.data.config.type === "Group") {
      const groupConfig = node.data.config as any;
      handleNavigateToGroup(groupConfig.groupName);
    }

    // Handle FSM exploration (for future)
    if (node.data.config.type === "FSMProcessNode") {
      // Future: navigate to FSM internal view
      // handleNavigateToFSM(node.id, node.data.label);
    }
  }, [setSelectedNodeId, handleNavigateToGroup]);

  // Standard ReactFlow handlers (simplified for brevity)
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setRfNodes(nds => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setRfEdges(eds => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target || !scenario) return;
    // Connection logic would be implemented here
  }, [scenario]);

  // Drag and drop handling
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const reactFlowBounds = (event.target as Element).closest('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    try {
      const nodeTemplate = JSON.parse(event.dataTransfer.getData('application/node-template'));
      if (!nodeTemplate || !nodeTemplate.defaultConfig) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      // Add node to scenario
      if (scenario) {
        saveSnapshot(`Add ${nodeTemplate.displayName}`);

        const newNodeId = `${nodeTemplate.type}_${Date.now()}`;
        const newNode = {
          ...nodeTemplate.defaultConfig,
          nodeId: newNodeId,
          position,
        };

        const updatedScenario = {
          ...scenario,
          nodes: [...scenario.nodes, newNode],
        };

        loadScenario(updatedScenario);
      }
    } catch (error) {
      console.error('Failed to parse dropped node data:', error);
    }
  }, [scenario, saveSnapshot, loadScenario]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        navigationState={navigationState}
        onNavigateTo={handleNavigateTo}
        onNavigateBack={handleNavigateBack}
        onToggleGroupMode={handleToggleGroupMode}
        isGroupModeEnabled={isGroupModeEnabled}
      />

      {/* ReactFlow Graph */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className={cn(
            "transition-all duration-200",
            isDragOver ? "bg-blue-50" : "bg-white",
            navigationState.currentView === 'group' ? "bg-green-50" : "",
            navigationState.currentView === 'fsm' ? "bg-orange-50" : ""
          )}
          fitView
          fitViewOptions={{ padding: 0.1 }}
        >
          <Background color="#e2e8f0" />
          <Controls />

          {/* Drop indicator */}
          {isDragOver && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-50 border-2 border-dashed border-blue-400 pointer-events-none flex items-center justify-center">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                Drop to add node
              </div>
            </div>
          )}

          {/* Context indicator */}
          {navigationState.currentView !== 'template' && (
            <div className="absolute top-4 right-4 bg-white shadow-lg border rounded-lg p-3 min-w-48">
              <div className="text-sm font-medium text-gray-800">
                {navigationState.currentView === 'group' && (
                  <>
                    Group View: {navigationState.currentContext}
                    <div className="text-xs text-gray-600 mt-1">
                      Showing {navigationState.filteredNodeIds.length} grouped nodes
                    </div>
                  </>
                )}
                {navigationState.currentView === 'fsm' && (
                  <>
                    FSM View: {navigationState.currentContext}
                    <div className="text-xs text-gray-600 mt-1">
                      Internal state machine view
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export default EnhancedGraphVisualization;