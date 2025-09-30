"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataSourceNodeDisplay from "./nodes/DataSourceNodeDisplay";
import ProcessNodeDisplay from "./nodes/ProcessNodeDisplay";
import QueueNodeDisplay from "./nodes/QueueNodeDisplay";
import SinkNodeDisplay from "./nodes/SinkNodeDisplay";
import FSMProcessNodeDisplay from "./nodes/FSMProcessNodeDisplay";
import ModuleNodeDisplay from "./nodes/ModuleNodeDisplay";
import GroupNodeDisplay from "./nodes/GroupNodeDisplay";
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
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import { GroupNavigationManager } from "@/lib/utils/advancedGroupingUtils";

const nodeTypes = {
  DataSource: DataSourceNodeDisplay,
  Queue: QueueNodeDisplay,
  ProcessNode: ProcessNodeDisplay,
  FSMProcessNode: FSMProcessNodeDisplay,
  Sink: SinkNodeDisplay,
  Module: ModuleNodeDisplay,
  Group: GroupNodeDisplay,
};

const edgeTypes = {
  default: DeletableEdge,
};

const GraphVisualization: React.FC = () => {
  const scenario = useSimulationStore(state => state.scenario);
  const nodeStates = useSimulationStore(state => state.nodeStates);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const currentTime = useSimulationStore(state => state.currentTime);
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const setSelectedNodeId = useSimulationStore(state => state.setSelectedNodeId);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const saveSnapshot = useSimulationStore(state => state.saveSnapshot);
  const undo = useSimulationStore(state => state.undo);
  const redo = useSimulationStore(state => state.redo);
  const canUndo = useSimulationStore(state => state.canUndo);
  const canRedo = useSimulationStore(state => state.canRedo);

  const [rfNodes, setRfNodes] = useState<Node<RFNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge<RFEdgeData>[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [animatedEdges, setAnimatedEdges] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlChangeCounter, setUrlChangeCounter] = useState(0);

  // Navigation state for breadcrumb system
  const [navigationManager] = useState(() => new GroupNavigationManager("Template"));
  const [navigationState, setNavigationState] = useState(() => navigationManager.getCurrentState());

  // Listen for URL changes from external sources
  useEffect(() => {
    const handleUrlChange = () => {
      setUrlChangeCounter(prev => prev + 1);
    };
    window.addEventListener('urlchange', handleUrlChange);
    return () => window.removeEventListener('urlchange', handleUrlChange);
  }, []);

  // Handle group navigation from URL parameter (both initial and changes)
  useEffect(() => {
    if (!scenario) return;

    const params = new URLSearchParams(window.location.search);
    const groupParam = params.get('group');

    if (groupParam && groupParam !== navigationState.currentContext) {
      // Navigate to group if URL parameter is set and different from current state
      const groupNodes = scenario.nodes.filter(n => n.tags?.includes(groupParam));
      if (groupNodes.length > 0) {
        const newState = navigationManager.navigateToGroup(groupParam, groupNodes);
        setNavigationState(newState);
      }
    } else if (!groupParam && navigationState.currentView === 'group') {
      // Navigate back to template if URL parameter is removed
      const newState = navigationManager.navigateBack();
      setNavigationState(newState);
    }
  }, [urlChangeCounter, scenario, navigationManager, navigationState]);

  // Filter nodes based on grouping configuration and navigation state
  const filteredNodes = useMemo(() => {
    if (!scenario) return [];

    // Handle navigation-based filtering
    if (navigationState.currentView === 'group' && navigationState.currentContext) {
      // Show only nodes in the current group
      return scenario.nodes.filter(node =>
        node.tags?.includes(navigationState.currentContext!)
      );
    }

    const visualMode = scenario.groups?.visualMode || "all";
    const activeFilters = scenario.groups?.activeFilters || [];

    if (visualMode === "filtered" && activeFilters.length > 0) {
      // Show only nodes that have at least one of the active tags
      return scenario.nodes.filter(node => {
        if (node.type === "Group") return true; // Always show groups
        if (!node.tags || node.tags.length === 0) return false;
        return node.tags.some(tag => activeFilters.includes(tag));
      });
    }

    if (visualMode === "grouped") {
      // In grouped mode, show existing GroupNodes + ungrouped nodes
      const existingGroupNodes = scenario.nodes.filter(node => node.type === "Group");

      // Get all node IDs that are already in groups
      const groupedNodeIds = new Set<string>();
      existingGroupNodes.forEach(groupNode => {
        groupNode.containedNodes?.forEach(nodeId => groupedNodeIds.add(nodeId));
      });

      // Show ungrouped nodes + group nodes
      const ungroupedNodes = scenario.nodes.filter(node =>
        node.type !== "Group" && !groupedNodeIds.has(node.nodeId)
      );

      return [...ungroupedNodes, ...existingGroupNodes];
    }

    // Default: show all nodes (excluding Group nodes when not in grouped mode)
    return scenario.nodes.filter(node => node.type !== "Group");
  }, [
    scenario?.nodes,
    scenario?.groups?.visualMode,
    scenario?.groups?.activeFilters,
    navigationState
  ]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    // ALWAYS apply changes to ReactFlow state first for smooth interaction
    setRfNodes(nds => applyNodeChanges(changes, nds));

    // Handle node deletions by updating the scenario
    const nodeDeleteChanges = changes.filter(change => change.type === 'remove');
    if (nodeDeleteChanges.length > 0 && scenario) {
      // Save snapshot before deletion
      saveSnapshot('Delete nodes');

      const deletedNodeIds = nodeDeleteChanges.map(change => change.id);

      // Remove nodes from scenario and clean up references
      const updatedNodes = scenario.nodes.filter(node => !deletedNodeIds.includes(node.nodeId));

      // Clean up references in remaining nodes
      const cleanedNodes = updatedNodes.map(node => {
        if (node.outputs) {
          // Clean up outputs that reference deleted nodes
          const cleanedOutputs = node.outputs.map(output =>
            deletedNodeIds.includes(output.destinationNodeId)
              ? { ...output, destinationNodeId: '' }
              : output
          );
          return { ...node, outputs: cleanedOutputs };
        }
        if (node.inputs) {
          // Clean up inputs that reference deleted nodes
          const cleanedInputs = node.inputs.filter(input => input.nodeId && !deletedNodeIds.includes(input.nodeId));
          return { ...node, inputs: cleanedInputs };
        }
        return node;
      });

      const updatedScenario = { ...scenario, nodes: cleanedNodes };
      loadScenario(updatedScenario);
    }
  }, [scenario, loadScenario, saveSnapshot]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    // Handle edge deletions by updating the scenario
    const edgeDeleteChanges = changes.filter(change => change.type === 'remove');
    if (edgeDeleteChanges.length > 0 && scenario) {
      // Save snapshot before deletion
      saveSnapshot('Delete edges');
      
      const deletedEdgeIds = edgeDeleteChanges.map(change => change.id);
      
      const updatedNodes = scenario.nodes.map(node => {
        if (node.outputs) {
          // Check if any of this node's edges were deleted
          const updatedOutputs = node.outputs.map((output) => {
            const expectedEdgeId = `e-${node.nodeId}-${output.name}-${output.destinationNodeId}`;
            if (deletedEdgeIds.includes(expectedEdgeId)) {
              return { ...output, destinationNodeId: '' };
            }
            return output;
          });
          return { ...node, outputs: updatedOutputs };
        }
        return node;
      });
      
      const updatedScenario = { ...scenario, nodes: updatedNodes };
      loadScenario(updatedScenario);
    } else {
      // Only apply direct visual changes if we didn't update the scenario
      setRfEdges(eds => applyEdgeChanges(changes, eds));
    }
  }, [scenario, loadScenario, saveSnapshot]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !scenario) return;

      // Save snapshot before creating connection
      saveSnapshot('Create connection');

      // Update the scenario JSON to reflect the new connection
      const updatedNodes = scenario.nodes.map(node => {
        if (node.nodeId === params.source && node.outputs) {
          // All nodes use outputs array in v3
          const outputName = params.sourceHandle ? params.sourceHandle.replace('output-', '') : 'output';
          const updatedOutputs = node.outputs.map(output => {
            if (output.name === outputName) {
              return { ...output, destinationNodeId: params.target };
            }
            return output;
          });
          return { ...node, outputs: updatedOutputs };
        }
        return node;
      });

      const updatedScenario = { ...scenario, nodes: updatedNodes };
      loadScenario(updatedScenario);
    },
    [scenario, saveSnapshot, loadScenario],
  );


  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!scenario) return;

      // Handle all nodes including groups - update position in scenario.nodes
      const updatedNodes = scenario.nodes.map(scenarioNode => {
        if (scenarioNode.nodeId === node.id) {
          return {
            ...scenarioNode,
            position: {
              x: node.position.x,
              y: node.position.y,
            },
          };
        }
        return scenarioNode;
      });

      const updatedScenario = { ...scenario, nodes: updatedNodes };
      loadScenario(updatedScenario);
    },
    [scenario, loadScenario],
  );

  // Initialize nodes and edges when scenario loads
  useEffect(() => {
    if (!scenario) return;

    // Preserve current ReactFlow positions before recreating nodes
    const currentPositions = new Map<string, { x: number; y: number }>();
    rfNodes.forEach(node => {
      currentPositions.set(node.id, { x: node.position.x, y: node.position.y });
    });

    const initialNodes: Node<RFNodeData>[] = filteredNodes.map((node: AnyNode) => {
      // Use current ReactFlow position if available, otherwise use scenario position
      const currentPos = currentPositions.get(node.nodeId);
      const position = currentPos || {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
      };

      const baseData: RFNodeData = {
        label: node.displayName,
        type: node.type,
        config: node,
        isActive: false,
        details: "",
      };

      // Add specific data for Group nodes
      if (node.type === "Group") {
        baseData.nodeCount = node.containedNodes?.length || 0;
      }

      return {
        id: node.nodeId,
        type: node.type,
        position,
        deletable: true,
        draggable: true, // Explicitly ensure all nodes are draggable
        data: baseData,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
    setRfNodes(initialNodes);

    const initialEdges: Edge<RFEdgeData>[] = [];
    
    // Create edges based on visible nodes only
    const visibleNodeIds = new Set(filteredNodes.map(node => node.nodeId));
    
    filteredNodes.forEach(node => {
      if (node.type === "Group") {
        // Handle group node edges differently
        // Groups show aggregated inputs/outputs from contained nodes
        // This is a simplified version - you may want more sophisticated edge handling
        if (node.inputs) {
          node.inputs.forEach((input, index) => {
            if (input.nodeId && visibleNodeIds.has(input.nodeId)) {
              initialEdges.push({
                id: `e-${input.nodeId}-group-${node.nodeId}`,
                source: input.nodeId,
                target: node.nodeId,
                targetHandle: `input-${input.name}`,
                type: "default",
                deletable: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--foreground))" },
                data: { animated: false },
              });
            }
          });
        }
        
        if (node.outputs) {
          node.outputs.forEach((output, index) => {
            if (output.destinationNodeId && visibleNodeIds.has(output.destinationNodeId)) {
              initialEdges.push({
                id: `e-${node.nodeId}-${output.name}-${output.destinationNodeId}`,
                source: node.nodeId,
                sourceHandle: `output-${output.name}`,
                target: output.destinationNodeId,
                type: "default",
                deletable: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--foreground))" },
                data: { animated: false },
              });
            }
          });
        }
      } else if (node.outputs) {
        // Handle regular node edges
        node.outputs.forEach((output, index) => {
          if (output.destinationNodeId && 
              output.destinationNodeId.trim() !== "" && 
              visibleNodeIds.has(output.destinationNodeId)) {
            const sourceHandle = node.type === "ProcessNode" ? `output-${output.name}` : undefined;
            initialEdges.push({
              id: `e-${node.nodeId}-${output.name}-${output.destinationNodeId}`,
              source: node.nodeId,
              sourceHandle,
              target: output.destinationNodeId,
              type: "default",
              deletable: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--foreground))" },
              data: { animated: false },
            });
          }
        });
      }
    });
    setRfEdges(initialEdges);
  }, [scenario, filteredNodes]);

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
          if (
            log.action === "EMITTED" ||
            log.action === "OUTPUT_GENERATED" ||
            log.action === "TOKEN_FORWARDED_FROM_OUTPUT"
          ) {
            // Find edges from this node and animate them
            const nodeConfig = nodesConfig[nodeId];
            if (nodeConfig && nodeConfig.outputs) {
              // All nodes use outputs array in v3
              nodeConfig.outputs.forEach((output) => {
                newAnimatedEdges.add(`e-${nodeId}-${output.name}-${output.destinationNodeId}`);
              });
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

        let details = "";
        if (nodeState) {
          switch (node.data.config.type) {
            case "DataSource":
              const dsState = nodeState as any;
              details = `Last emission: ${dsState.lastEmissionTime >= 0 ? dsState.lastEmissionTime + "s" : "Never"}`;
              break;
            case "Queue":
              const qState = nodeState as any;
              details = `Buffer: ${qState.inputBuffer?.length || 0} in, ${qState.outputBuffer?.length || 0} out`;
              break;
            case "ProcessNode":
              const pState = nodeState as any;
              const totalInputs = Object.values(pState.inputBuffers || {}).reduce(
                (sum: number, buffer: any) => sum + (buffer?.length || 0),
                0,
              );
              details = `Inputs: ${totalInputs}, Last fired: ${pState.lastFiredTime >= 0 ? pState.lastFiredTime + "s" : "Never"}`;
              break;
            case "FSMProcessNode":
              const fsmState = nodeState as any;
              const fsmInputs = Object.values(fsmState.inputBuffers || {}).reduce(
                (sum: number, buffer: any) => sum + (buffer?.length || 0),
                0,
              );
              details = `State: ${fsmState.currentFSMState || 'unknown'}, Inputs: ${fsmInputs}`;
              break;
            case "Sink":
              const sState = nodeState as any;
              details = `Consumed: ${sState.consumedTokenCount || 0} tokens`;
              break;
            case "Module":
              const mState = nodeState as any;
              const moduleInputs = Object.values(mState.inputBuffers || {}).reduce(
                (sum: number, buffer: any) => sum + (buffer?.length || 0),
                0,
              );
              const moduleOutputs = Object.values(mState.outputBuffers || {}).reduce(
                (sum: number, buffer: any) => sum + (buffer?.length || 0),
                0,
              );
              const subNodeCount = Object.keys(mState.subGraphStates || {}).length;
              details = `I/O: ${moduleInputs}/${moduleOutputs}, Sub-nodes: ${subNodeCount}`;
              break;
          }
        }

        return {
          ...node,
          data: {
            ...node.data,
            isActive,
            details,
            error: latestLog?.action === "FORMULA_ERROR" ? latestLog.details : undefined,
            // Add state machine information
            stateMachine: nodeState?.stateMachine ? {
              currentState: nodeState.stateMachine.currentState,
              stateDisplayName: nodeState.stateMachine.currentState.split('_')[1], // e.g., "queue_idle" -> "idle"
              transitionCount: nodeState.stateMachine.transitionHistory?.length || 0,
            } : undefined,
            // Add full node state for FSM nodes
            nodeState: node.data.config.type === "FSMProcessNode" ? nodeState : undefined,
          },
        };
      }),
    );
  }, [activeNodes, nodeStates, nodeActivityLogs, currentTime]);

  // Update edge animations
  useEffect(() => {
    setRfEdges(prevEdges =>
      prevEdges.map(edge => ({
        ...edge,
        animated: animatedEdges.has(edge.id),
        style: animatedEdges.has(edge.id)
          ? {
              stroke: "hsl(var(--primary))",
              strokeWidth: 2,
            }
          : undefined,
      })),
    );
  }, [animatedEdges]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) {
          undo();
        }
      } else if (((event.ctrlKey || event.metaKey) && event.key === 'y') || 
                 ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<RFNodeData>) => {
      setSelectedNodeId(node.id);

      // Handle group navigation
      if (node.data?.config?.type === "Group") {
        const groupConfig = node.data.config;

        // Double-click to navigate into group
        if (event.detail === 2) {
          const groupNodes = scenario?.nodes.filter(n =>
            n.tags?.includes(groupConfig.groupName)
          ) || [];

          const newState = navigationManager.navigateToGroup(groupConfig.groupName, groupNodes);
          setNavigationState(newState);
        }
      }
    },
    [setSelectedNodeId, scenario, navigationManager],
  );

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node<RFNodeData>) => {
      // Handle group navigation on double-click
      if (node.data.config.type === "Group" && scenario) {
        const groupNode = scenario.nodes.find(n => n.nodeId === node.id && n.type === "Group");
        if (groupNode && groupNode.groupName) {
          // Navigate into the group - show only nodes with that tag
          const groupNodes = scenario.nodes.filter(n => n.tags?.includes(groupNode.groupName!));
          const newState = navigationManager.navigateToGroup(groupNode.groupName, groupNodes);
          setNavigationState(newState);

          // Update URL to reflect navigation state
          const url = new URL(window.location.href);
          url.searchParams.set('group', groupNode.groupName);
          window.history.pushState({}, '', url.toString());
        }
      }
    },
    [scenario, navigationManager],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const templateData = event.dataTransfer.getData('application/node-template');
      
      if (!templateData || !scenario) return;
      
      try {
        const template = JSON.parse(templateData);
        
        // Save snapshot before adding node
        saveSnapshot(`Add ${template.displayName}`);
        
        // Calculate position relative to ReactFlow canvas
        const position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 50,
        };
        
        // Generate unique ID
        const timestamp = Date.now();
        const nodeId = `${template.type}_${timestamp}`;
        
        // Create new node with clean template defaults - no forced connections
        const newNode = {
          ...template.defaultConfig,
          nodeId,
          displayName: `${template.displayName} ${scenario.nodes.length + 1}`,
          position,
        };

        // If inside a group, automatically assign the group tag
        if (navigationState.currentView === 'group' && navigationState.currentContext) {
          newNode.tags = [...(newNode.tags || []), navigationState.currentContext];
        }

        // Add to scenario
        const updatedScenario = {
          ...scenario,
          version: '3.0',
          nodes: [...scenario.nodes, newNode],
        };

        loadScenario(updatedScenario);
      } catch (error) {
        console.error('Failed to drop node:', error);
      }
    },
    [scenario, loadScenario, saveSnapshot],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    // Only set drag over to false if we're leaving the main container
    const current = event.currentTarget as Element;
    const related = event.relatedTarget as Element | null;
    if (!related || !current.contains(related)) {
      setIsDragOver(false);
    }
  }, []);

  // Breadcrumb navigation handlers
  const handleNavigateBack = useCallback(() => {
    const newState = navigationManager.navigateBack();
    setNavigationState(newState);

    // Update URL to reflect navigation state
    const url = new URL(window.location.href);
    if (newState.currentView === 'template') {
      url.searchParams.delete('group');
    } else if (newState.currentView === 'group' && newState.currentContext) {
      url.searchParams.set('group', newState.currentContext);
    }
    window.history.pushState({}, '', url.toString());
  }, [navigationManager]);

  const handleNavigateTo = useCallback((breadcrumbIndex: number) => {
    const newState = navigationManager.navigateTo(breadcrumbIndex);
    setNavigationState(newState);

    // Update URL to reflect navigation state
    const url = new URL(window.location.href);
    if (newState.currentView === 'template') {
      url.searchParams.delete('group');
    } else if (newState.currentView === 'group' && newState.currentContext) {
      url.searchParams.set('group', newState.currentContext);
    }
    window.history.pushState({}, '', url.toString());
  }, [navigationManager]);

  const handleToggleGroupMode = useCallback(() => {
    // This can toggle between all view and current group view
    if (navigationState.currentView === 'group') {
      // Go back to template view
      handleNavigateBack();
    }
  }, [navigationState, handleNavigateBack]);

  if (!scenario) {
    return (
      <div className="flex-grow flex items-center justify-center text-muted-foreground">
        Loading scenario data or scenario is invalid...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Breadcrumb Navigation */}
      {navigationState.breadcrumbs.length > 1 && (
        <BreadcrumbNavigation
          navigationState={navigationState}
          onNavigateTo={handleNavigateTo}
          onNavigateBack={handleNavigateBack}
          onToggleGroupMode={handleToggleGroupMode}
          isGroupModeEnabled={navigationState.currentView !== 'template'}
        />
      )}

      {/* Main Graph Area */}
      <div
        className={cn(
          "flex-1 relative",
          isDragOver && "ring-2 ring-indigo-400 ring-offset-2 bg-indigo-50/50"
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Ctrl"]}
        className="bg-background w-full h-full"
        defaultEdgeOptions={{
          type: "default",
          markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--foreground))" },
        }}
      >
        <Controls />
        <Background color="hsl(var(--border))" gap={16} />
      </ReactFlow>
      
      {/* Drop zone indicator */}
      {isDragOver && (
        <div className="absolute inset-4 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center pointer-events-none bg-indigo-50/80">
          <div className="text-indigo-600 font-medium text-lg">Drop node here</div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GraphVisualization;
