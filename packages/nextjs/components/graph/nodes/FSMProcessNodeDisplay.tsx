"use client";

import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Settings, Activity, Variable, Trash2 } from "lucide-react";
import type { RFNodeData } from "@/lib/simulation/types";

interface FSMProcessNodeDisplayProps {
  data: RFNodeData;
  selected?: boolean;
  id: string;
}

const FSMProcessNodeDisplay: React.FC<FSMProcessNodeDisplayProps> = ({ data, selected, id }) => {
  const config = data.config;
  const fsmState = data.config.type === "FSMProcessNode" ? (data as any).nodeState : null;
  const { deleteElements } = useReactFlow();

  // Get FSM definition first
  const fsmDefinition = config.fsm;

  // Get current FSM state and variables
  const currentFSMState = fsmState?.currentFSMState || fsmDefinition?.initialState || 'idle';
  const fsmVariables = fsmState?.fsmVariables || {};
  const inputBuffers = fsmState?.inputBuffers || {};

  // Count total tokens in input buffers
  const totalInputTokens = Object.values(inputBuffers).reduce((sum: number, buffer: any[]) => sum + buffer.length, 0);

  const totalStates = fsmDefinition?.states?.length || 0;
  const totalTransitions = fsmDefinition?.transitions?.length || 0;

  // Get state color based on current state
  const getStateColor = (stateName: string) => {
    if (stateName === fsmDefinition?.initialState) return 'text-green-700 bg-green-50 border-green-200';
    return 'text-orange-700 bg-orange-50 border-orange-200';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="relative group">
      {/* Delete Button - matches other nodes exactly */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-gray-400 hover:bg-gray-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center shadow-sm"
        title="Delete node"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>

      <div
        className={cn(
          "bg-white border-2 rounded-lg shadow-sm min-w-[200px] transition-all duration-200",
          data.isActive
            ? "border-orange-500 shadow-lg shadow-orange-100"
            : "border-orange-200 hover:border-orange-300",
          selected && "ring-2 ring-blue-500 ring-offset-2",
          data.error && "border-red-400 bg-red-50"
        )}
      >

      {/* Header */}
      <div className="px-3 py-2 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 bg-orange-600 text-white rounded">
            <Settings className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-orange-900 truncate">
              {data.label}
            </div>
            <div className="text-xs text-orange-600">
              FSM Processor
            </div>
          </div>
          {data.isActive && (
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Current FSM State */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">State:</span>
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs font-mono", getStateColor(currentFSMState))}
          >
            {currentFSMState}
          </Badge>
        </div>
      </div>

      {/* FSM Variables (if any) */}
      {Object.keys(fsmVariables).length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Variable className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">Variables:</span>
          </div>
          <div className="space-y-1">
            {Object.entries(fsmVariables).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-slate-500 font-mono">{key}:</span>
                <span className="text-slate-700 font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
            {Object.keys(fsmVariables).length > 3 && (
              <div className="text-xs text-slate-400">
                +{Object.keys(fsmVariables).length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Info */}
      <div className="px-3 py-2 bg-slate-50">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">States:</span>
            <span className="font-mono text-slate-700">{totalStates}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Transitions:</span>
            <span className="font-mono text-slate-700">{totalTransitions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Inputs:</span>
            <span className="font-mono text-slate-700">{config.inputs?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tokens:</span>
            <span className="font-mono text-slate-700">{totalInputTokens}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {data.error && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200">
          <div className="text-xs text-red-700">{data.error}</div>
        </div>
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-500 !border-orange-600 !w-3 !h-3 !border-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-orange-500 !border-orange-600 !w-3 !h-3 !border-2"
      />
      </div>
    </div>
  );
};

export default FSMProcessNodeDisplay;