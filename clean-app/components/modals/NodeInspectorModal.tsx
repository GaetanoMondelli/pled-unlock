"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NodeStateMachineDiagram from "@/components/ui/node-state-machine-diagram";
import { useSimulationStore } from "@/stores/simulationStore";
import { useToast } from "@/hooks/use-toast";
// import { MessageInterfaces } from "@/lib/simulation/message-interfaces";
// import { InterfaceCompatibilityValidator } from "@/lib/simulation/enhanced-node-schema";
import { Code, Settings, Activity, ChevronDown, ChevronRight, Save, RefreshCw, MessageSquare, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Info, Eye, EyeOff, Tags, Plus, X } from "lucide-react";
import type { NodeStateMachineState, StateMachineInfo } from "@/lib/simulation/types";
// FSLGenerator removed - using simulation store state machine directly
import { Badge } from "@/components/ui/badge";

// Simple JSON display component
const SimpleJsonView: React.FC<{ value: any }> = ({ value }) => {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap bg-slate-50 p-3 rounded border overflow-auto max-h-64">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

// Helper function to determine message interfaces for a node
const getNodeMessageInterfaces = (nodeConfig: any) => {
  // Check if node has enhanced interface definitions
  if (nodeConfig.inputInterface || nodeConfig.outputInterface || nodeConfig.inputs || nodeConfig.outputs) {
    return {
      inputs: getNodeInputInterfaces(nodeConfig),
      outputs: getNodeOutputInterfaces(nodeConfig)
    };
  }

  // Fallback to defaults for legacy nodes
  const defaults = {
    DataSource: {
      inputs: [],
      outputs: ["SimpleValue"]
    },
    Queue: {
      inputs: ["SimpleValue"],
      outputs: ["AggregationResult"]
    },
    ProcessNode: {
      inputs: ["SimpleValue", "AggregationResult"],
      outputs: ["TransformationResult"]
    },
    Sink: {
      inputs: ["SimpleValue", "AggregationResult", "TransformationResult", "ValidationResult"],
      outputs: []
    }
  };

  return defaults[nodeConfig.type as keyof typeof defaults] || { inputs: [], outputs: [] };
};

// Extract input interfaces from enhanced node config
const getNodeInputInterfaces = (nodeConfig: any): string[] => {
  const interfaces: string[] = [];

  // Single input interface
  if (nodeConfig.inputInterface?.type) {
    interfaces.push(nodeConfig.inputInterface.type);
  }

  // Multiple inputs (ProcessNode style)
  if (nodeConfig.inputs && Array.isArray(nodeConfig.inputs)) {
    nodeConfig.inputs.forEach((input: any) => {
      if (input.interface?.type) {
        interfaces.push(input.interface.type);
      }
    });
  }

  return [...new Set(interfaces)];
};

// Extract output interfaces from enhanced node config
const getNodeOutputInterfaces = (nodeConfig: any): string[] => {
  const interfaces: string[] = [];

  // Single output interface
  if (nodeConfig.outputInterface?.type) {
    interfaces.push(nodeConfig.outputInterface.type);
  }

  // Multiple outputs (ProcessNode style)
  if (nodeConfig.outputs && Array.isArray(nodeConfig.outputs)) {
    nodeConfig.outputs.forEach((output: any) => {
      if (output.interface?.type) {
        interfaces.push(output.interface.type);
      }
    });
  }

  // Routes (Splitter style)
  if (nodeConfig.routes && Array.isArray(nodeConfig.routes)) {
    nodeConfig.routes.forEach((route: any) => {
      if (route.outputInterface?.type) {
        interfaces.push(route.outputInterface.type);
      }
    });
  }

  // Default route (Splitter style)
  if (nodeConfig.defaultRoute?.outputInterface?.type) {
    interfaces.push(nodeConfig.defaultRoute.outputInterface.type);
  }

  return [...new Set(interfaces)];
};

// Detailed interface contract display component
const InterfaceContractView: React.FC<{
  contract: any;
  direction: 'input' | 'output';
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ contract, direction, isExpanded, onToggle }) => {
  if (!contract) return null;

  const bgColor = direction === 'input' ? 'bg-green-50' : 'bg-blue-50';
  const borderColor = direction === 'input' ? 'border-green-200' : 'border-blue-200';
  const textColor = direction === 'input' ? 'text-green-700' : 'text-blue-700';
  const badgeColor = direction === 'input' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className={`border rounded-lg p-3 ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${badgeColor} border-0`}>
            {contract.type}
          </Badge>
          {contract.description && (
            <span className="text-xs text-slate-600 truncate max-w-48" title={contract.description}>
              {contract.description}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`p-1 rounded hover:bg-white/50 ${textColor}`}
        >
          {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {contract.requiredFields && contract.requiredFields.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-700 mb-1">Required Fields:</div>
              <div className="flex flex-wrap gap-1">
                {contract.requiredFields.map((field: string, index: number) => (
                  <code key={index} className="text-xs bg-white/60 px-1.5 py-0.5 rounded border">
                    {field}
                  </code>
                ))}
              </div>
            </div>
          )}

          {contract.validation && (
            <div>
              <div className="text-xs font-medium text-slate-700 mb-1">Validation:</div>
              <code className="text-xs bg-white/60 px-2 py-1 rounded border block">
                {contract.validation}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced message interface display component
const MessageInterfaceSection: React.FC<{ nodeConfig: any }> = ({ nodeConfig }) => {
  const interfaces = getNodeMessageInterfaces(nodeConfig);
  const [expandedContracts, setExpandedContracts] = useState(new Set<string>());
  const [showDetailed, setShowDetailed] = useState(false);

  const toggleContract = (contractId: string) => {
    const newExpanded = new Set(expandedContracts);
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId);
    } else {
      newExpanded.add(contractId);
    }
    setExpandedContracts(newExpanded);
  };

  const hasEnhancedInterfaces = nodeConfig && ((nodeConfig as any).inputInterface || (nodeConfig as any).outputInterface ||
    (nodeConfig as any).inputs || (nodeConfig as any).outputs || (nodeConfig as any).routes);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-700 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Message Interfaces
          {hasEnhancedInterfaces && (
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Enhanced
            </Badge>
          )}
        </h4>
        {hasEnhancedInterfaces && (
          <button
            onClick={() => setShowDetailed(!showDetailed)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            {showDetailed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showDetailed ? 'Simple' : 'Detailed'}
          </button>
        )}
      </div>

      {showDetailed && hasEnhancedInterfaces ? (
        <div className="space-y-3">
          {/* Enhanced Input Interface Details */}
          {nodeConfig.inputInterface && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Input Interface</span>
              </div>
              <InterfaceContractView
                contract={nodeConfig.inputInterface}
                direction="input"
                isExpanded={expandedContracts.has('input')}
                onToggle={() => toggleContract('input')}
              />
            </div>
          )}

          {/* Multiple Inputs (ProcessNode) */}
          {nodeConfig.inputs && Array.isArray(nodeConfig.inputs) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Input Interfaces ({nodeConfig.inputs.length})</span>
              </div>
              <div className="space-y-2">
                {nodeConfig.inputs.map((input: any, index: number) => (
                  <div key={index} className="ml-3">
                    <div className="text-xs text-slate-600 mb-1">
                      <code className="font-mono">{input.alias || input.nodeId}</code>
                      {input.required === false && <span className="text-slate-400 ml-1">(optional)</span>}
                    </div>
                    <InterfaceContractView
                      contract={input.interface}
                      direction="input"
                      isExpanded={expandedContracts.has(`input-${index}`)}
                      onToggle={() => toggleContract(`input-${index}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Output Interface Details */}
          {nodeConfig.outputInterface && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-3 w-3 text-slate-500 rotate-180" />
                <span className="text-xs font-medium text-slate-600">Output Interface</span>
              </div>
              <InterfaceContractView
                contract={nodeConfig.outputInterface}
                direction="output"
                isExpanded={expandedContracts.has('output')}
                onToggle={() => toggleContract('output')}
              />
            </div>
          )}

          {/* Multiple Outputs (ProcessNode) */}
          {nodeConfig.outputs && Array.isArray(nodeConfig.outputs) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-3 w-3 text-slate-500 rotate-180" />
                <span className="text-xs font-medium text-slate-600">Output Interfaces ({nodeConfig.outputs.length})</span>
              </div>
              <div className="space-y-2">
                {nodeConfig.outputs.map((output: any, index: number) => (
                  <div key={index} className="ml-3">
                    <div className="text-xs text-slate-600 mb-1">
                      <span className="font-mono">→ {output.destinationNodeId}</span>
                      {output.name && <span className="text-slate-400 ml-1">({output.name})</span>}
                    </div>
                    <InterfaceContractView
                      contract={output.interface}
                      direction="output"
                      isExpanded={expandedContracts.has(`output-${index}`)}
                      onToggle={() => toggleContract(`output-${index}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Routes (Splitter) */}
          {nodeConfig.routes && Array.isArray(nodeConfig.routes) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-3 w-3 text-slate-500 rotate-180" />
                <span className="text-xs font-medium text-slate-600">Route Interfaces ({nodeConfig.routes.length})</span>
              </div>
              <div className="space-y-2">
                {nodeConfig.routes.map((route: any, index: number) => (
                  <div key={index} className="ml-3">
                    <div className="text-xs text-slate-600 mb-1">
                      <span className="font-mono">→ {route.destinationNodeId}</span>
                      <span className="text-slate-400 ml-1">(priority: {route.priority || 'default'})</span>
                    </div>
                    {route.condition && (
                      <div className="text-xs text-slate-500 mb-1">
                        <code className="bg-yellow-50 px-1 py-0.5 rounded text-yellow-700">{route.condition}</code>
                      </div>
                    )}
                    <InterfaceContractView
                      contract={route.outputInterface}
                      direction="output"
                      isExpanded={expandedContracts.has(`route-${index}`)}
                      onToggle={() => toggleContract(`route-${index}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Simple Interface Display */
        <div className="space-y-3">
          {/* Input Interfaces */}
          {interfaces.inputs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Accepts</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-5">
              </div>
            </div>
          )}

          {/* Output Interfaces */}
          {interfaces.outputs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-3 w-3 text-slate-500 rotate-180" />
                <span className="text-xs font-medium text-slate-600">Produces</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-5">
                {/* {interfaces.outputs.map((interfaceName: string) => {
                  const messageInterface = MessageInterfaces[interfaceName];
                  return (
                    <div
                      key={interfaceName}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium cursor-help"
                      title={messageInterface?.description || `${interfaceName} message type`}
                    >
                      {interfaceName}
                    </div>
                  );
                })} */}
              </div>
            </div>
          )}

          {interfaces.inputs.length === 0 && interfaces.outputs.length === 0 && (
            <div className="text-xs text-slate-500 italic">
              No message interfaces defined for this node type
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Message Interfaces Section - shows interface types used by the node
const MessageInterfacesSection: React.FC<{ nodeConfig: any }> = ({ nodeConfig }) => {
  const interfaces = useMemo(() => {
    const inputInterfaces: string[] = [];
    const outputInterfaces: string[] = [];

    // Collect input interfaces
    if (nodeConfig.inputInterface?.type) {
      inputInterfaces.push(nodeConfig.inputInterface.type);
    }
    if (nodeConfig.inputs && Array.isArray(nodeConfig.inputs)) {
      nodeConfig.inputs.forEach((input: any) => {
        if (input.interface?.type) {
          inputInterfaces.push(input.interface.type);
        }
      });
    }

    // Collect output interfaces
    if (nodeConfig.outputInterface?.type) {
      outputInterfaces.push(nodeConfig.outputInterface.type);
    }
    if (nodeConfig.outputs && Array.isArray(nodeConfig.outputs)) {
      nodeConfig.outputs.forEach((output: any) => {
        if (output.interface?.type) {
          outputInterfaces.push(output.interface.type);
        }
      });
    }

    return {
      inputs: [...new Set(inputInterfaces)],
      outputs: [...new Set(outputInterfaces)]
    };
  }, [nodeConfig]);

  if (interfaces.inputs.length === 0 && interfaces.outputs.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Message Interfaces</h3>
        <div className="text-xs text-slate-500 italic">
          No message interfaces defined for this node type
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Message Interfaces</h3>

      {interfaces.inputs.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600">Consumes</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {interfaces.inputs.map((interfaceType: string) => (
              <div
                key={interfaceType}
                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                title={`Input interface: ${interfaceType}`}
              >
                {interfaceType}
              </div>
            ))}
          </div>
        </div>
      )}

      {interfaces.outputs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600">Produces</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {interfaces.outputs.map((interfaceType: string) => (
              <div
                key={interfaceType}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                title={`Output interface: ${interfaceType}`}
              >
                {interfaceType}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Interface validation display component
const InterfaceValidationSection: React.FC<{ nodeConfig: any }> = ({ nodeConfig }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (scenario && nodeConfig) {
      try {
        // Skip validation for now since InterfaceCompatibilityValidator is not available
        setValidationResult(null);
      } catch (error) {
        console.warn('Interface validation error:', error);
        setValidationResult(null);
      }
    }
  }, [nodeConfig, scenario]);

  if (!validationResult) {
    return null;
  }

  const hasErrors = validationResult.errors && validationResult.errors.length > 0;
  const hasWarnings = validationResult.warnings && validationResult.warnings.length > 0;

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-slate-700 flex items-center gap-2">
        {validationResult.valid ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        )}
        Interface Validation
        <Badge
          variant="outline"
          className={`text-xs ${
            validationResult.valid
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {validationResult.valid ? 'Valid' : 'Invalid'}
        </Badge>
      </h4>

      {hasErrors && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-red-700 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Errors ({validationResult.errors.length})
          </div>
          {validationResult.errors.map((error: string, index: number) => (
            <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          ))}
        </div>
      )}

      {hasWarnings && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-orange-700 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Warnings ({validationResult.warnings.length})
          </div>
          {validationResult.warnings.map((warning: string, index: number) => (
            <div key={index} className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100">
              {warning}
            </div>
          ))}
        </div>
      )}

      {!hasErrors && !hasWarnings && (
        <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-2">
          <CheckCircle className="h-3 w-3" />
          All interface contracts are valid
        </div>
      )}
    </div>
  );
};

// Helper components for enhanced Overview tab
const ConfigSection: React.FC<{
  nodeConfig: any;
  showJson: boolean;
  onToggleJson: () => void;
  editedConfigText: string;
  onConfigTextChange: (text: string) => void;
  onSaveConfig: () => void;
  hasUnsavedChanges: boolean;
  onResetConfig: () => void;
  scenario: any;
  saveSnapshot: (description: string) => void;
  loadScenario: (scenario: any) => void;
  toast: any;
  updateNodeConfigInStore: (nodeId: string, newConfigData: any) => boolean;
}> = ({ nodeConfig, showJson, onToggleJson, editedConfigText, onConfigTextChange, onSaveConfig, hasUnsavedChanges, onResetConfig, scenario, saveSnapshot, loadScenario, toast, updateNodeConfigInStore }) => {
  const [expandedFormulas, setExpandedFormulas] = useState(new Set<number>());

  // Clean config (remove position and other UI stuff)
  const cleanConfig = useMemo(() => {
    const config = { ...nodeConfig };
    delete config.position;
    return config;
  }, [nodeConfig]);

  const toggleFormula = (index: number) => {
    const newExpanded = new Set(expandedFormulas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFormulas(newExpanded);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configuration
          {hasUnsavedChanges && showJson && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              Unsaved
            </span>
          )}
        </h3>
        <div className="flex gap-1">
          {showJson && hasUnsavedChanges && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                onClick={onResetConfig}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={onSaveConfig}
              >
                <Save className="h-3 w-3 mr-1" />
                Apply
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onToggleJson}
          >
            <Code className="h-3 w-3 mr-1" />
            {showJson ? 'Hide' : 'Edit JSON'}
          </Button>
        </div>
      </div>
      
      {showJson ? (
        <Textarea
          value={editedConfigText}
          onChange={(e) => onConfigTextChange(e.target.value)}
          className="font-mono text-xs h-64 resize-none bg-slate-50 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
          placeholder="Edit node configuration JSON..."
        />
      ) : (
        <div className="bg-slate-50 p-3 rounded-md space-y-2 text-sm min-h-[calc(15rem_+_2.5rem)]">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <div><span className="font-medium text-slate-600">ID:</span> <span className="font-mono text-slate-800">{nodeConfig.nodeId}</span></div>
              <div><span className="font-medium text-slate-600">Name:</span> {nodeConfig.displayName}</div>
              <div><span className="font-medium text-slate-600">Type:</span> {nodeConfig.type}</div>
            </div>

            {/* Node-specific Configuration */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-700 mb-2">Configuration</h4>
              <div className="space-y-2">
                {nodeConfig.type === 'DataSource' && (
                  <>
                    <div><span className="font-medium text-slate-600">Interval:</span> {nodeConfig.interval}s</div>
                    <div><span className="font-medium text-slate-600">Generation Type:</span> {nodeConfig.generation.type}</div>
                    <div><span className="font-medium text-slate-600">Value Range:</span> {nodeConfig.generation.valueMin} - {nodeConfig.generation.valueMax}</div>
                  </>
                )}

                {nodeConfig.type === 'Queue' && (
                  <>
                    <div><span className="font-medium text-slate-600">Aggregation Method:</span> {nodeConfig.aggregation.method}</div>
                    <div><span className="font-medium text-slate-600">Time Window:</span> {nodeConfig.aggregation.trigger.window}s</div>
                    <div><span className="font-medium text-slate-600">Trigger Type:</span> {nodeConfig.aggregation.trigger.type}</div>
                    {nodeConfig.capacity && <div><span className="font-medium text-slate-600">Capacity:</span> {nodeConfig.capacity}</div>}
                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs">
                      <span className="font-medium">Formula:</span> <span className="font-mono">{nodeConfig.aggregation.formula}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inputs Section - Editable */}
            {(nodeConfig.type === 'ProcessNode' || nodeConfig.type === 'Queue' || nodeConfig.type === 'Sink' || nodeConfig.type === 'FSMProcessNode') && (
              <InputsOutputsEditor
                nodeConfig={nodeConfig}
                section="inputs"
                onUpdate={(updatedInputs) => {
                  if (scenario) {
                    saveSnapshot('Update node inputs');
                    const success = updateNodeConfigInStore(nodeConfig.nodeId, { ...nodeConfig, inputs: updatedInputs });
                    if (!success) {
                      toast({ variant: "destructive", title: "Update Failed", description: "Failed to update node inputs." });
                      return;
                    }
                    toast({ title: "Inputs Updated", description: "Node inputs have been updated successfully." });
                  }
                }}
              />
            )}

            {/* Outputs Section - Editable */}
            {(nodeConfig.type === 'DataSource' || nodeConfig.type === 'ProcessNode' || nodeConfig.type === 'Queue' || nodeConfig.type === 'FSMProcessNode') && (
              <InputsOutputsEditor
                nodeConfig={nodeConfig}
                section="outputs"
                onUpdate={(updatedOutputs) => {
                  if (scenario) {
                    saveSnapshot('Update node outputs');
                    const success = updateNodeConfigInStore(nodeConfig.nodeId, { ...nodeConfig, outputs: updatedOutputs });
                    if (!success) {
                      toast({ variant: "destructive", title: "Update Failed", description: "Failed to update node outputs." });
                      return;
                    }
                    toast({ title: "Outputs Updated", description: "Node outputs have been updated successfully." });
                  }
                }}
              />
            )}

            {/* Group Node: Display aggregated inputs/outputs */}
            {nodeConfig.type === 'Group' && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2">Contained Nodes</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    {nodeConfig.containedNodes?.map((nodeId: string) => (
                      <div key={nodeId} className="p-2 bg-slate-50 rounded">• {nodeId}</div>
                    )) || <div className="text-slate-400 italic">No nodes in group</div>}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-700 mb-2">Inputs ({nodeConfig.inputs?.length || 0})</h4>
                  <div className="space-y-2">
                    {nodeConfig.inputs?.map((input: any, index: number) => (
                      <div key={index} className="border border-slate-200 rounded p-2 bg-slate-50">
                        <div className="font-medium text-sm text-slate-700">{input.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Interface: {input.interface?.type || 'N/A'}
                        </div>
                      </div>
                    )) || <div className="text-xs text-slate-400 italic">No inputs</div>}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-700 mb-2">Outputs ({nodeConfig.outputs?.length || 0})</h4>
                  <div className="space-y-2">
                    {nodeConfig.outputs?.map((output: any, index: number) => (
                      <div key={index} className="border border-slate-200 rounded p-2 bg-slate-50">
                        <div className="font-medium text-sm text-slate-700">{output.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          → {output.destinationNodeId || 'No destination'}
                        </div>
                        <div className="text-xs text-slate-600">
                          Interface: {output.interface?.type || 'N/A'}
                        </div>
                      </div>
                    )) || <div className="text-xs text-slate-400 italic">No outputs</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StateSection: React.FC<{ 
  nodeState: any; 
  showJson: boolean; 
  onToggleJson: () => void; 
}> = ({ nodeState, showJson, onToggleJson }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Runtime State
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onToggleJson}
        >
          <Code className="h-3 w-3 mr-1" />
          {showJson ? 'Hide' : 'JSON'}
        </Button>
      </div>
      
      {showJson ? (
        <SimpleJsonView value={nodeState} />
      ) : (
        <div className="bg-slate-50 p-3 rounded-md space-y-2 text-sm min-h-[calc(15rem_+_2.5rem)]">
          {nodeState?.stateMachine && (
            <>
              <div><span className="font-medium text-slate-600">Current State:</span> <span className="font-mono text-slate-800">{nodeState.stateMachine.currentState}</span></div>
              <div><span className="font-medium text-slate-600">Transitions:</span> {nodeState.stateMachine.transitionHistory?.length || 0}</div>
              {nodeState.stateMachine.stateChangedAt && (
                <div><span className="font-medium text-slate-600">Changed At:</span> {nodeState.stateMachine.stateChangedAt}s</div>
              )}
              <hr className="border-slate-200 my-2" />
            </>
          )}
          {nodeState?.lastProcessedTime !== undefined && (
            <div><span className="font-medium text-slate-600">Last Processed:</span> {nodeState.lastProcessedTime}s</div>
          )}
          {nodeState?.consumedTokenCount !== undefined && (
            <div><span className="font-medium text-slate-600">Tokens Consumed:</span> {nodeState.consumedTokenCount}</div>
          )}
          {nodeState?.inputBuffer && (
            <div><span className="font-medium text-slate-600">Input Buffer:</span> {nodeState.inputBuffer.length} tokens</div>
          )}
          {nodeState?.outputBuffer && (
            <div><span className="font-medium text-slate-600">Output Buffer:</span> {nodeState.outputBuffer.length} tokens</div>
          )}
        </div>
      )}
    </div>
  );
};

const NodeActivityLog: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const logs = nodeActivityLogs[nodeId] || [];

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground p-3 border rounded-md">No activity logged yet for this node.</p>;
  }

  return (
    <div className="border rounded-md">
      <div className="bg-muted/50 px-3 py-2 text-xs font-medium border-b">
        <div className="flex gap-4">
          <div className="w-16 flex-shrink-0">Time</div>
          <div className="w-40 flex-shrink-0">Action</div>
          <div className="w-16 flex-shrink-0">Value</div>
          <div className="flex-1 min-w-0">Details</div>
        </div>
      </div>
      <ScrollArea className="h-64 w-full">
        <div className="divide-y min-h-0">
          {logs
            .slice(-30)
            .reverse()
            .map((log, index) => (
              <div key={`${log.sequence}-${index}`} className="px-3 py-2 text-xs hover:bg-muted/30">
                <div className="flex gap-4 items-start">
                  <div className="w-16 flex-shrink-0 font-mono text-muted-foreground">{log.timestamp}s</div>
                  <div className="w-40 flex-shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)} block truncate`}
                      title={log.action}
                    >
                      {log.action}
                    </span>
                  </div>
                  <div className="w-16 flex-shrink-0 font-mono text-right">
                    {log.value !== undefined ? String(log.value) : "-"}
                  </div>
                  <div className="flex-1 min-w-0 text-muted-foreground break-words">{log.details || "-"}</div>
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const getActionColor = (action: string): string => {
  // Simplified state-based event colors
  if (action === "accumulating") return "bg-orange-100 text-orange-800";
  if (action === "processing") return "bg-blue-100 text-blue-800";
  if (action === "emitting") return "bg-green-100 text-green-800";
  if (action === "token_received") return "bg-cyan-100 text-cyan-800";
  if (action === "firing") return "bg-purple-100 text-purple-800";
  if (action === "consuming") return "bg-pink-100 text-pink-800";
  if (action === "idle") return "bg-gray-100 text-gray-600";
  if (action === "error") return "bg-red-100 text-red-800";
  if (action === "token_dropped") return "bg-yellow-100 text-yellow-800";
  return "bg-slate-100 text-slate-700";
};

// Actions are now clean canonical events - no mapping needed

// FSM-AUTHORITATIVE activity log with computed states
const NodeActivityLogWithStateTransitions: React.FC<{
  nodeId: string;
  stateMachineInfo?: StateMachineInfo;
  onEventClick?: (event: any, stateAtTime?: NodeStateMachineState) => void;
}> = ({ nodeId, stateMachineInfo, onEventClick }) => {
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const logs = nodeActivityLogs[nodeId] || [];
  const nodeConfig = nodesConfig[nodeId];
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // FSM state comes directly from simulation store - NO external analysis needed

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground p-3 border rounded-md">No activity logged yet for this node.</p>;
  }

  // State comes directly from log entries - simulation store is authoritative
  const getStateAtTime = (timestamp: number): NodeStateMachineState | undefined => {
    const logEntry = logs.find(log => log.timestamp === timestamp);
    return logEntry?.state as NodeStateMachineState;
  };

  const handleEventClick = (log: any) => {
    const eventId = `${log.sequence}-${log.timestamp}`;
    setSelectedEventId(selectedEventId === eventId ? null : eventId);
    const stateAtEventTime = getStateAtTime(log.timestamp);
    onEventClick?.(log, stateAtEventTime);
  };

  return (
    <div className="border rounded-md">
      <div className="bg-muted/50 px-2 py-1 text-xs font-medium border-b">
        <div className="flex gap-2">
          <div className="w-12 flex-shrink-0">Time</div>
          <div className="w-28 flex-shrink-0">Event</div>
          <div className="w-10 flex-shrink-0">Val</div>
          <div className="w-24 flex-shrink-0">State</div>
          <div className="w-16 flex-shrink-0">Buf/Out</div>
          <div className="flex-1 min-w-0">Details</div>
          <div className="w-4 flex-shrink-0"></div>
        </div>
      </div>
      <ScrollArea className="h-64 w-full">
        <div className="divide-y min-h-0">
          {logs
            .slice(-30)
            .reverse()
            .map((log, index) => {
              const eventId = `${log.sequence}-${log.timestamp}`;
              const isSelected = selectedEventId === eventId;
              const stateAtEventTime = getStateAtTime(log.timestamp);

              // State comes directly from simulation store

              return (
                <div
                  key={eventId}
                  className={`px-2 py-1 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => handleEventClick(log)}
                  title="Click to see details and update state machine"
                >
                  {/* Compact main row */}
                  <div className="flex gap-2 items-center">
                    <div className="w-12 flex-shrink-0 font-mono text-muted-foreground text-xs">{log.timestamp}s</div>
                    <div className="w-28 flex-shrink-0">
                      <span
                        className={`px-1 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)} block truncate`}
                        title={log.action}
                      >
                        {log.action}
                      </span>
                    </div>
                    <div className="w-10 flex-shrink-0 font-mono text-right text-xs">
                      {log.value !== undefined ? String(log.value) : "-"}
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <span className="px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 block truncate" title={`State: ${log.state}`}>
                        {log.state?.split('_')[1] || log.state}
                      </span>
                    </div>
                    <div className="w-16 flex-shrink-0 text-xs text-gray-600 font-mono">
                      {log.bufferSize || 0}/{log.outputBufferSize || 0}
                    </div>
                    <div className="flex-1 min-w-0 text-muted-foreground text-xs truncate">
                      {log.details || "-"}
                    </div>
                    <div className="w-4 flex-shrink-0 text-muted-foreground">
                      {isSelected ? "−" : "+"}
                    </div>
                  </div>

                  {/* Expandable details */}
                  {isSelected && (
                    <div className="mt-1 p-2 bg-blue-50 rounded text-xs border-l-2 border-blue-300">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Event:</strong> {log.action}</div>
                        <div><strong>State:</strong> {log.state}</div>
                        <div><strong>Sequence:</strong> {log.sequence}</div>
                        <div><strong>Timestamp:</strong> {log.timestamp}s</div>
                        <div><strong>Buffer Size:</strong> {log.bufferSize || 0}</div>
                        <div><strong>Output Buffer:</strong> {log.outputBufferSize || 0}</div>
                      </div>
                      {log.details && (
                        <div className="mt-2">
                          <strong>Details:</strong> {log.details}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
};

// Inputs/Outputs Editor Component
const InputsOutputsEditor: React.FC<{
  nodeConfig: any;
  section: 'inputs' | 'outputs';
  onUpdate: (updated: any[]) => void;
}> = ({ nodeConfig, section, onUpdate }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    nodeId: '',
    sourceOutputName: '',
    destinationNodeId: '',
    destinationInputName: '',
    interfaceType: 'SimpleValue',
    requiredFields: ['data.value'],
    required: false,
    formula: '',
  });

  const items = nodeConfig[section] || [];
  const availableNodes = scenario?.nodes.filter(n => n.nodeId !== nodeConfig.nodeId) || [];

  const handleAdd = () => {
    if (!formData.name.trim()) {
      return; // Name is required
    }

    const newItem = section === 'inputs'
      ? {
          name: formData.name,
          nodeId: formData.nodeId || '',
          sourceOutputName: formData.sourceOutputName || 'output',
          interface: {
            type: formData.interfaceType,
            requiredFields: formData.requiredFields,
          },
          alias: formData.alias || undefined,
          required: formData.required,
        }
      : {
          name: formData.name,
          destinationNodeId: formData.destinationNodeId || '', // Can be empty
          destinationInputName: formData.destinationInputName || 'input',
          interface: {
            type: formData.interfaceType,
            requiredFields: formData.requiredFields,
          },
          ...(formData.formula && {
            transformation: {
              formula: formData.formula,
              fieldMapping: {},
            }
          }),
        };

    onUpdate([...items, newItem]);
    resetForm();
  };

  const handleEdit = (index: number) => {
    const item = items[index];
    if (section === 'inputs') {
      setFormData({
        ...formData,
        name: item.name,
        alias: item.alias || '',
        nodeId: item.nodeId || '',
        sourceOutputName: item.sourceOutputName || '',
        interfaceType: item.interface?.type || 'SimpleValue',
        requiredFields: item.interface?.requiredFields || ['data.value'],
        required: item.required || false,
      });
    } else {
      setFormData({
        ...formData,
        name: item.name,
        destinationNodeId: item.destinationNodeId || '',
        destinationInputName: item.destinationInputName || '',
        interfaceType: item.interface?.type || 'SimpleValue',
        requiredFields: item.interface?.requiredFields || ['data.value'],
        formula: item.transformation?.formula || '',
      });
    }
    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !formData.name.trim()) return;

    const updated = [...items];
    const editedItem = section === 'inputs'
      ? {
          name: formData.name,
          nodeId: formData.nodeId,
          sourceOutputName: formData.sourceOutputName,
          interface: {
            type: formData.interfaceType,
            requiredFields: formData.requiredFields,
          },
          alias: formData.alias || undefined,
          required: formData.required,
        }
      : {
          name: formData.name,
          destinationNodeId: formData.destinationNodeId || '', // Can be empty
          destinationInputName: formData.destinationInputName || 'input',
          interface: {
            type: formData.interfaceType,
            requiredFields: formData.requiredFields,
          },
          ...(formData.formula && {
            transformation: {
              formula: formData.formula,
              fieldMapping: {},
            }
          }),
        };

    updated[editingIndex] = editedItem;
    onUpdate(updated);
    resetForm();
  };

  const handleDelete = (index: number) => {
    const updated = items.filter((_: any, i: number) => i !== index);
    onUpdate(updated);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      alias: '',
      nodeId: '',
      sourceOutputName: '',
      destinationNodeId: '',
      destinationInputName: '',
      interfaceType: 'SimpleValue',
      requiredFields: ['data.value'],
      required: false,
      formula: '',
    });
    setIsAdding(false);
    setEditingIndex(null);
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-slate-700">
          {section === 'inputs' ? 'Inputs' : 'Outputs'} ({items.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Existing Items */}
      <div className="space-y-2 mb-3">
        {items.map((item: any, index: number) => (
          <div key={index} className="border border-slate-200 rounded p-2 bg-slate-50 group relative">
            <button
              onClick={() => handleDelete(index)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Remove"
            >
              <X className="h-2.5 w-2.5" />
            </button>

            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-slate-700">{item.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs opacity-0 group-hover:opacity-100"
                onClick={() => handleEdit(index)}
              >
                Edit
              </Button>
            </div>

            <div className="text-xs text-slate-600 space-y-0.5">
              {section === 'inputs' ? (
                <>
                  {item.nodeId && <div>Source: {item.nodeId}</div>}
                  {item.alias && <div>Alias: {item.alias}</div>}
                </>
              ) : (
                <>
                  {item.destinationNodeId && <div>→ {item.destinationNodeId}</div>}
                  {item.transformation?.formula && (
                    <div className="font-mono text-[10px] truncate">{item.transformation.formula}</div>
                  )}
                </>
              )}
              <div>Interface: {item.interface?.type}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="border border-blue-200 rounded p-3 bg-blue-50 space-y-2">
          <Input
            placeholder="Name (required)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-7 text-xs"
            autoFocus
          />

          {section === 'inputs' ? (
            <>
              <select
                value={formData.nodeId}
                onChange={(e) => setFormData({ ...formData, nodeId: e.target.value })}
                className="w-full h-7 text-xs border rounded px-2 bg-white"
              >
                <option value="">Select Source Node (optional)</option>
                {availableNodes.map(node => (
                  <option key={node.nodeId} value={node.nodeId}>{node.displayName}</option>
                ))}
              </select>

              <Input
                placeholder="Alias (optional)"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                className="h-7 text-xs"
              />
            </>
          ) : (
            <>
              <select
                value={formData.destinationNodeId}
                onChange={(e) => setFormData({ ...formData, destinationNodeId: e.target.value })}
                className="w-full h-7 text-xs border rounded px-2 bg-white"
              >
                <option value="">No destination (optional)</option>
                {availableNodes.map(node => (
                  <option key={node.nodeId} value={node.nodeId}>{node.displayName}</option>
                ))}
              </select>

              <Input
                placeholder="Formula (optional, e.g., input1 + input2)"
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                className="h-7 text-xs font-mono"
              />
            </>
          )}

          <select
            value={formData.interfaceType}
            onChange={(e) => setFormData({ ...formData, interfaceType: e.target.value })}
            className="w-full h-7 text-xs border rounded px-2 bg-white"
          >
            <option value="SimpleValue">SimpleValue</option>
            <option value="AggregationResult">AggregationResult</option>
            <option value="TransformationResult">TransformationResult</option>
            <option value="Any">Any</option>
          </select>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-6 text-xs"
              onClick={editingIndex !== null ? handleSaveEdit : handleAdd}
              disabled={!formData.name.trim()}
            >
              {editingIndex !== null ? 'Save' : 'Add'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Tags Section Component
const TagsSection: React.FC<{
  nodeConfig: any;
  onTagsUpdate: (newTags: string[]) => void;
}> = ({ nodeConfig, onTagsUpdate }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const currentTags = nodeConfig.tags || [];

  // Get available tags from scenario (both from registry and existing nodes)
  const availableTags = useMemo(() => {
    if (!scenario) return [];

    const allTags = new Set<string>();

    // Add tags from the global tag registry
    if (scenario.groups?.tags) {
      scenario.groups.tags.forEach(tag => allTags.add(tag.name));
    }

    // Add tags from existing nodes
    if (scenario.nodes) {
      scenario.nodes.forEach(node => {
        if (node.tags) {
          node.tags.forEach(tag => allTags.add(tag));
        }
      });
    }

    return Array.from(allTags).filter(tag => !currentTags.includes(tag));
  }, [scenario, currentTags]);

  const handleAddTag = (tag: string) => {
    if (tag && !currentTags.includes(tag)) {
      onTagsUpdate([...currentTags, tag]);
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsUpdate(currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleCreateNewTag = () => {
    if (newTagInput.trim()) {
      handleAddTag(newTagInput.trim());
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Tags className="h-4 w-4" />
          Tags
          <Badge variant="outline" className="text-xs">
            {currentTags.length}
          </Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => setIsAddingTag(!isAddingTag)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {currentTags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-700 group"
            onClick={() => handleRemoveTag(tag)}
            title={`Click to remove "${tag}"`}
          >
            {tag}
            <X className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Badge>
        ))}
        {currentTags.length === 0 && (
          <span className="text-xs text-gray-500 italic">No tags assigned</span>
        )}
      </div>

      {/* Add Tag Interface */}
      {isAddingTag && (
        <div className="space-y-2">
          {/* Available Tags */}
          {availableTags.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Available Tags:</div>
              <div className="flex flex-wrap gap-1">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-1 cursor-pointer hover:bg-blue-100 hover:border-blue-300"
                    onClick={() => handleAddTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Create New Tag */}
          <div className="flex gap-2">
            <Input
              placeholder="Create new tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateNewTag();
                }
                if (e.key === 'Escape') {
                  setIsAddingTag(false);
                  setNewTagInput("");
                }
              }}
              className="h-7 text-xs"
              autoFocus
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCreateNewTag}
              disabled={!newTagInput.trim()}
            >
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setIsAddingTag(false);
                setNewTagInput("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// FSLAnalysisSection component REMOVED - user requested clean implementation without FSLGenerator

// State Actions Editor Component
const StateActionsEditor: React.FC<{
  stateName: string;
  stateIndex: number;
  actions: any[];
  nodeConfig: any;
  onActionsUpdate: (newActions: any[]) => void;
  onAutoGenerateOutput?: (outputName: string) => void;
}> = ({ stateName, stateIndex, actions, nodeConfig, onActionsUpdate, onAutoGenerateOutput }) => {
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionType, setNewActionType] = useState<'emit' | 'log'>('emit');
  const [newActionFormula, setNewActionFormula] = useState('');
  const [newActionTarget, setNewActionTarget] = useState('');
  const [newActionLogValue, setNewActionLogValue] = useState('');

  // Get available output destinations
  const availableOutputs = nodeConfig.outputs || [];

  // Get existing output names
  const existingOutputNames = availableOutputs.map((o: any) => o.name);

  const handleAddAction = () => {
    if (newActionType === 'emit') {
      if (!newActionFormula || !newActionTarget) {
        return;
      }

      // Auto-generate output if it doesn't exist
      if (!existingOutputNames.includes(newActionTarget)) {
        onAutoGenerateOutput?.(newActionTarget);
      }

      const newAction = {
        action: 'emit',
        target: newActionTarget,
        formula: newActionFormula
      };
      onActionsUpdate([...actions, newAction]);
    } else if (newActionType === 'log') {
      if (!newActionLogValue) {
        return;
      }
      const newAction = {
        action: 'log',
        value: newActionLogValue
      };
      onActionsUpdate([...actions, newAction]);
    }

    // Reset form
    setNewActionFormula('');
    setNewActionTarget('');
    setNewActionLogValue('');
    setIsAddingAction(false);
  };

  const handleRemoveAction = (actionIndex: number) => {
    const updatedActions = actions.filter((_, idx) => idx !== actionIndex);
    onActionsUpdate(updatedActions);
  };

  return (
    <div className="border border-slate-200 rounded p-3 bg-slate-50">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-slate-700">{stateName}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{actions.length} action(s)</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setIsAddingAction(!isAddingAction)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Existing Actions */}
        {actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action: any, actionIndex: number) => (
              <div key={actionIndex} className="p-2 bg-white border rounded group relative">
                <button
                  onClick={() => handleRemoveAction(actionIndex)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Remove action"
                >
                  <X className="h-2.5 w-2.5" />
                </button>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 uppercase">{action.action}</span>
                  {action.action === 'emit' && action.target && (
                    <span className="text-xs text-slate-500">→ {action.target}</span>
                  )}
                </div>

                {action.action === 'emit' && action.formula && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-slate-600 mb-1">Formula:</div>
                    <div className="p-2 bg-slate-100 rounded text-xs font-mono text-slate-800">
                      {action.formula}
                    </div>
                  </div>
                )}

                {action.action === 'log' && action.value && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-slate-600 mb-1">Message:</div>
                    <div className="p-2 bg-slate-100 rounded text-xs text-slate-700">
                      "{action.value}"
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {actions.length === 0 && !isAddingAction && (
          <div className="text-xs text-slate-500 italic">No actions - Click + to add</div>
        )}

        {/* Add Action Form */}
        {isAddingAction && (
          <div className="mt-2 p-3 bg-white border border-blue-200 rounded space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Action Type</label>
              <div className="flex gap-2">
                <Button
                  variant={newActionType === 'emit' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNewActionType('emit')}
                >
                  Emit Output
                </Button>
                <Button
                  variant={newActionType === 'log' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNewActionType('log')}
                >
                  Log Message
                </Button>
              </div>
            </div>

            {newActionType === 'emit' && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Output Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Type new output name (e.g., output1, result)"
                    value={newActionTarget}
                    onChange={(e) => setNewActionTarget(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                    list="existing-outputs"
                  />
                  <datalist id="existing-outputs">
                    {availableOutputs.map((output: any) => (
                      <option key={output.name} value={output.name} />
                    ))}
                  </datalist>
                  {newActionTarget && !existingOutputNames.includes(newActionTarget) && (
                    <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <span>✓</span> <span>Will auto-create output "{newActionTarget}"</span>
                    </div>
                  )}
                  {newActionTarget && existingOutputNames.includes(newActionTarget) && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <span>→</span> <span>Using existing output "{newActionTarget}"</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Value Formula <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={newActionFormula}
                    onChange={(e) => setNewActionFormula(e.target.value)}
                    placeholder="e.g., inputA.data.value * 2 + inputB.data.value"
                    className="h-16 text-xs font-mono resize-none"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Use input aliases (e.g., inputA, inputB) to reference input buffers
                  </div>
                </div>
              </>
            )}

            {newActionType === 'log' && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Log Message <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newActionLogValue}
                  onChange={(e) => setNewActionLogValue(e.target.value)}
                  placeholder="Enter log message..."
                  className="h-7 text-xs"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsAddingAction(false);
                  setNewActionFormula('');
                  setNewActionTarget('');
                  setNewActionLogValue('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddAction}
                disabled={
                  (newActionType === 'emit' && (!newActionFormula || !newActionTarget)) ||
                  (newActionType === 'log' && !newActionLogValue)
                }
              >
                Add Action
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NodeInspectorModal: React.FC = () => {
  const selectedNodeId = useSimulationStore(state => state.selectedNodeId);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const nodeStates = useSimulationStore(state => state.nodeStates);
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const setSelectedNodeId = useSimulationStore(state => state.setSelectedNodeId);
  const scenario = useSimulationStore(state => state.scenario);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const updateNodeConfigInStore = useSimulationStore(state => state.updateNodeConfigInStore);
  const saveSnapshot = useSimulationStore(state => state.saveSnapshot);

  const { toast } = useToast();

  const [editedConfigText, setEditedConfigText] = useState<string>("");
  const [showConfigJson, setShowConfigJson] = useState(false);
  const [showStateJson, setShowStateJson] = useState(false);
  const [originalConfigText, setOriginalConfigText] = useState<string>("");
  const [selectedEventState, setSelectedEventState] = useState<NodeStateMachineState | null>(null);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any | null>(null);
  const [showStateMachine, setShowStateMachine] = useState(false);

  const isOpen = !!selectedNodeId;
  const nodeConfig = selectedNodeId ? nodesConfig[selectedNodeId] : null;
  const nodeState = selectedNodeId ? nodeStates[selectedNodeId] : null;
  const logs = selectedNodeId ? nodeActivityLogs[selectedNodeId] || [] : [];

  // Only reset selected event state when node changes if the event doesn't belong to the new node
  useEffect(() => {
    if (selectedLogEntry && selectedLogEntry.nodeId !== selectedNodeId) {
      setSelectedEventState(null);
      setSelectedLogEntry(null);
    }
  }, [selectedNodeId, selectedLogEntry]);

  useEffect(() => {
    if (nodeConfig) {
      const configText = JSON.stringify(nodeConfig, null, 2);
      setEditedConfigText(configText);
      setOriginalConfigText(configText);
    } else {
      setEditedConfigText("");
      setOriginalConfigText("");
    }
  }, [nodeConfig]);

  const hasUnsavedChanges = editedConfigText !== originalConfigText;

  const handleSaveConfig = async () => {
    if (!selectedNodeId || !scenario) return;

    try {
      const parsedConfig = JSON.parse(editedConfigText);
      
      // Validate that essential properties are maintained
      if (parsedConfig.nodeId !== selectedNodeId) {
        toast({
          variant: "destructive",
          title: "Invalid Configuration",
          description: "Node ID cannot be changed through this editor."
        });
        return;
      }

      // Apply the changes using updateNodeConfigInStore (preserves simulation state)
      const success = updateNodeConfigInStore(selectedNodeId, parsedConfig);
      if (!success) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Failed to update node configuration."
        });
        return;
      }
      setOriginalConfigText(editedConfigText);
      
      toast({
        title: "Configuration Updated",
        description: `Node ${parsedConfig.displayName} has been updated successfully.`
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: error instanceof Error ? error.message : "Please check your JSON syntax."
      });
    }
  };

  const handleResetConfig = () => {
    setEditedConfigText(originalConfigText);
  };

  const handleTagsUpdate = async (newTags: string[]) => {
    if (!selectedNodeId) return;

    try {
      // Simply update the node tags using updateNodeConfigInStore (preserves simulation state)
      const currentNode = nodesConfig[selectedNodeId];
      if (!currentNode) return;

      const success = updateNodeConfigInStore(selectedNodeId, { ...currentNode, tags: newTags });
      if (!success) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Failed to update node tags."
        });
        return;
      }

      toast({
        title: "Tags Updated",
        description: `Node tags have been updated successfully.`
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update tags."
      });
    }
  };

  const handleStateActionsUpdate = async (stateIndex: number, newActions: any[]) => {
    if (!selectedNodeId || !scenario || !nodeConfig) return;

    try {
      // Clone the FSM config
      const updatedFsm = JSON.parse(JSON.stringify(nodeConfig.fsm));

      // Update the state's onEntry actions
      if (updatedFsm.states && updatedFsm.states[stateIndex]) {
        if (typeof updatedFsm.states[stateIndex] === 'string') {
          // Convert string state to object format
          updatedFsm.states[stateIndex] = {
            name: updatedFsm.states[stateIndex],
            onEntry: newActions
          };
        } else {
          // Update existing object format
          updatedFsm.states[stateIndex].onEntry = newActions;
        }
      }

      // Apply the changes using updateNodeConfigInStore (preserves simulation state)
      const currentNode = nodesConfig[selectedNodeId];
      if (!currentNode) return;

      const success = updateNodeConfigInStore(selectedNodeId, { ...currentNode, fsm: updatedFsm });
      if (!success) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Failed to update FSM state actions."
        });
        return;
      }

      toast({
        title: "State Actions Updated",
        description: `Actions for state have been updated successfully.`
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update state actions."
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedNodeId(null);
      setEditedConfigText("");
      setOriginalConfigText("");
    }
  };

  if (!isOpen || !nodeConfig) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Node Inspector: {nodeConfig.displayName}</DialogTitle>
          <DialogDescription>
            ID: {nodeConfig.nodeId} | Type: {nodeConfig.type}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-3">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={`grid w-full ${nodeConfig.type === 'FSMProcessNode' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {nodeConfig.type === 'FSMProcessNode' && (
                <TabsTrigger value="fsm">FSM</TabsTrigger>
              )}
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <ConfigSection
                  nodeConfig={nodeConfig}
                  showJson={showConfigJson}
                  onToggleJson={() => setShowConfigJson(!showConfigJson)}
                  editedConfigText={editedConfigText}
                  onConfigTextChange={setEditedConfigText}
                  onSaveConfig={handleSaveConfig}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onResetConfig={handleResetConfig}
                  scenario={scenario}
                  saveSnapshot={saveSnapshot}
                  loadScenario={loadScenario}
                  toast={toast}
                  updateNodeConfigInStore={updateNodeConfigInStore}
                />
                <StateSection
                  nodeState={nodeState}
                  showJson={showStateJson}
                  onToggleJson={() => setShowStateJson(!showStateJson)}
                />
              </div>

              {/* Tags Section - full width below the grid */}
              <div className="mt-6">
                <TagsSection
                  nodeConfig={nodeConfig}
                  onTagsUpdate={handleTagsUpdate}
                />
              </div>

              {/* Message Interfaces Section - below tags */}
              <div className="mt-6">
                <MessageInterfacesSection nodeConfig={nodeConfig} />
              </div>

              {/* Interface Validation Section - if available */}
              <div className="mt-6">
                <InterfaceValidationSection nodeConfig={nodeConfig} />
              </div>
            </TabsContent>

            {/* FSM Tab - only for FSMProcessNode */}
            {nodeConfig.type === 'FSMProcessNode' && (
              <TabsContent value="fsm" className="mt-4">
                <div className="space-y-4">
                  {/* FSL Code Section */}
                  <div>
                    <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      FSL Definition
                    </h3>
                    <div className="bg-slate-50 border rounded-lg p-3">
                      <pre className="text-sm font-mono whitespace-pre-wrap text-slate-800">
                        {nodeConfig.fsl || '// No FSL definition provided'}
                      </pre>
                    </div>
                  </div>

                  {/* FSM Configuration */}
                  <div>
                    <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      FSM Configuration
                    </h3>

                    {/* States */}
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-2">FSM States ({nodeConfig.fsm?.states?.length || 0})</h4>
                      <div className="space-y-2">
                        {nodeConfig.fsm?.states?.map((state, index) => {
                          // Handle both string and object formats
                          const stateName = typeof state === 'string' ? state : state.name;
                          const isInitial = typeof state === 'object' ? state.isInitial : index === 0;
                          const isFinal = typeof state === 'object' ? state.isFinal : false;
                          const onEntry = typeof state === 'object' ? state.onEntry : null;

                          return (
                            <div key={index} className="bg-white border rounded p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={isInitial ? "default" : "secondary"} className="text-xs">
                                  {stateName}
                                </Badge>
                                {isInitial && <span className="text-xs text-green-600">Initial</span>}
                                {isFinal && <span className="text-xs text-blue-600">Final</span>}
                              </div>
                              {onEntry && onEntry.length > 0 && (
                                <div className="text-xs text-slate-600">
                                  On Entry: {onEntry.map((action: any) => `${action.action}(${action.target || action.value || ''})`).join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        }) || <div className="text-sm text-slate-500">No states defined</div>}
                      </div>
                    </div>

                    {/* Transitions */}
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-2">Transitions ({nodeConfig.fsm?.transitions?.length || 0})</h4>
                      <div className="space-y-1">
                        {nodeConfig.fsm?.transitions?.map((transition, index) => (
                          <div key={index} className="text-xs bg-white border rounded p-2 flex items-center justify-between">
                            <span className="font-mono">
                              {transition.from} → {transition.to}
                            </span>
                            <span className="text-slate-600">
                              {transition.trigger}
                              {transition.condition && ` (${transition.condition})`}
                            </span>
                          </div>
                        )) || <div className="text-sm text-slate-500">No transitions defined</div>}
                      </div>
                    </div>

                    {/* State Actions */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">State Actions</h4>
                      </div>
                      <div className="space-y-3">
                        {nodeConfig.fsm?.states?.map((state, stateIndex) => {
                          const stateName = typeof state === 'string' ? state : state.name;
                          const onEntry = typeof state === 'object' ? state.onEntry : null;

                          return (
                            <StateActionsEditor
                              key={stateIndex}
                              stateName={stateName}
                              stateIndex={stateIndex}
                              actions={onEntry || []}
                              nodeConfig={nodeConfig}
                              onActionsUpdate={(newActions) => handleStateActionsUpdate(stateIndex, newActions)}
                            />
                          );
                        }) || <div className="text-sm text-slate-500">No state actions defined</div>}
                      </div>
                    </div>

                    {/* Variables */}
                    {nodeConfig.fsm?.variables && Object.keys(nodeConfig.fsm.variables).length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Variables</h4>
                        <div className="bg-white border rounded p-2">
                          <SimpleJsonView value={nodeConfig.fsm.variables} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="activity" className="mt-4">
              <div className="flex flex-col space-y-3">
                {/* State Machine - prominent for FSM nodes, toggleable for others */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {nodeConfig.type === 'FSMProcessNode' ? (
                        <h3 className="font-semibold text-primary">State Machine Behavior</h3>
                      ) : (
                        <>
                          <h3 className="font-semibold text-primary">Activity Log</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => setShowStateMachine(!showStateMachine)}
                          >
                            {showStateMachine ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                            State Machine
                          </Button>
                        </>
                      )}
                    </div>
                    {selectedEventState && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => setSelectedEventState(null)}
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>

                  {/* State Machine - always visible for FSM nodes, toggleable for others */}
                  {(nodeConfig.type === 'FSMProcessNode' || showStateMachine) && (
                    <div className="flex justify-center bg-muted/20 border rounded-lg p-2 mb-3">
                      <NodeStateMachineDiagram
                        nodeConfig={nodeConfig}
                        stateMachineInfo={(nodeState as any)?.stateMachine}
                        width={600}
                        height={nodeConfig.type === 'FSMProcessNode' ? 300 : 200}
                        overrideActiveState={selectedEventState}
                        showVariables={true}
                        activityLogs={logs}
                        selectedLogEntry={selectedLogEntry}
                      />
                    </div>
                  )}
                </div>

                {/* Activity Log */}
                <div className="flex flex-col">
                  <h4 className="font-medium text-sm mb-2 flex-shrink-0 text-muted-foreground">Click events to see state changes</h4>
                  <NodeActivityLogWithStateTransitions
                    nodeId={selectedNodeId}
                    stateMachineInfo={(nodeState as any)?.stateMachine}
                    onEventClick={(event, stateAtTime) => {
                      // Handle event click to show state at that time
                      console.log('Event clicked:', event, 'State at time:', stateAtTime);
                      setSelectedEventState(stateAtTime || null);
                      setSelectedLogEntry(event);
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t border-border mt-auto flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeInspectorModal;
