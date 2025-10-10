"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataSourceNodeDisplay from "./nodes/DataSourceNodeDisplay";
import ProcessNodeDisplay from "./nodes/ProcessNodeDisplay";
import QueueNodeDisplay from "./nodes/QueueNodeDisplay";
import SinkNodeDisplay from "./nodes/SinkNodeDisplay";
import DecoupledFSMNodeDisplay from "./nodes/DecoupledFSMNodeDisplay";
import StateMultiplexerDisplay from "./nodes/StateMultiplexerDisplay";
import ModuleNodeDisplay from "./nodes/ModuleNodeDisplay";
import GroupNodeDisplay from "./nodes/GroupNodeDisplay";
import {
  type AnyNode,
  type RFEdgeData,
  type RFNodeData,
  type AnyNodeState,
  type StateMachineInfo,
} from "@/lib/simulation/types";
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
  FSMProcessNode: DecoupledFSMNodeDisplay,
  StateMultiplexer: StateMultiplexerDisplay,
  Sink: SinkNodeDisplay,
  Module: ModuleNodeDisplay,
  Group: GroupNodeDisplay,
};

const edgeTypes = {
  default: DeletableEdge,
};

const hasStateMachine = (
  state?: AnyNodeState,
): state is AnyNodeState & { stateMachine: StateMachineInfo } => {
  return Boolean(state && "stateMachine" in state && state.stateMachine);
};

const getStateDisplayName = (state?: string) => {
  if (!state) return undefined;
  const [, ...rest] = state.split("_");
  return rest.length > 0 ? rest.join("_") : state;
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
    console.log(`🔄 [NODES CHANGE] Changes:`, changes, `current time: ${currentTime}`);
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
      console.log(`💥 [LOAD SCENARIO] From onNodesChange - node deletion, current time: ${currentTime}`);
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
      console.log('🗑️ [DELETE EDGES] Deleting edges:', deletedEdgeIds);
      
      // Parse edge IDs to get connection info: e-{sourceId}-{outputName}-{targetId}
      const deletedConnections = deletedEdgeIds.map(edgeId => {
        const parts = edgeId.split('-');
        if (parts.length >= 4) {
          return {
            sourceId: parts[1],
            outputName: parts[2],
            targetId: parts.slice(3).join('-') // Handle IDs with dashes
          };
        }
        return null;
      }).filter(Boolean);
      
      const updatedNodes = scenario.nodes.map(node => {
        let updatedNode = { ...node };
        
        // Update source nodes: clear destinationNodeId in outputs
        if (node.outputs) {
          const updatedOutputs = node.outputs.map((output) => {
            const expectedEdgeId = `e-${node.nodeId}-${output.name}-${output.destinationNodeId}`;
            if (deletedEdgeIds.includes(expectedEdgeId)) {
              console.log(`🗑️ Clearing output ${output.name} on node ${node.nodeId}`);
              return { ...output, destinationNodeId: '' };
            }
            return output;
          });
          updatedNode = { ...updatedNode, outputs: updatedOutputs };
        }
        
        // Update target nodes: remove inputs that reference deleted connections
        if (node.inputs && node.inputs.length > 0) {
          const updatedInputs = node.inputs.filter(input => {
            // Check if this input is part of a deleted connection
            const isDeleted = deletedConnections.some(conn => 
              conn && 
              conn.sourceId === input.nodeId && 
              conn.targetId === node.nodeId &&
              conn.outputName === input.sourceOutputName
            );
            
            if (isDeleted) {
              console.log(`🗑️ Removing input ${input.name} from node ${node.nodeId} (was from ${input.nodeId})`);
            }
            
            return !isDeleted;
          });
          updatedNode = { ...updatedNode, inputs: updatedInputs };
        }
        
        return updatedNode;
      });
      
      const updatedScenario = { ...scenario, nodes: updatedNodes };
      console.log('🗑️ [DELETE EDGES] Updated scenario');
      loadScenario(updatedScenario);
    } else {
      // Only apply direct visual changes if we didn't update the scenario
      setRfEdges(eds => applyEdgeChanges(changes, eds));
    }
  }, [scenario, loadScenario, saveSnapshot]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !scenario) return;

      const sourceNode = scenario.nodes.find(n => n.nodeId === params.source);
      const targetNode = scenario.nodes.find(n => n.nodeId === params.target);
      
      console.log('🔗 [CONNECT] Attempting connection:', {
        source: params.source,
        sourceType: sourceNode?.type,
        sourceHandle: params.sourceHandle,
        sourceOutputs: sourceNode?.outputs?.map(o => o.name),
        sourceFsmOutputs: (sourceNode as any)?.fsm?.outputs,
        target: params.target,
        targetType: targetNode?.type,
        targetHandle: params.targetHandle,
        targetInputs: targetNode?.inputs?.map(i => i.name),
      });

      // Validate that source and target nodes exist
      if (!sourceNode || !targetNode) {
        console.error('❌ [CONNECT] Source or target node not found!');
        return;
      }
      
      // CRITICAL: Validate source handle exists
      if (!params.sourceHandle) {
        console.error('❌ [CONNECT] No sourceHandle provided!', params);
        return;
      }

      // Save snapshot before creating connection
      saveSnapshot('Create connection');

      // Update the scenario JSON to reflect the new connection
      const updatedNodes = scenario.nodes.map(node => {
        if (node.nodeId === params.source) {
          // Get the source handle name (this is what the user connected from)
          const sourceHandleName = params.sourceHandle || 'output';
          
          // Special handling for FSMProcessNode - ensure it has the required output structure
          if (node.type === 'FSMProcessNode') {
            // CRITICAL: sourceHandleName is the ACTUAL handle ID from the FSM display
            // FSM displays use output names from fsm.outputs as handle IDs
            // So sourceHandleName IS the correct output name to use
            const outputName = sourceHandleName || 'state';
            
            console.log('🔗 [FSM CONNECT] Connecting FSM output:', {
              handleName: sourceHandleName,
              outputName,
              fsmOutputs: (node as any).fsm?.outputs,
              existingOutputs: node.outputs?.map(o => o.name)
            });
            
            // Check if node already has outputs array
            if (node.outputs && node.outputs.length > 0) {
              // Check if this specific output already exists
              const existingOutputIndex = node.outputs.findIndex(o => o.name === outputName);
              
              if (existingOutputIndex !== -1) {
                // Update existing output
                const updatedOutputs = node.outputs.map(output => {
                  if (output.name === outputName) {
                    console.log('🔄 Updating existing FSM output:', outputName);
                    return {
                      ...output,
                      destinationNodeId: params.target,
                      destinationInputName: params.targetHandle || 'input'
                    };
                  }
                  return output;
                });
                return { ...node, outputs: updatedOutputs };
              } else {
                // Add new output to existing array
                console.log('➕ Adding new FSM output:', outputName);
                return {
                  ...node,
                  outputs: [...node.outputs, {
                    name: outputName,
                    destinationNodeId: params.target,
                    destinationInputName: params.targetHandle || 'input',
                    interface: { type: 'StateContext', requiredFields: ['data.currentState', 'data.context'] }
                  }]
                };
              }
            } else {
              // Create new outputs array
              console.log('🆕 Creating new FSM outputs array with:', outputName);
              return {
                ...node,
                outputs: [{
                  name: outputName,
                  destinationNodeId: params.target,
                  destinationInputName: params.targetHandle || 'input',
                  interface: { type: 'StateContext', requiredFields: ['data.currentState', 'data.context'] }
                }]
              };
            }
          }
          
          // Handle nodes with outputs array (V3 format) - for other node types
          if (node.outputs && node.outputs.length > 0) {
            // Find the matching output by name
            // For ProcessNode, handle ID is "output-{name}" so we need to strip the prefix
            // For other nodes, handle ID is the output name directly
            let matchingOutputName = sourceHandleName;
            if (node.type === 'ProcessNode' && sourceHandleName.startsWith('output-')) {
              matchingOutputName = sourceHandleName.replace('output-', '');
            }
            
            const updatedOutputs = node.outputs.map(output => {
              if (output.name === matchingOutputName) {
                return {
                  ...output,
                  destinationNodeId: params.target,
                  destinationInputName: params.targetHandle || 'input'
                };
              }
              return output;
            });
            return { ...node, outputs: updatedOutputs };
          }
        }

        // Also update the target node's inputs if needed
        if (node.nodeId === params.target) {
          let inputName = params.targetHandle || 'input';
          let sourceOutputName = params.sourceHandle || 'output';
          
          // Normalize source output name based on source node type
          const sourceNode = scenario.nodes.find(n => n.nodeId === params.source);
          if (sourceNode?.type === 'ProcessNode' && sourceOutputName.startsWith('output-')) {
            sourceOutputName = sourceOutputName.replace('output-', '');
          }

          // Initialize inputs array if it doesn't exist
          const currentInputs = node.inputs || [];
          
          // Check if this node type supports multiple inputs
          // Single-input nodes: Sink, Queue, StateMultiplexer (all have single "input" handle)
          // FSMProcessNode has single "event" handle
          // Multi-input nodes: ProcessNode (has dynamic "input" handle that creates new inputs)
          const singleInputNodeTypes = ['Sink', 'Queue', 'StateMultiplexer', 'FSMProcessNode'];
          const isSingleInputNode = singleInputNodeTypes.includes(node.type);
          const isMultiInputNode = node.type === 'ProcessNode';
          
          console.log(`🔗 [INPUT HANDLING] Target: ${node.type}, handle: ${inputName}, existingInputs: ${currentInputs.length}`, {
            isSingleInputNode,
            isMultiInputNode,
            currentInputNames: currentInputs.map(i => i.name)
          });
          
          // For multi-input nodes (ProcessNode), generate unique input names when connecting to default "input" handle
          if (isMultiInputNode && inputName === 'input' && currentInputs.length > 0) {
            // Find next available input name: input_1, input_2, etc.
            let counter = 1;
            while (currentInputs.some(inp => inp.name === `input_${counter}`)) {
              counter++;
            }
            inputName = `input_${counter}`;
            console.log(`🆕 [MULTI-INPUT] Generated new input name: ${inputName} for ProcessNode`);
          }
          
          // For single-input nodes, the input name stays the same (they only support ONE connection)
          // We'll replace the existing input below if one exists
          if (isSingleInputNode) {
            console.log(`🔄 [SINGLE-INPUT] ${node.type} supports only one input connection via handle "${inputName}"`);
          }
          
          // Check if this EXACT input connection already exists (same source and input name)
          const existingInputIndex = currentInputs.findIndex(input => 
            input.name === inputName && input.nodeId === params.source
          );
          
          if (existingInputIndex !== -1) {
            // Input already exists with same source - just update it (shouldn't change but for safety)
            console.log(`✏️ Updating existing input ${inputName} on ${node.nodeId} from ${params.source}`);
            const updatedInputs = currentInputs.map((input, idx) => {
              if (idx === existingInputIndex) {
                return {
                  ...input,
                  nodeId: params.source,
                  sourceOutputName: sourceOutputName
                };
              }
              return input;
            });
            return { ...node, inputs: updatedInputs };
          }
          
          // Check if there's an input with same name but different source
          const inputWithSameNameIndex = currentInputs.findIndex(input => input.name === inputName);
          
          if (inputWithSameNameIndex !== -1) {
            // An input with this name exists but from a different source
            // This could mean:
            // 1. User is trying to replace the connection (if old connection still exists)
            // 2. User deleted the old connection and wants to reuse the handle
            
            const existingInput = currentInputs[inputWithSameNameIndex];
            
            // Check if the existing input's source still has a connection to it
            const oldSourceNode = scenario.nodes.find(n => n.nodeId === existingInput.nodeId);
            const oldSourceStillConnected = oldSourceNode?.outputs?.some(out => 
              out.destinationNodeId === node.nodeId && 
              out.destinationInputName === inputName
            );
            
            if (oldSourceStillConnected) {
              // Old connection exists, user wants to replace it
              console.log(`🔄 Replacing input ${inputName} on ${node.nodeId} from ${existingInput.nodeId} to ${params.source}`);
            } else {
              // Old connection was deleted, reusing the handle
              console.log(`♻️ Reusing input ${inputName} on ${node.nodeId} for new connection from ${params.source}`);
            }
            
            const updatedInputs = [...currentInputs];
            updatedInputs[inputWithSameNameIndex] = {
              name: inputName,
              nodeId: params.source,
              sourceOutputName: sourceOutputName,
              interface: { type: 'Any', requiredFields: [] },
              required: false
            };
            return { ...node, inputs: updatedInputs };
          }
          
          // No existing input with this name - add new one
          console.log(`➕ Adding new input ${inputName} on ${node.nodeId} from ${params.source}`);
          return {
            ...node,
            inputs: [...currentInputs, {
              name: inputName,
              nodeId: params.source,
              sourceOutputName: sourceOutputName,
              interface: { type: 'Any', requiredFields: [] },
              required: false
            }]
          };
        }

        return node;
      });

      const updatedScenario = { ...scenario, nodes: updatedNodes };
      
      // Log the updated nodes for debugging
      const sourceNodeAfter = updatedNodes.find(n => n.nodeId === params.source);
      const targetNodeAfter = updatedNodes.find(n => n.nodeId === params.target);
      console.log('🔗 [CONNECT] After update - Source outputs:', sourceNodeAfter?.outputs);
      console.log('🔗 [CONNECT] After update - Target inputs:', targetNodeAfter?.inputs);
      
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
          const hasDestination = output.destinationNodeId && output.destinationNodeId.trim() !== "";
          const isVisible = hasDestination && visibleNodeIds.has(output.destinationNodeId);
          
          console.log(`🔍 [EDGE CHECK] Checking output from ${node.nodeId} (${node.type}):`, {
            outputName: output.name,
            destinationNodeId: output.destinationNodeId,
            destinationInputName: output.destinationInputName,
            hasDestination,
            isVisible
          });
          
          // CRITICAL FIX: Must check destinationNodeId exists AND is not empty string
          if (hasDestination && isVisible) {
            // Different nodes have different handle ID patterns
            // IMPORTANT: Handle IDs must match what's defined in the node display components
            let sourceHandle: string | undefined;
            if (node.type === "ProcessNode") {
              // ProcessNode uses "output-{name}" pattern
              sourceHandle = `output-${output.name}`;
            } else if (node.type === "FSMProcessNode") {
              // FSMProcessNode uses the output name directly (e.g., "state_output")
              sourceHandle = output.name;
            } else if (node.type === "StateMultiplexer") {
              // StateMultiplexer uses output names directly
              sourceHandle = output.name;
            } else if (node.type === "DataSource") {
              // DataSource uses "output" as the handle ID
              sourceHandle = 'output';
            } else {
              // Default: use output name
              sourceHandle = output.name;
            }

            // Get target handle - look up the input definition
            const targetNode = scenario.nodes.find(n => n.nodeId === output.destinationNodeId);
            let targetHandle: string | undefined;
            if (targetNode && targetNode.inputs && targetNode.inputs.length > 0) {
              // Find matching input by checking nodeId and sourceOutputName
              const targetInput = targetNode.inputs.find(input =>
                input.nodeId === node.nodeId && input.sourceOutputName === output.name
              );
              if (targetInput) {
                targetHandle = targetInput.name;
                console.log(`✅ [EDGE CREATE] Found target input: ${targetHandle} for edge ${node.nodeId} → ${output.destinationNodeId}`);
              } else {
                // Fallback: use destinationInputName from output
                targetHandle = output.destinationInputName || 'input';
                console.log(`⚠️ [EDGE CREATE] No matching input found (inputs: ${targetNode.inputs.map(i => `${i.name}[from:${i.nodeId},out:${i.sourceOutputName}]`).join(', ')}), using destinationInputName: ${targetHandle}`);
              }
            } else {
              // No inputs defined, use destinationInputName or default
              targetHandle = output.destinationInputName || 'input';
              console.log(`⚠️ [EDGE CREATE] Target node has no inputs, using default: ${targetHandle}`);
            }

            const edgeId = `e-${node.nodeId}-${output.name}-${output.destinationNodeId}`;
            console.log(`➕ [EDGE CREATE] Creating edge: ${edgeId}`, {
              sourceHandle,
              targetHandle,
              sourceType: node.type,
              targetType: targetNode?.type,
              output
            });

            initialEdges.push({
              id: edgeId,
              source: node.nodeId,
              sourceHandle,
              target: output.destinationNodeId,
              targetHandle,
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
        const stateMachineInfo = hasStateMachine(nodeState) ? nodeState.stateMachine : undefined;
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
            stateMachine: stateMachineInfo
              ? {
                  currentState: stateMachineInfo.currentState,
                  stateDisplayName: getStateDisplayName(stateMachineInfo.currentState),
                  transitionCount: stateMachineInfo.transitionHistory?.length || 0,
                }
              : undefined,
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
      console.log(`🎯 [NODE CLICK] Clicking node: ${node.id}, current time: ${currentTime}`);
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
