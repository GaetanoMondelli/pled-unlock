"use client";

import React, { useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Settings,
  Activity,
  Variable,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit3,
  MessageCircle,
  Zap,
  Brain,
  Shield,
  AlertTriangle,
  GitBranch,
  Target,
} from "lucide-react";
import type { RFNodeData } from "@/lib/simulation/types";
import { EnhancedFSMProcessNodeState } from "@/lib/simulation/enhanced-fsm-schema";
import EnhancedFSMConfigurationModal from "./EnhancedFSMConfigurationModal";

interface EnhancedFSMNodeDisplayProps {
  data: RFNodeData;
  selected?: boolean;
  id: string;
}

const EnhancedFSMNodeDisplay: React.FC<EnhancedFSMNodeDisplayProps> = ({ data, selected, id }) => {
  const config = data.config;
  const nodeState = data.nodeState as EnhancedFSMProcessNodeState;
  const { deleteElements } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Get configuration details
  const fsmConfig = config.type === "EnhancedFSMProcessNode" ? config.fsm : null;
  const eventInputs = config.type === "EnhancedFSMProcessNode" ? config.eventInputs || [] : [];
  const messageInputs = config.type === "EnhancedFSMProcessNode" ? config.messageInputs || [] : [];
  const interpretationRules = fsmConfig?.interpretationRules || [];
  const feedbackConfig = fsmConfig?.feedbackConfig;

  // Get current state information
  const currentState = nodeState?.currentState || fsmConfig?.initialState || 'idle';
  const variables = nodeState?.variables || {};
  const stateVariables = nodeState?.stateVariables || {};
  const eventBufferSize = nodeState?.eventBuffer?.length || 0;
  const messageBufferSize = nodeState?.messageBuffer?.length || 0;
  const feedbackDepth = nodeState?.feedbackDepth || 0;
  const circuitBreakerOpen = nodeState?.circuitBreakerState?.isOpen || false;

  // Calculate status indicators
  const totalStates = fsmConfig?.states?.length || 0;
  const totalTransitions = fsmConfig?.transitions?.length || 0;
  const activeRules = interpretationRules.filter(rule => rule.enabled).length;
  const totalInputs = eventInputs.length + messageInputs.length;

  // Get state color based on current state and status
  const getStateColor = (stateName: string) => {
    if (circuitBreakerOpen) return 'text-red-700 bg-red-50 border-red-200';
    if (feedbackDepth > 0) return 'text-orange-700 bg-orange-50 border-orange-200';
    if (stateName === fsmConfig?.initialState) return 'text-green-700 bg-green-50 border-green-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

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
          "bg-white border-2 rounded-lg shadow-sm min-w-[220px] transition-all duration-200",
          data.isActive
            ? "border-purple-500 shadow-lg shadow-purple-100"
            : "border-purple-200 hover:border-purple-300",
          selected && "ring-2 ring-blue-500 ring-offset-2",
          data.error && "border-red-400 bg-red-50",
          circuitBreakerOpen && "border-red-500 bg-red-50"
        )}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 bg-purple-600 text-white rounded">
              <Brain className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-purple-900 truncate">
                {data.label}
              </div>
              <div className="text-xs text-purple-600">
                Enhanced FSM
              </div>
            </div>
            <div className="flex items-center gap-1">
              {data.isActive && (
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0" />
              )}
              {circuitBreakerOpen && (
                <Shield className="h-3 w-3 text-red-500" title="Circuit breaker open" />
              )}
              {feedbackDepth > 0 && (
                <GitBranch className="h-3 w-3 text-orange-500" title={`Feedback depth: ${feedbackDepth}`} />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfigModalOpen(true);
                }}
                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-200 rounded transition-colors"
                title="Configure Enhanced FSM"
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-200 rounded transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Input Streams Summary */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              Input Streams ({totalInputs})
            </span>
            {!isExpanded && (
              <span className="text-xs text-slate-400">
                - {eventBufferSize + messageBufferSize} buffered
              </span>
            )}
          </div>

          {isExpanded ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Events:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-700">{eventInputs.length} inputs</span>
                  {eventBufferSize > 0 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {eventBufferSize}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Messages:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-700">{messageInputs.length} inputs</span>
                  {messageBufferSize > 0 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {messageBufferSize}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs">
                {eventInputs.length} Events
              </Badge>
              <Badge variant="outline" className="text-xs">
                {messageInputs.length} Messages
              </Badge>
            </div>
          )}
        </div>

        {/* Current State */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              Current State
            </span>
            {!isExpanded && feedbackDepth > 0 && (
              <Badge variant="outline" className="text-xs text-orange-600">
                Depth {feedbackDepth}
              </Badge>
            )}
          </div>

          <Badge
            variant="outline"
            className={cn("text-xs font-mono", getStateColor(currentState))}
          >
            ● {currentState}
            {currentState === fsmConfig?.initialState && " (initial)"}
          </Badge>

          {isExpanded && (
            <div className="mt-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>States:</span>
                <span className="font-mono">{totalStates}</span>
              </div>
              <div className="flex justify-between">
                <span>Transitions:</span>
                <span className="font-mono">{totalTransitions}</span>
              </div>
              {feedbackDepth > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Feedback Depth:</span>
                  <span className="font-mono">{feedbackDepth}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interpretation Rules */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              Interpretation Rules
            </span>
            {!isExpanded && (
              <span className="text-xs text-slate-400">
                - {activeRules}/{interpretationRules.length} active
              </span>
            )}
          </div>

          {isExpanded ? (
            <div className="space-y-1">
              {interpretationRules.map((rule, index) => (
                <div key={rule.id} className="flex items-center justify-between text-xs">
                  <span className={cn(
                    "truncate",
                    rule.enabled ? "text-slate-700" : "text-slate-400"
                  )}>
                    {rule.name}
                  </span>
                  <Badge
                    variant={rule.enabled ? "default" : "secondary"}
                    className="text-xs px-1 py-0"
                  >
                    {rule.method.type}
                  </Badge>
                </div>
              ))}
              {interpretationRules.length === 0 && (
                <span className="text-xs text-slate-400 italic">No rules configured</span>
              )}
            </div>
          ) : (
            <div className="flex gap-1">
              <Badge variant={activeRules > 0 ? "default" : "secondary"} className="text-xs">
                {activeRules} Active
              </Badge>
              {interpretationRules.length !== activeRules && (
                <Badge variant="outline" className="text-xs">
                  {interpretationRules.length - activeRules} Disabled
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Variables (if any) */}
        {(Object.keys(variables).length > 0 || Object.keys(stateVariables).length > 0) && (
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Variable className="h-3 w-3 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">Variables:</span>
            </div>
            <div className="space-y-1">
              {Object.entries(variables).slice(0, isExpanded ? 10 : 3).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-500 font-mono">{key}:</span>
                  <span className="text-slate-700 font-mono truncate max-w-20">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
              {Object.entries(stateVariables).slice(0, isExpanded ? 10 : 2).map(([key, value]) => (
                <div key={`state.${key}`} className="flex justify-between text-xs">
                  <span className="text-slate-500 font-mono">state.{key}:</span>
                  <span className="text-slate-700 font-mono truncate max-w-20">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
              {!isExpanded && (Object.keys(variables).length + Object.keys(stateVariables).length > 5) && (
                <div className="text-xs text-slate-400">
                  +{Object.keys(variables).length + Object.keys(stateVariables).length - 5} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback & Circuit Breaker Status */}
        {(feedbackConfig?.enabled || circuitBreakerOpen) && (
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3 w-3 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">Status</span>
            </div>
            <div className="space-y-1">
              {feedbackConfig?.enabled && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Feedback:</span>
                  <Badge variant={feedbackDepth > 0 ? "default" : "outline"} className="text-xs">
                    {feedbackDepth > 0 ? `Depth ${feedbackDepth}` : "Ready"}
                  </Badge>
                </div>
              )}
              {feedbackConfig?.circuitBreaker?.enabled && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Circuit Breaker:</span>
                  <Badge
                    variant={circuitBreakerOpen ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {circuitBreakerOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="px-3 py-2 bg-slate-50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Inputs:</span>
              <span className="font-mono text-slate-700">{totalInputs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rules:</span>
              <span className="font-mono text-slate-700">{activeRules}/{interpretationRules.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Buffered:</span>
              <span className="font-mono text-slate-700">{eventBufferSize + messageBufferSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">States:</span>
              <span className="font-mono text-slate-700">{totalStates}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {data.error && (
          <div className="px-3 py-2 bg-red-50 border-t border-red-200">
            <div className="text-xs text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.error}
            </div>
          </div>
        )}

        {/* Connection Handles */}
        {/* Left side - Events input */}
        <Handle
          type="target"
          position={Position.Left}
          id="events"
          className="!bg-blue-500 !border-blue-600 !w-3 !h-3 !border-2 !top-[30%]"
          title="Events Input"
        />
        {/* Left side - Messages input */}
        <Handle
          type="target"
          position={Position.Left}
          id="messages"
          className="!bg-green-500 !border-green-600 !w-3 !h-3 !border-2 !top-[70%]"
          title="Messages Input"
        />
        {/* Right side - Output */}
        <Handle
          type="source"
          position={Position.Right}
          id="state_output"
          className="!bg-purple-500 !border-purple-600 !w-3 !h-3 !border-2"
          title="State Output"
        />
      </div>

      {/* Configuration Modal */}
      <EnhancedFSMConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        nodeId={id}
        currentConfig={config}
      />
    </div>
  );
};

export default EnhancedFSMNodeDisplay;