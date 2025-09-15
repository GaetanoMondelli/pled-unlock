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
import { Code, Settings, Activity, ChevronDown, ChevronRight, Save, RefreshCw } from "lucide-react";

// Simple JSON display component
const SimpleJsonView: React.FC<{ value: any }> = ({ value }) => {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap bg-slate-50 p-3 rounded border overflow-auto max-h-64">
      {JSON.stringify(value, null, 2)}
    </pre>
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
          <div className="space-y-2">
            <div><span className="font-medium text-slate-600">ID:</span> <span className="font-mono text-slate-800">{nodeConfig.nodeId}</span></div>
            <div><span className="font-medium text-slate-600">Name:</span> {nodeConfig.displayName}</div>
            <div><span className="font-medium text-slate-600">Type:</span> {nodeConfig.type}</div>
            
            {nodeConfig.type === 'ProcessNode' && nodeConfig.outputs && (
              <div>
                <div className="font-medium text-slate-600 mb-2">Formulas ({nodeConfig.outputs.length}):</div>
                <div className="space-y-1">
                  {nodeConfig.outputs.map((output: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded p-2">
                      <button
                        onClick={() => toggleFormula(index)}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 w-full text-left"
                      >
                        {expandedFormulas.has(index) ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                        }
                        Formula {index + 1} → {output.destinationNodeId}
                      </button>
                      {expandedFormulas.has(index) && (
                        <div className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono">
                          {output.formula}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {nodeConfig.type === 'Queue' && (
              <>
                <div><span className="font-medium text-slate-600">Method:</span> {nodeConfig.aggregationMethod}</div>
                <div><span className="font-medium text-slate-600">Window:</span> {nodeConfig.timeWindow}s</div>
                {nodeConfig.capacity && <div><span className="font-medium text-slate-600">Capacity:</span> {nodeConfig.capacity}</div>}
              </>
            )}
            
            {nodeConfig.type === 'DataSource' && (
              <>
                <div><span className="font-medium text-slate-600">Interval:</span> {nodeConfig.interval}s</div>
                <div><span className="font-medium text-slate-600">Range:</span> {nodeConfig.valueMin} - {nodeConfig.valueMax}</div>
                <div><span className="font-medium text-slate-600">Destination:</span> <span className="font-mono">{nodeConfig.destinationNodeId}</span></div>
              </>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="state-machine">State Machine</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
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

            <TabsContent value="state-machine" className="mt-4">
              <div className="flex justify-center">
                <NodeStateMachineDiagram 
                  nodeConfig={nodeConfig} 
                  stateMachineInfo={nodeState?.stateMachine}
                  width={700}
                  height={500}
                />
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="flex flex-col">
                <h3 className="font-semibold text-primary mb-2 flex-shrink-0">Activity Log</h3>
                <NodeActivityLog nodeId={selectedNodeId} />
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
