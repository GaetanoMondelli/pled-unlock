"use client";

import React, { useState, useMemo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Target, GitBranch, Trash2, ChevronDown, ChevronUp, Edit3, CheckCircle, XCircle, Activity } from "lucide-react";
import type { RFNodeData } from "@/lib/simulation/types";
import { StateMultiplexer, StateContext } from "@/lib/fsm/StateMultiplexer";
import MultiplexerConfigurationModal from "./MultiplexerConfigurationModal";

interface StateMultiplexerDisplayProps {
  data: RFNodeData;
  selected?: boolean;
  id: string;
}

const StateMultiplexerDisplay: React.FC<StateMultiplexerDisplayProps> = ({ data, selected, id }) => {
  const config = data.config;
  const { deleteElements } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Create StateMultiplexer instance
  const multiplexer = useMemo(() => {
    if (config.type === "StateMultiplexer") {
      // Check both config.config.routes (V3 format) and config.routes (legacy)
      const routes = config.config?.routes || config.routes;
      const defaultRoute = config.config?.defaultRoute || config.defaultOutput;
      if (routes) {
        return new StateMultiplexer(id, {
          routes: routes,
          defaultOutput: defaultRoute?.outputId || defaultRoute
        });
      }
    }
    return null;
  }, [id, config]);

  // Mock state context for testing/display
  const [testStateContext] = useState<StateContext>({
    currentState: 'processing',
    previousState: 'idle',
    variables: { counter: 1 },
    context: { value: 42 },
    timestamp: new Date().toISOString()
  });

  // Test routes with current context
  const routeResults = useMemo(() => {
    if (!multiplexer) return { outputs: [], matchedRoutes: [] };
    return multiplexer.processStateContext(testStateContext);
  }, [multiplexer, testStateContext]);

  const routes = config.config?.routes || config.routes || [];
  const outputs = config.outputs || [];
  const totalRoutes = routes.length;
  const activeRoutes = routeResults.matchedRoutes.length;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const handleTestRoute = (routeIndex: number) => {
    if (!multiplexer) return;

    const route = routes[routeIndex];
    const result = multiplexer.testCondition(route.condition, testStateContext);
    console.log(`Route ${routeIndex} test result:`, result);
  };

  if (!multiplexer) {
    return <div className="text-red-500">Invalid StateMultiplexer</div>;
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
          "bg-white border-2 rounded-lg shadow-sm min-w-[220px] transition-all duration-200",
          data.isActive
            ? "border-green-500 shadow-lg shadow-green-100"
            : "border-green-200 hover:border-green-300",
          selected && "ring-2 ring-blue-500 ring-offset-2",
          data.error && "border-red-400 bg-red-50"
        )}
      >

      {/* Header */}
      <div className="px-3 py-2 border-b border-green-100 bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded">
            <GitBranch className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-green-900 truncate">
              {data.label}
            </div>
            <div className="text-xs text-green-600">
              Router (Passive)
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsConfigModalOpen(true);
              }}
              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded transition-colors"
              title="Configure routes"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>



      {/* Routes (when expanded) */}
      {isExpanded && (
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              Routes ({totalRoutes})
            </span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {routes.map((route: any, index: number) => {
              const isMatched = routeResults.matchedRoutes.includes(route);
              return (
                <div key={index} className="p-2 border rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-slate-600">#{index + 1}</span>
                    <div className="flex items-center gap-1">
                      {isMatched ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-slate-400" />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestRoute(index)}
                        className="h-5 px-2 text-xs"
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500">
                      <span className="font-medium">If:</span> {route.condition}
                    </div>
                    <div className="text-slate-500">
                      <span className="font-medium">Then:</span> {route.outputName}
                    </div>
                    <div className="text-slate-500">
                      <span className="font-medium">Action:</span> {route.action.type}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Output Preview (when expanded) */}
      {isExpanded && routeResults.outputs.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">
              Current Outputs ({routeResults.outputs.length})
            </span>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {routeResults.outputs.map((output, index) => (
              <div key={index} className="p-2 bg-green-50 rounded text-xs">
                <div className="font-mono text-green-700 font-medium">{output.outputName}</div>
                <div className="text-green-600">
                  {typeof output.data === 'object'
                    ? JSON.stringify(output.data).substring(0, 50) + '...'
                    : String(output.data).substring(0, 50)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Info */}
      <div className="px-3 py-2 bg-slate-50">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Routes → Outputs:</span>
          <span className="font-mono text-slate-700 font-medium">{totalRoutes} → {outputs.length}</span>
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
        id="input"
        className="!bg-green-500 !border-green-600 !w-3 !h-3 !border-2"
      />

      {/* Multiple output handles */}
      {outputs.map((output: any, index: number) => {
        const handleId = output.name || `output_${index}`;
        return (
          <Handle
            key={handleId}
            type="source"
            position={Position.Right}
            id={handleId}
            style={{ top: `${(index + 1) * (100 / (outputs.length + 1))}%` }}
            className="!bg-green-500 !border-green-600 !w-3 !h-3 !border-2"
            title={`Output: ${output.name || `Output ${index + 1}`}`}
          />
        );
      })}
      </div>

      {/* Multiplexer Configuration Modal */}
      <MultiplexerConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        nodeId={id}
        currentConfig={config}
      />
    </div>
  );
};

export default StateMultiplexerDisplay;