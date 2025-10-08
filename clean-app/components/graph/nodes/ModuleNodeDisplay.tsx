"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleNode, RFNodeData } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";
import {
  Box,
  Circle,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Layers
} from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position, useReactFlow } from "reactflow";
import { Button } from "@/components/ui/button";

// Helper function to get state machine display info
const getStateMachineDisplay = (currentState?: string) => {
  if (!currentState) return null;

  const stateInfo: Record<string, { color: string; displayName: string }> = {
    module_idle: { color: "text-gray-500", displayName: "idle" },
    module_processing: { color: "text-blue-500", displayName: "processing" },
    module_emitting: { color: "text-green-500", displayName: "emitting" },
    module_waiting: { color: "text-yellow-500", displayName: "waiting" },
  };

  return stateInfo[currentState] || { color: "text-gray-400", displayName: "unknown" };
};

const ModuleNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected, id }) => {
  const config = data.config as ModuleNode;
  const stateMachineInfo = getStateMachineDisplay(data.stateMachine?.currentState);
  const { deleteElements } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(config.isExpanded || false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    // TODO: Update the scenario to persist expand/collapse state
  };

  const subGraphNodeCount = config.subGraph?.nodes?.length || 0;
  const inputCount = config.inputs?.length || 0;
  const outputCount = config.outputs?.length || 0;

  return (
    <div className="relative group">
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-gray-400 hover:bg-gray-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center shadow-sm"
        title="Delete module"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>

      <Card
        className={cn(
          "w-44 shadow-md transition-all duration-300 relative",
          selected && "ring-2 ring-primary",
          data.isActive && "animate-pulse border-purple-400 shadow-purple-400/50 shadow-lg scale-105",
          data.error && "border-destructive shadow-destructive/50",
          isExpanded && "border-purple-300 bg-purple-50/30"
        )}
      >
        <CardHeader
          className={cn(
            "p-2 rounded-t-lg transition-colors duration-300 bg-purple-600 text-white relative",
          )}
        >
          <CardTitle className="text-xs font-semibold flex items-center text-white">
            {isExpanded ? <FolderOpen className="h-3 w-3 mr-1" /> : <Folder className="h-3 w-3 mr-1" />}
            {data.label}

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="ml-auto p-0 h-4 w-4 text-white hover:bg-white/20 rounded"
              title={isExpanded ? "Collapse module" : "Expand module"}
            >
              {isExpanded ?
                <ChevronDown className="h-3 w-3" /> :
                <ChevronRight className="h-3 w-3" />
              }
            </Button>

            {/* State Machine Indicator */}
            {stateMachineInfo && (
              <div
                className="ml-1"
                title={`State: ${stateMachineInfo.displayName}`}
              >
                <Circle className="h-2 w-2 fill-current text-white/80" />
              </div>
            )}
            {data.isActive && <div className="ml-1 w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-2 text-[10px] space-y-0.5">
          {/* Module Info Section */}
          <div className="space-y-0.5">
            <p className="font-medium text-muted-foreground">MODULE:</p>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Layers className="h-2.5 w-2.5 mr-1" />
                <span>{subGraphNodeCount} nodes</span>
              </div>
            </div>
            <p>Inputs: {inputCount} | Outputs: {outputCount}</p>
            {config.moduleDescription && (
              <p className="text-muted-foreground leading-tight truncate">
                {config.moduleDescription}
              </p>
            )}
            {config.isLibraryModule && (
              <div className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-[8px]">
                Library v{config.moduleVersion}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-muted-foreground/20 my-1"></div>

          {/* Runtime Section */}
          <div className="space-y-0.5">
            <p className="font-medium text-muted-foreground">RUNTIME:</p>
            {stateMachineInfo && (
              <p className="font-mono" style={{ color: stateMachineInfo.color.replace('text-', '') }}>
                {stateMachineInfo.displayName}
              </p>
            )}
            {data.details && <p className="text-muted-foreground leading-tight">{data.details}</p>}
          </div>

          {data.error && <p className="mt-1 text-destructive text-xs">{data.error}</p>}

          {/* Sub-graph preview when expanded */}
          {isExpanded && (
            <div className="mt-2 pt-2 border-t border-muted-foreground/20">
              <p className="font-medium text-muted-foreground mb-1">SUB-GRAPH:</p>
              <div className="bg-gray-50 rounded p-1 text-[8px] max-h-16 overflow-y-auto">
                {config.subGraph?.nodes?.map((node, idx) => (
                  <div key={idx} className="flex items-center space-x-1 mb-0.5">
                    <Box className="h-2 w-2" />
                    <span className="truncate">{node.displayName}</span>
                  </div>
                )) || <span className="text-muted-foreground">No nodes</span>}
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Handles */}
        {config.inputs?.map((input, index) => (
          <Handle
            key={`input-${input.name}`}
            id={`input-${input.name}`}
            type="target"
            position={Position.Left}
            className="w-3 h-3 !bg-purple-400 hover:!bg-purple-500 transition-all"
            style={{ top: `${30 + index * 15}px` }}
            title={`Input: ${input.name}`}
          />
        ))}

        {/* Output Handles */}
        {config.outputs?.map((output, index) => (
          <Handle
            key={`output-${output.name}`}
            id={`output-${output.name}`}
            type="source"
            position={Position.Right}
            className="w-3 h-3 !bg-purple-400 hover:!bg-purple-500 transition-all"
            style={{ top: `${30 + index * 15}px` }}
            title={`Output: ${output.name}`}
          />
        ))}
      </Card>
    </div>
  );
};

export default React.memo(ModuleNodeDisplay);