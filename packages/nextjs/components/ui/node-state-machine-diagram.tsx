"use client";

import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import LabeledSmoothStepEdge from "@/components/ui/edges/LabeledSmoothStepEdge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Code } from "lucide-react";
import type { AnyNode, NodeStateMachineState, StateMachineInfo } from "@/lib/simulation/types";
// FSLGenerator removed - using simulation store state machine directly

interface StateNodeData {
  label: string;
  isActive: boolean;
  isSelected: boolean;
  stateType: "initial" | "intermediate" | "final" | "error";
  variables?: {
    buffer_size?: number;
    output_buffer_size?: number;
    time_anchor?: number;
    // ProcessNode specific variables
    inputs_ready?: string[];  // List of input names that have tokens
    inputs_missing?: string[]; // List of input names that need tokens
    outputs_generated?: string[]; // List of output names that have been computed
    current_formula?: string; // Current formula being evaluated
    input_values?: Record<string, any>; // Current input values for formula
  };
}

interface NodeStateMachineDiagramProps {
  nodeConfig: AnyNode;
  stateMachineInfo?: StateMachineInfo;
  width?: number;
  height?: number;
  overrideActiveState?: NodeStateMachineState;
  showVariables?: boolean;
  activityLogs?: any[];
  selectedLogEntry?: any;
}

// Node component for state machine states WITH VARIABLES
const StateNode: React.FC<{ data: StateNodeData; selected?: boolean }> = ({ data, selected }) => {
  const getStateColor = () => {
    if (data.isSelected) return "border-blue-600 bg-blue-100 text-blue-800";
    if (data.isActive) return "border-green-600 bg-green-100 text-green-800";
    if (data.stateType === "initial") return "border-teal-500 bg-teal-50 text-teal-800";
    if (data.stateType === "final") return "border-indigo-500 bg-indigo-50 text-indigo-800";
    if (data.stateType === "error") return "border-red-500 bg-red-50 text-red-800";
    return "border-slate-300 bg-slate-50 text-slate-600";
  };

  return (
    <div className="relative">
      {/* Target (incoming) */}
      <Handle type="target" position={Position.Left} className="!bg-slate-400 w-2.5 h-2.5" />
      <div
        className={cn(
          "px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all min-w-[120px]",
          getStateColor(),
          selected && "ring-2 ring-primary ring-offset-1"
        )}
      >
        <div className="font-bold">{data.label}</div>
        {data.variables && data.isActive && (
          <div className="mt-1 text-xs opacity-75 space-y-0.5">
            {/* Standard buffer info for Queue/DataSource nodes */}
            {(data.variables.buffer_size !== undefined || data.variables.output_buffer_size !== undefined) && (
              <>
                <div>buf: {data.variables.buffer_size || 0}</div>
                <div>out: {data.variables.output_buffer_size || 0}</div>
                {data.variables.time_anchor && <div>t: {data.variables.time_anchor}s</div>}
              </>
            )}

            {/* ProcessNode specific info */}
            {data.variables.inputs_ready && (
              <div className="text-green-700">✓ {data.variables.inputs_ready.join(', ')}</div>
            )}
            {data.variables.inputs_missing && data.variables.inputs_missing.length > 0 && (
              <div className="text-red-700">✗ {data.variables.inputs_missing.join(', ')}</div>
            )}
            {data.variables.outputs_generated && data.variables.outputs_generated.length > 0 && (
              <div className="text-blue-700">→ {data.variables.outputs_generated.join(', ')}</div>
            )}
            {data.variables.current_formula && (
              <div className="text-purple-700 font-mono text-[10px]">{data.variables.current_formula}</div>
            )}
          </div>
        )}
        {data.isActive && !data.isSelected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
        {data.isSelected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
        )}
      </div>
      {/* Source (outgoing) */}
      <Handle type="source" position={Position.Right} className="!bg-slate-400 w-2.5 h-2.5" />
    </div>
  );
};

const nodeTypes = {
  stateNode: StateNode,
};

const edgeTypes = {
  labeledSmooth: LabeledSmoothStepEdge,
};

export const NodeStateMachineDiagram: React.FC<NodeStateMachineDiagramProps> = ({
  nodeConfig,
  stateMachineInfo,
  width = 400,
  height = 300,
  overrideActiveState,
  showVariables = false,
  activityLogs = [],
  selectedLogEntry,
}) => {
  // showFSL removed - no FSLGenerator
  const [showVars, setShowVars] = useState(showVariables);

  const { nodes, edges, runtimeVariables } = useMemo(() => {
    // Priority: selectedLogEntry.state > overrideActiveState > stateMachineInfo.currentState
    const currentState = selectedLogEntry?.state || overrideActiveState || stateMachineInfo?.currentState;

    // Get runtime variables from activity logs if available
    let variables = null;
    if (activityLogs.length > 0) {
      let targetLog = null;

      // If we have a specific selected log entry, use that
      if (selectedLogEntry) {
        targetLog = selectedLogEntry;
      }
      // Otherwise, if we have an overrideActiveState, find the log entry for that state
      else if (overrideActiveState) {
        targetLog = activityLogs.find(log => log.state === overrideActiveState);
      }
      // Fall back to latest log if no override or no matching log found
      if (!targetLog) {
        targetLog = activityLogs[activityLogs.length - 1];
      }

      variables = {
        currentState: targetLog.state || 'unknown',
        buffer_size: targetLog.bufferSize || 0,
        output_buffer_size: targetLog.outputBufferSize || 0,
        time_anchor: targetLog.timestamp
      };
    }

    // Define canonical states based on node type
    const getStatesForNodeType = (nodeType: string) => {
      switch (nodeType) {
        case 'DataSource':
          return ['source_idle', 'source_generating', 'source_emitting', 'source_waiting'];
        case 'Queue':
          return ['queue_idle', 'queue_accumulating', 'queue_processing', 'queue_emitting'];
        case 'ProcessNode':
          return ['process_idle', 'process_collecting', 'process_ready', 'process_evaluating', 'process_outputting'];
        case 'FSMProcessNode':
          // For FSM nodes, get states from the FSM definition
          const fsmNode = nodeConfig as any;
          return fsmNode.fsm?.states || ['idle'];
        case 'Sink':
          return ['sink_idle', 'sink_processing'];
        default:
          return ['idle'];
      }
    };

    const states = getStatesForNodeType(nodeConfig.type).map((state, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      return {
        id: state,
        label: state,
        type: index === 0 ? "initial" as const : "intermediate" as const,
        position: {
          x: 80 + (col * 220),
          y: 40 + (row * 80)
        }
      };
    });

    // Define basic transitions based on node type
    const getTransitionsForNodeType = (nodeType: string) => {
      switch (nodeType) {
        case 'DataSource':
          return [
            { from: 'source_idle', to: 'source_generating', label: 'timer_tick' },
            { from: 'source_generating', to: 'source_emitting', label: 'data_generated' },
            { from: 'source_emitting', to: 'source_waiting', label: 'token_emitted' },
            { from: 'source_waiting', to: 'source_idle', label: 'ready' }
          ];
        case 'Queue':
          return [
            { from: 'queue_idle', to: 'queue_accumulating', label: 'token_received' },
            { from: 'queue_accumulating', to: 'queue_processing', label: 'trigger_met' },
            { from: 'queue_processing', to: 'queue_emitting', label: 'aggregated' },
            { from: 'queue_emitting', to: 'queue_idle', label: 'token_forwarded' }
          ];
        case 'ProcessNode':
          return [
            { from: 'process_idle', to: 'process_collecting', label: 'token_received' },
            { from: 'process_collecting', to: 'process_ready', label: 'all_inputs_available' },
            { from: 'process_ready', to: 'process_evaluating', label: 'formula_evaluation' },
            { from: 'process_evaluating', to: 'process_outputting', label: 'outputs_generated' },
            { from: 'process_outputting', to: 'process_idle', label: 'outputs_sent' }
          ];
        case 'FSMProcessNode':
          // For FSM nodes, get transitions from the FSM definition
          const fsmNode = nodeConfig as any;
          return fsmNode.fsm?.transitions?.map((t: any) => ({
            from: t.from,
            to: t.to,
            label: t.trigger + (t.condition ? ` (${t.condition})` : '')
          })) || [];
        case 'Sink':
          return [
            { from: 'sink_idle', to: 'sink_processing', label: 'token_received' },
            { from: 'sink_processing', to: 'sink_idle', label: 'token_consumed' }
          ];
        default:
          return [];
      }
    };

    const transitions = getTransitionsForNodeType(nodeConfig.type);

    // Create React Flow nodes for each state with variables
    const rfNodes: Node<StateNodeData>[] = states.map((state) => ({
      id: state.id,
      type: "stateNode",
      position: state.position,
      data: {
        label: state.label,
        isActive: currentState === state.id,
        isSelected: overrideActiveState === state.id,
        stateType: state.type,
        variables: variables && currentState === state.id ? {
          buffer_size: variables.buffer_size,
          output_buffer_size: variables.output_buffer_size,
          time_anchor: variables.time_anchor
        } : undefined,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    // Create React Flow edges for each transition with proper arrows
    const rfEdges: Edge[] = transitions.map((transition, index) => ({
      id: `edge-${index}`,
      source: transition.from,
      target: transition.to,
      label: transition.label,
      type: "labeledSmooth",
      animated: currentState === transition.from,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: currentState === transition.from ? "#475569" : "#94a3b8",
      },
      style: {
        stroke: currentState === transition.from ? "#475569" : "#94a3b8",
        strokeWidth: currentState === transition.from ? 2 : 1.5
      },
      data: { active: currentState === transition.from },
    }));

    return { nodes: rfNodes, edges: rfEdges, runtimeVariables: variables };
  }, [nodeConfig.type, stateMachineInfo?.currentState, overrideActiveState, activityLogs, selectedLogEntry]);

  return (
    <div style={{ width, height }} className="border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between p-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">{nodeConfig.displayName} State Machine</h3>
          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
            {nodeConfig.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {(stateMachineInfo || overrideActiveState) && (
            <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
              {overrideActiveState ? 'Selected: ' : 'Current: '}
              {(overrideActiveState || stateMachineInfo?.currentState)?.split('_').slice(1).join(' ')}
            </Badge>
          )}
          <div className="flex items-center gap-1">
            {runtimeVariables && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-slate-600 hover:text-slate-800"
                onClick={() => setShowVars(!showVars)}
              >
                🔢 Variables
              </Button>
            )}
            {/* FSL button removed - no FSLGenerator */}
          </div>
        </div>
      </div>
      
      {showVars && runtimeVariables && (
        <div className="p-2 bg-blue-50 border-b">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs">
              <span className="font-medium text-blue-800">State:</span>
              <span className="font-mono ml-1 text-blue-700">{runtimeVariables.currentState}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-green-800">Buffer:</span>
              <span className="font-mono ml-1 text-green-700">{runtimeVariables.buffer_size}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-yellow-800">Output:</span>
              <span className="font-mono ml-1 text-yellow-700">{runtimeVariables.output_buffer_size}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-purple-800">Time Anchor:</span>
              <span className="font-mono ml-1 text-purple-700">{runtimeVariables.time_anchor || 'none'}</span>
            </div>
          </div>
        </div>
      )}

      {/* FSL display removed - no FSLGenerator */}

      <div style={{ width: "100%", height: height - ((showVars ? 60 : 0) + 40) }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.4, minZoom: 0.5, maxZoom: 1.5 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          className="bg-transparent"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'labeledSmooth',
            animated: false,
          }}
        >
          <Background color="#f1f5f9" gap={20} size={0.5} />
          <Controls showZoom={true} showFitView={true} showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default NodeStateMachineDiagram;