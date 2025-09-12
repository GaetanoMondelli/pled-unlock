"use client";

import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Code } from "lucide-react";
import type { AnyNode, NodeStateMachineState, StateMachineInfo } from "@/lib/simulation/types";

interface StateNodeData {
  label: string;
  isActive: boolean;
  stateType: "initial" | "intermediate" | "final" | "error";
}

interface NodeStateMachineDiagramProps {
  nodeConfig: AnyNode;
  stateMachineInfo?: StateMachineInfo;
  width?: number;
  height?: number;
}

// Node component for state machine states
const StateNode: React.FC<{ data: StateNodeData; selected?: boolean }> = ({ data, selected }) => {
  const getStateColor = () => {
    if (data.isActive) return "border-slate-600 bg-slate-100 text-slate-800";
    if (data.stateType === "initial") return "border-teal-500 bg-teal-50 text-teal-800";
    if (data.stateType === "final") return "border-indigo-500 bg-indigo-50 text-indigo-800";
    if (data.stateType === "error") return "border-red-500 bg-red-50 text-red-800";
    return "border-slate-300 bg-slate-50 text-slate-600";
  };

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
        getStateColor(),
        selected && "ring-2 ring-primary ring-offset-1"
      )}
    >
      {data.label}
      {data.isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
      )}
    </div>
  );
};

const nodeTypes = {
  stateNode: StateNode,
};

export const NodeStateMachineDiagram: React.FC<NodeStateMachineDiagramProps> = ({
  nodeConfig,
  stateMachineInfo,
  width = 400,
  height = 300,
}) => {
  const [showFSL, setShowFSL] = useState(false);

  const { nodes, edges, fsl } = useMemo(() => {
    const currentState = stateMachineInfo?.currentState;
    
    // Define state machine structure for each node type
    const getStateMachineStructure = (nodeType: string) => {
      switch (nodeType) {
        case "DataSource":
          return {
            states: [
              { id: "source_idle", label: "idle", type: "initial" as const, position: { x: 50, y: 50 } },
              { id: "source_generating", label: "generating", type: "intermediate" as const, position: { x: 200, y: 50 } },
              { id: "source_emitting", label: "emitting", type: "intermediate" as const, position: { x: 350, y: 50 } },
              { id: "source_waiting", label: "waiting", type: "intermediate" as const, position: { x: 200, y: 150 } },
            ],
            transitions: [
              { from: "source_idle", to: "source_generating", label: "timer_tick" },
              { from: "source_generating", to: "source_emitting", label: "value_created" },
              { from: "source_emitting", to: "source_waiting", label: "token_sent" },
              { from: "source_waiting", to: "source_idle", label: "interval_elapsed" },
            ],
            fsl: `source_idle 'timer_tick' -> source_generating;
source_generating 'value_created' -> source_emitting;
source_emitting 'token_sent' -> source_waiting;
source_waiting 'interval_elapsed' -> source_idle;`
          };

        case "Queue":
          return {
            states: [
              { id: "queue_idle", label: "idle", type: "initial" as const, position: { x: 50, y: 50 } },
              { id: "queue_accumulating", label: "accumulating", type: "intermediate" as const, position: { x: 200, y: 50 } },
              { id: "queue_processing", label: "processing", type: "intermediate" as const, position: { x: 350, y: 50 } },
              { id: "queue_emitting", label: "emitting", type: "intermediate" as const, position: { x: 200, y: 150 } },
            ],
            transitions: [
              { from: "queue_idle", to: "queue_accumulating", label: "token_received" },
              { from: "queue_accumulating", to: "queue_accumulating", label: "token_received" },
              { from: "queue_accumulating", to: "queue_processing", label: "threshold_reached" },
              { from: "queue_processing", to: "queue_emitting", label: "aggregation_complete" },
              { from: "queue_emitting", to: "queue_idle", label: "token_sent" },
            ],
            fsl: `queue_idle 'token_received' -> queue_accumulating;
queue_accumulating 'token_received' -> queue_accumulating;
queue_accumulating 'threshold_reached' -> queue_processing;
queue_processing 'aggregation_complete' -> queue_emitting;
queue_emitting 'token_sent' -> queue_idle;`
          };

        case "ProcessNode":
          return {
            states: [
              { id: "process_idle", label: "idle", type: "initial" as const, position: { x: 50, y: 50 } },
              { id: "process_collecting", label: "collecting", type: "intermediate" as const, position: { x: 250, y: 50 } },
              { id: "process_calculating", label: "calculating", type: "intermediate" as const, position: { x: 450, y: 50 } },
              { id: "process_emitting", label: "emitting", type: "intermediate" as const, position: { x: 250, y: 150 } },
            ],
            transitions: [
              { from: "process_idle", to: "process_collecting", label: "token_received" },
              { from: "process_collecting", to: "process_collecting", label: "more_tokens" },
              { from: "process_collecting", to: "process_calculating", label: "all_inputs_ready" },
              { from: "process_calculating", to: "process_emitting", label: "formulas_computed" },
              { from: "process_emitting", to: "process_idle", label: "all_outputs_sent" },
            ],
            fsl: `process_idle 'token_received' -> process_collecting;
process_collecting 'more_tokens' -> process_collecting;
process_collecting 'all_inputs_ready' -> process_calculating;
process_calculating 'formulas_computed' -> process_emitting;
process_emitting 'all_outputs_sent' -> process_idle;`
          };

        case "Sink":
          return {
            states: [
              { id: "sink_idle", label: "idle", type: "initial" as const, position: { x: 100, y: 50 } },
              { id: "sink_processing", label: "processing", type: "intermediate" as const, position: { x: 250, y: 50 } },
            ],
            transitions: [
              { from: "sink_idle", to: "sink_processing", label: "token_received" },
              { from: "sink_processing", to: "sink_idle", label: "logging_complete" },
            ],
            fsl: `sink_idle 'token_received' -> sink_processing;
sink_processing 'logging_complete' -> sink_idle;`
          };

        default:
          return { states: [], transitions: [], fsl: "" };
      }
    };

    const structure = getStateMachineStructure(nodeConfig.type);
    
    // Create React Flow nodes for each state
    const rfNodes: Node<StateNodeData>[] = structure.states.map((state) => ({
      id: state.id,
      type: "stateNode",
      position: state.position,
      data: {
        label: state.label,
        isActive: currentState === state.id,
        stateType: state.type,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    // Create React Flow edges for each transition with proper arrows
    const rfEdges: Edge[] = structure.transitions.map((transition, index) => ({
      id: `edge-${index}`,
      source: transition.from,
      target: transition.to,
      label: transition.label,
      type: "smoothstep",
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
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
      labelStyle: { fontSize: 11, fontWeight: 500, fill: "#475569" },
    }));

    return { nodes: rfNodes, edges: rfEdges, fsl: structure.fsl };
  }, [nodeConfig.type, stateMachineInfo?.currentState]);

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
          {stateMachineInfo && (
            <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
              Current: {stateMachineInfo.currentState.split('_').slice(1).join(' ')}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs text-slate-600 hover:text-slate-800"
            onClick={() => setShowFSL(!showFSL)}
          >
            <Code className="h-3 w-3 mr-1" />
            FSL
          </Button>
        </div>
      </div>
      
      {showFSL && (
        <div className="p-2 bg-muted/30 border-b">
          <pre className="text-xs font-mono text-muted-foreground">
            {fsl}
          </pre>
        </div>
      )}

      <div style={{ width: "100%", height: height - (showFSL ? 120 : 40) }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 20 }}
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
            type: 'smoothstep',
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