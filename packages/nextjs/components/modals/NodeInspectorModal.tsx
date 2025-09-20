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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NodeStateMachineDiagram from "@/components/ui/node-state-machine-diagram";
import { useSimulationStore } from "@/stores/simulationStore";
import { useToast } from "@/hooks/use-toast";
// import { MessageInterfaces } from "@/lib/simulation/message-interfaces";
// import { InterfaceCompatibilityValidator } from "@/lib/simulation/enhanced-node-schema";
import { Code, Settings, Activity, ChevronDown, ChevronRight, Save, RefreshCw, MessageSquare, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Info, Eye, EyeOff } from "lucide-react";
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

// Interface validation display component
const InterfaceValidationSection: React.FC<{ nodeConfig: any }> = ({ nodeConfig }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (scenario && nodeConfig) {
      try {
        // Mock validation for enhanced nodes
        if (nodeConfig.inputInterface || nodeConfig.outputInterface || nodeConfig.inputs || nodeConfig.outputs) {
          const result = InterfaceCompatibilityValidator.validateNode(nodeConfig, scenario);
          setValidationResult(result);
        } else {
          setValidationResult(null);
        }
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
}> = ({ nodeConfig, showJson, onToggleJson, editedConfigText, onConfigTextChange, onSaveConfig, hasUnsavedChanges, onResetConfig }) => {
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

            {/* Inputs Section */}
            {nodeConfig.inputs && nodeConfig.inputs.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-700 mb-2">Inputs ({nodeConfig.inputs.length})</h4>
                <div className="space-y-3">
                  {nodeConfig.inputs.map((input: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded p-3 bg-slate-50">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-700">{input.name}</span>
                          {input.alias && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">alias: {input.alias}</span>}
                          {input.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">required</span>}
                        </div>
                        {input.nodeId && (
                          <div className="text-xs text-slate-600">
                            <span className="font-medium">Source:</span> {input.nodeId}
                            {input.sourceOutputName && <span> → {input.sourceOutputName}</span>}
                          </div>
                        )}
                        <div className="text-xs">
                          <span className="font-medium text-slate-600">Interface:</span> {input.interface.type}
                          {input.interface.requiredFields && input.interface.requiredFields.length > 0 && (
                            <div className="mt-1 ml-2">
                              <span className="text-slate-500">Required fields:</span>
                              <ul className="list-disc list-inside ml-2 text-slate-500">
                                {input.interface.requiredFields.map((field: string, i: number) => (
                                  <li key={i} className="font-mono text-xs">{field}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outputs Section */}
            {nodeConfig.outputs && nodeConfig.outputs.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-700 mb-2">Outputs ({nodeConfig.outputs.length})</h4>
                <div className="space-y-3">
                  {nodeConfig.outputs.map((output: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded p-3 bg-slate-50">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-slate-700">{output.name}</span>
                          <span className="text-xs text-slate-500">→ {output.destinationNodeId}</span>
                        </div>
                        {output.destinationInputName && (
                          <div className="text-xs text-slate-600">
                            <span className="font-medium">Target Input:</span> {output.destinationInputName}
                          </div>
                        )}
                        <div className="text-xs">
                          <span className="font-medium text-slate-600">Interface:</span> {output.interface.type}
                          {output.interface.requiredFields && output.interface.requiredFields.length > 0 && (
                            <div className="mt-1 ml-2">
                              <span className="text-slate-500">Required fields:</span>
                              <ul className="list-disc list-inside ml-2 text-slate-500">
                                {output.interface.requiredFields.map((field: string, i: number) => (
                                  <li key={i} className="font-mono text-xs">{field}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {output.transformation && (
                          <div className="mt-2 p-2 bg-white border rounded">
                            <button
                              onClick={() => toggleFormula(index)}
                              className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 w-full text-left"
                            >
                              {expandedFormulas.has(index) ?
                                <ChevronDown className="h-3 w-3" /> :
                                <ChevronRight className="h-3 w-3" />
                              }
                              Transformation Formula
                            </button>
                            {expandedFormulas.has(index) && (
                              <div className="mt-2 space-y-2">
                                <div className="p-2 bg-slate-100 rounded text-xs font-mono">
                                  {output.transformation.formula}
                                </div>
                                {output.transformation.fieldMapping && (
                                  <div>
                                    <span className="text-xs font-medium text-slate-600">Field Mapping:</span>
                                    <div className="mt-1 p-2 bg-slate-100 rounded text-xs">
                                      {Object.entries(output.transformation.fieldMapping).map(([key, value]) => (
                                        <div key={key} className="font-mono">
                                          <span className="text-blue-600">{key}</span> = <span className="text-green-600">{value as string}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
  if (action.includes("CREATED") || action.includes("EMITTED")) return "bg-green-100 text-green-800";
  if (action.includes("AGGREGATED") || action.includes("CONSUMED")) return "bg-blue-100 text-blue-800";
  if (action.includes("OUTPUT") || action.includes("GENERATED")) return "bg-purple-100 text-purple-800";
  if (action.includes("ERROR")) return "bg-red-100 text-red-800";
  if (action.includes("ARRIVED") || action.includes("ADDED")) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800";
};

// Enhanced activity log with clickable events and state transitions
const NodeActivityLogWithStateTransitions: React.FC<{
  nodeId: string;
  stateMachineInfo?: StateMachineInfo;
  onEventClick?: (event: any, stateAtTime?: NodeStateMachineState) => void;
}> = ({ nodeId, stateMachineInfo, onEventClick }) => {
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const logs = nodeActivityLogs[nodeId] || [];
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground p-3 border rounded-md">No activity logged yet for this node.</p>;
  }

  // Create a map of timestamp to state for quick lookup
  const stateAtTime = useMemo(() => {
    const stateMap = new Map<number, NodeStateMachineState>();
    if (stateMachineInfo?.transitionHistory) {
      stateMachineInfo.transitionHistory.forEach(transition => {
        stateMap.set(transition.timestamp, transition.to);
      });
    }
    return stateMap;
  }, [stateMachineInfo]);

  const getStateAtTime = (timestamp: number): NodeStateMachineState | undefined => {
    // Find the latest state transition at or before this timestamp
    let latestState: NodeStateMachineState | undefined;
    let latestTime = -1;

    stateAtTime.forEach((state, time) => {
      if (time <= timestamp && time > latestTime) {
        latestState = state;
        latestTime = time;
      }
    });

    return latestState || (stateMachineInfo?.currentState);
  };

  const handleEventClick = (log: any) => {
    const eventId = `${log.sequence}-${log.timestamp}`;
    setSelectedEventId(selectedEventId === eventId ? null : eventId);
    const stateAtEventTime = getStateAtTime(log.timestamp);
    onEventClick?.(log, stateAtEventTime);
  };

  return (
    <div className="border rounded-md">
      <div className="bg-muted/50 px-3 py-2 text-xs font-medium border-b">
        <div className="flex gap-4">
          <div className="w-16 flex-shrink-0">Time</div>
          <div className="w-40 flex-shrink-0">Action</div>
          <div className="w-16 flex-shrink-0">Value</div>
          <div className="w-24 flex-shrink-0">State</div>
          <div className="flex-1 min-w-0">Details</div>
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

              return (
                <div
                  key={eventId}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => handleEventClick(log)}
                  title="Click to see state at this time"
                >
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
                    <div className="w-24 flex-shrink-0">
                      {stateAtEventTime && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 block truncate">
                          {stateAtEventTime.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-muted-foreground break-words">{log.details || "-"}</div>
                  </div>

                  {isSelected && stateAtEventTime && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs border-l-2 border-blue-300">
                      <div className="font-medium text-blue-800 mb-1">State at this time:</div>
                      <div className="text-blue-600">
                        <strong>{stateAtEventTime.replace(/_/g, ' ').toUpperCase()}</strong>
                      </div>
                      {stateMachineInfo?.transitionHistory && (
                        <div className="mt-1 text-blue-500">
                          Sequence: {log.sequence} | Timestamp: {log.timestamp}s
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

const NodeInspectorModal: React.FC = () => {
  const selectedNodeId = useSimulationStore(state => state.selectedNodeId);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const nodeStates = useSimulationStore(state => state.nodeStates);
  const setSelectedNodeId = useSimulationStore(state => state.setSelectedNodeId);
  const scenario = useSimulationStore(state => state.scenario);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  
  const { toast } = useToast();

  const [editedConfigText, setEditedConfigText] = useState<string>("");
  const [showConfigJson, setShowConfigJson] = useState(false);
  const [showStateJson, setShowStateJson] = useState(false);
  const [originalConfigText, setOriginalConfigText] = useState<string>("");

  const isOpen = !!selectedNodeId;
  const nodeConfig = selectedNodeId ? nodesConfig[selectedNodeId] : null;
  const nodeState = selectedNodeId ? nodeStates[selectedNodeId] : null;

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

      // Create updated scenario with modified node
      const updatedScenario = {
        ...scenario,
        nodes: scenario.nodes.map((node: any) =>
          node.nodeId === selectedNodeId ? parsedConfig : node
        )
      };

      // Apply the changes
      await loadScenario(updatedScenario);
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="state-activity">State Machine & Activity</TabsTrigger>
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
                />
                <StateSection 
                  nodeState={nodeState} 
                  showJson={showStateJson}
                  onToggleJson={() => setShowStateJson(!showStateJson)}
                />
              </div>
            </TabsContent>

            <TabsContent value="state-activity" className="mt-4">
              <div className="flex flex-col space-y-3">
                {/* State Machine on top */}
                <div>
                  <h3 className="font-semibold text-primary mb-2">State Machine</h3>
                  <div className="flex justify-center bg-muted/20 border rounded-lg p-2">
                    <NodeStateMachineDiagram
                      nodeConfig={nodeConfig}
                      stateMachineInfo={nodeState?.stateMachine}
                      width={600}
                      height={200}
                    />
                  </div>
                </div>

                {/* Activity Log below */}
                <div className="flex flex-col">
                  <h3 className="font-semibold text-primary mb-2 flex-shrink-0">Activity Log (Click events to see state changes)</h3>
                  <NodeActivityLogWithStateTransitions
                    nodeId={selectedNodeId}
                    stateMachineInfo={nodeState?.stateMachine}
                    onEventClick={(event, stateAtTime) => {
                      // Handle event click to show state at that time
                      console.log('Event clicked:', event, 'State at time:', stateAtTime);
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
