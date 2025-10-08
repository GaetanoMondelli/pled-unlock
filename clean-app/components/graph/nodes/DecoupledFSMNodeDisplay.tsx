"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Activity, Variable, Trash2, ChevronDown, ChevronUp, Edit3, Zap, Clock } from "lucide-react";
import type { RFNodeData } from "@/lib/simulation/types";
import FSMConfigModal from "./FSMConfigModal";
import { NodeFSMAdapter } from "@/lib/fsm/NodeFSMAdapter";

interface DecoupledFSMNodeDisplayProps {
  data: RFNodeData;
  selected?: boolean;
  id: string;
}

const DecoupledFSMNodeDisplay: React.FC<DecoupledFSMNodeDisplayProps> = ({ data, selected, id }) => {
  const config = data.config;
  const { deleteElements } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Create FSM adapter instance
  const fsmAdapter = useMemo(() => {
    if (config.type === "FSMProcessNode") {
      return new NodeFSMAdapter(id, config);
    }
    return null;
  }, [id, config]);

  // State from the decoupled FSM
  const [fsmState, setFsmState] = useState(() => fsmAdapter?.getState());
  const [fsmStats, setFsmStats] = useState(() => fsmAdapter?.getStats());

  // Update FSM state periodically or on events
  useEffect(() => {
    if (!fsmAdapter) return;

    const updateState = () => {
      setFsmState(fsmAdapter.getState());
      setFsmStats(fsmAdapter.getStats());
    };

    // Update immediately
    updateState();

    // Set up interval for live updates (in real scenario, this would be event-driven)
    const interval = setInterval(updateState, 1000);

    return () => clearInterval(interval);
  }, [fsmAdapter]);

  // Handle token input simulation
  const handleSimulateTokenInput = async () => {
    if (!fsmAdapter) return;

    try {
      const result = await fsmAdapter.processTokenInput({
        value: Math.random() * 100,
        timestamp: new Date().toISOString()
      }, 'default');

      console.log('Token processed:', result);

      // Update state immediately
      setFsmState(fsmAdapter.getState());
      setFsmStats(fsmAdapter.getStats());
    } catch (error) {
      console.error('Error processing token:', error);
    }
  };

  // Handle custom event
  const handleCustomEvent = async (eventType: string) => {
    if (!fsmAdapter) return;

    try {
      const result = await fsmAdapter.processCustomEvent(eventType, {
        triggeredBy: 'user',
        timestamp: new Date().toISOString()
      });

      console.log('Custom event processed:', result);

      // Update state immediately
      setFsmState(fsmAdapter.getState());
      setFsmStats(fsmAdapter.getStats());
    } catch (error) {
      console.error('Error processing custom event:', error);
    }
  };

  const currentState = fsmState?.currentState || 'unknown';
  const possibleTransitions = fsmState?.possibleTransitions || [];
  const variables = fsmState?.variables || {};
  const eventHistory = fsmState?.eventHistory || [];

  // Get FSM definition info
  const totalStates = config.fsm?.states?.length || 0;
  const stateNames = config.fsm?.states ?
    config.fsm.states.map((state: any) => typeof state === 'string' ? state : state.name) : [];
  const totalTransitions = config.fsm?.transitions?.length || 0;

  // Get state color based on current state
  const getStateColor = (stateName: string) => {
    if (stateName === config.fsm?.initialState) return 'text-green-700 bg-green-50 border-green-200';
    if (stateName === currentState) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  if (!fsmAdapter) {
    return <div className="text-red-500">Invalid FSM Node</div>;
  }

  return (
    <div className="relative group">
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-gray-400 hover:bg-gray-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center shadow-sm"
        title="Delete node"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>

      <div
        className={cn(
          "bg-white border-2 rounded-lg shadow-sm min-w-[240px] transition-all duration-200",
          data.isActive
            ? "border-blue-500 shadow-lg shadow-blue-100"
            : "border-blue-200 hover:border-blue-300",
          selected && "ring-2 ring-blue-500 ring-offset-2",
          data.error && "border-red-400 bg-red-50"
        )}
      >

      {/* Header */}
      <div className="px-3 py-2 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded">
            <Zap className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-blue-900 truncate">
              {data.label}
            </div>
            <div className="text-xs text-blue-600">
              FSM
            </div>
          </div>
          <div className="flex items-center gap-1">
            {data.isActive && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsConfigModalOpen(true);
              }}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded transition-colors"
              title="Configure FSM"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Current State & Architecture Flow */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3 w-3 text-slate-500" />
          <span className="text-xs text-slate-600 font-medium">
            Current State
          </span>
        </div>

        <Badge
          variant="outline"
          className={cn("text-xs font-mono mb-2", getStateColor(currentState))}
        >
          ● {currentState}
        </Badge>

        {/* Architecture Flow */}
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex items-center justify-between">
            <span>Events:</span>
            <Badge variant="secondary" className="text-xs">{fsmStats?.eventsProcessed || 0}</Badge>
          </div>
          <div className="flex items-center text-xs text-slate-400">
            Queue → Processor → FSM → Actions
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-3 w-3 text-slate-500" />
          <span className="text-xs text-slate-600 font-medium">Quick Actions</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSimulateTokenInput}
            className="h-6 px-2 text-xs"
          >
            <Clock className="h-2 w-2 mr-1" />
            Token
          </Button>
          {possibleTransitions.slice(0, 2).map(transition => (
            <Button
              key={transition}
              size="sm"
              variant="outline"
              onClick={() => handleCustomEvent(transition.toUpperCase() + '_EVENT')}
              className="h-6 px-2 text-xs"
            >
              {transition}
            </Button>
          ))}
        </div>
      </div>

      {/* FSM States (when expanded) */}
      {isExpanded && (
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              All States ({totalStates})
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {stateNames.map((state: string) => (
              <Badge
                key={state}
                variant="outline"
                className={cn(
                  "text-xs font-mono px-2 py-1 transition-all cursor-pointer",
                  state === currentState
                    ? "bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-400"
                    : state === config.fsm?.initialState
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
                onClick={() => fsmAdapter.setState(state)}
                title={`Click to force state change to ${state}`}
              >
                {state === currentState && "● "}
                {state}
                {state === config.fsm?.initialState && " (initial)"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Variables (when expanded) */}
      {isExpanded && Object.keys(variables).length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Variable className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">Variables:</span>
          </div>
          <div className="space-y-1">
            {Object.entries(variables).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-slate-500 font-mono">{key}:</span>
                <span className="text-slate-700 font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
            {Object.keys(variables).length > 3 && (
              <div className="text-xs text-slate-400">
                +{Object.keys(variables).length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event History (when expanded) */}
      {isExpanded && eventHistory.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              Recent Events ({eventHistory.length})
            </span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {eventHistory.slice(-3).map((event) => (
              <div key={event.id} className="text-xs bg-slate-50 p-1 rounded">
                <div className="font-mono text-slate-700">{event.type}</div>
                <div className="text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
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
            <span className="text-slate-500">Queue:</span>
            <span className="font-mono text-slate-700">{fsmStats?.queueSize || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Processed:</span>
            <span className="font-mono text-slate-700">{fsmStats?.eventsProcessed || 0}</span>
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
        className="!bg-blue-500 !border-blue-600 !w-3 !h-3 !border-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !border-blue-600 !w-3 !h-3 !border-2"
      />
      </div>

      {/* FSM Configuration Modal */}
      <FSMConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        nodeId={id}
        currentConfig={config}
      />
    </div>
  );
};

export default DecoupledFSMNodeDisplay;