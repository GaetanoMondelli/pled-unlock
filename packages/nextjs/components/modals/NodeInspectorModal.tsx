
      
'use client';
import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '@/stores/simulationStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Token, type HistoryEntry, type QueueState, type ProcessNodeState, type SinkState, DataSourceNodeSchema, QueueNodeSchema, ProcessNodeSchema, SinkNodeSchema, type AnyNode, SourceTokenSummarySchema, type SourceTokenSummary } from '@/lib/simulation/types';

const formatSimTimestamp = (simTime: number): string => {
  if (typeof simTime !== 'number' || isNaN(simTime)) {
    return "N/A";
  }
  return `${simTime.toFixed(1)}s`;
};

const formatEpochTimestamp = (epochMillis: number | undefined | null): string => {
  if (typeof epochMillis !== 'number' || isNaN(epochMillis)) {
    return 'N/A';
  }
  const date = new Date(epochMillis);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const getEventTimeDisplay = (log: HistoryEntry): string => {
  const formattedEpoch = formatEpochTimestamp(log.epochTimestamp);
  if (formattedEpoch !== 'N/A') {
    return formattedEpoch;
  }
  if (typeof (log as any).sequence === 'number') {
    return `Seq: ${(log as any).sequence}`;
  }
  return 'N/A';
};


const NodeInspectorModal: React.FC = () => {
  const {
    selectedNodeId,
    nodesConfig,
    nodeStates,
    nodeActivityLogs,
    setSelectedNodeId,
    setSelectedToken,
    updateNodeConfigInStore,
    errorMessages, 
   } = useSimulationStore(state => ({
    selectedNodeId: state.selectedNodeId,
    nodesConfig: state.nodesConfig,
    nodeStates: state.nodeStates,
    nodeActivityLogs: state.nodeActivityLogs,
    setSelectedNodeId: state.setSelectedNodeId,
    setSelectedToken: state.setSelectedToken,
    updateNodeConfigInStore: state.updateNodeConfigInStore,
    errorMessages: state.errorMessages,
   }));

  const { toast } = useToast();
  const [editedConfigText, setEditedConfigText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [displayedActivityLog, setDisplayedActivityLog] = useState<HistoryEntry[]>([]);


  const isOpen = !!selectedNodeId;
  const nodeConfig = selectedNodeId ? nodesConfig[selectedNodeId] : null;
  const SNodeState = selectedNodeId ? nodeStates[selectedNodeId] : null;

  useEffect(() => {
    if (isOpen && selectedNodeId && nodeActivityLogs[selectedNodeId]) {
      const currentLog = nodeActivityLogs[selectedNodeId] || [];
      const sortedLog = [...currentLog].sort((a, b) => {
        if (b.timestamp !== a.timestamp) { // Sim time
          return b.timestamp - a.timestamp; // Descending (15s before 10s)
        }
        if (b.epochTimestamp !== a.epochTimestamp) { // Real-world event time
          return b.epochTimestamp - a.epochTimestamp; // Descending (later epoch is newer)
        }
        return b.sequence - a.sequence; // Descending (higher sequence is newer)
      });
      setDisplayedActivityLog(sortedLog);
    } else {
      setDisplayedActivityLog([]);
    }
  }, [isOpen, selectedNodeId, nodeActivityLogs]);


  useEffect(() => {
    if (nodeConfig) {
      setEditedConfigText(JSON.stringify(nodeConfig, null, 2));
    } else {
      setEditedConfigText('');
    }
  }, [nodeConfig]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedNodeId(null);
      setEditedConfigText('');
    }
  };

  const handleConfigSave = async () => {
    if (!selectedNodeId || !nodeConfig) return;
    setIsSaving(true);
    try {
      const newConfigData = JSON.parse(editedConfigText);
      
      const currentBaseProperties: Partial<AnyNode> = {
        nodeId: nodeConfig.nodeId, 
        type: nodeConfig.type,     
        position: nodeConfig.position, 
      };

      const mergedConfigAttempt = { ...currentBaseProperties, ...newConfigData };


      let specificSchema;
      switch (nodeConfig.type) {
        case 'DataSource': specificSchema = DataSourceNodeSchema; break;
        case 'Queue': specificSchema = QueueNodeSchema; break;
        case 'ProcessNode': specificSchema = ProcessNodeSchema; break;
        case 'Sink': specificSchema = SinkNodeSchema; break;
        default:
          toast({ variant: "destructive", title: "Save Error", description: `Unknown node type: ${nodeConfig.type}` });
          setIsSaving(false);
          return;
      }
      
      const parseResult = specificSchema.safeParse(mergedConfigAttempt);

      if (!parseResult.success) {
         const errorMsg = parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
         toast({ variant: "destructive", title: "Validation Error", description: errorMsg });
         setIsSaving(false);
         return;
      }
      
      const validatedConfigData = parseResult.data as AnyNode; 

      validatedConfigData.nodeId = nodeConfig.nodeId;
      validatedConfigData.type = nodeConfig.type;


      const success = updateNodeConfigInStore(selectedNodeId, validatedConfigData);

      if (success) {
        toast({ title: "Configuration Saved", description: `Node ${validatedConfigData.displayName} updated successfully.` });
        const currentConfigInStore = useSimulationStore.getState().nodesConfig[selectedNodeId!];
        setEditedConfigText(JSON.stringify(currentConfigInStore, null, 2));
      } else {
        const lastErrorRelatedToNode = errorMessages.find(m => m.includes(validatedConfigData.displayName || selectedNodeId));
        if (lastErrorRelatedToNode) {
            // Error already handled by store
        } else if (useSimulationStore.getState().errorMessages.length === 0 || !useSimulationStore.getState().errorMessages.some(m => m.includes(validatedConfigData.displayName || selectedNodeId))) {
             toast({ 
                variant: "destructive",
                title: "Save Error",
                description: `Failed to update ${validatedConfigData.displayName}. Check global errors if any.`
            });
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "JSON Format Error", description: `Invalid JSON: ${e.message}`});
    } finally {
      setIsSaving(false);
    }
  };
  

  if (!isOpen || !nodeConfig || !SNodeState) {
    return null;
  }
  
  const getNodeDisplayName = (nodeId: string) => {
    if (nodeId === 'simulation_errors' || nodeId === 'simulation_system') return 'Simulation System';
    return nodesConfig[nodeId]?.displayName || nodeId;
  };

  const renderTokenList = (tokens: Token[], bufferName: string) => (
    <div className="mt-2">
      <h4 className="font-semibold text-xs mb-1">{bufferName}: {tokens.length} token(s)</h4>
      {tokens.length > 0 && (
        <div className="max-h-24 h-auto overflow-y-auto border rounded-md p-2 bg-muted/20">
          <ul className="text-xs space-y-1">
            {tokens.map(token => (
              <li key={token.id} className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={() => setSelectedToken(token)}>
                ID: {token.id.substring(0,8)}, Val: {JSON.stringify(token.value)}, Created: {formatSimTimestamp(token.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderSourceTokenSummariesDisplay = (summaries?: SourceTokenSummary[]) => {
    if (!summaries || summaries.length === 0) return null;
    return (
      <div className="mt-1 pl-2 border-l-2 border-muted text-muted-foreground text-xs">
        <p className="font-semibold">Source Tokens:</p>
        <ul className="list-disc list-inside space-y-0.5">
          {summaries.map(summary => (
            <li key={summary.id}>
              ID: {summary.id.substring(0,8)}, Val: {JSON.stringify(summary.originalValue)}, Origin: {getNodeDisplayName(summary.originNodeId)} @ {formatSimTimestamp(summary.createdAt)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderStateDetails = () => {
    if (!SNodeState) return <p>No state information available.</p>;
    switch (nodeConfig.type) {
      case 'DataSource':
        return <p>Last Emission: {SNodeState.lastEmissionTime >= 0 ? `${formatSimTimestamp(SNodeState.lastEmissionTime)}` : 'N/A'}</p>;
      case 'Queue':
        const queueState = SNodeState as QueueState;
        return (
          <>
            <p>Last Aggregation: {queueState.lastAggregationTime >= 0 ? `${formatSimTimestamp(queueState.lastAggregationTime)}` : 'N/A'}</p>
            {renderTokenList(queueState.inputBuffer, "Input Buffer")}
            {renderTokenList(queueState.outputBuffer, "Output Buffer")}
          </>
        );
      case 'ProcessNode':
        const processState = SNodeState as ProcessNodeState;
        return (
          <>
            <p>Last Fired: {processState.lastFiredTime && processState.lastFiredTime >=0 ? `${formatSimTimestamp(processState.lastFiredTime)}` : 'N/A'}</p>
            <p className="font-semibold text-xs mb-1 mt-2">Input Buffers (for non-Queue sources):</p>
            {Object.entries(processState.inputBuffers).map(([inputId, tokens]) => (
              <div key={inputId} className="mb-1">
                <p className="text-xs font-medium">{nodesConfig[inputId]?.displayName || inputId}: {tokens.length} token(s)</p>
                {tokens.length > 0 && (
                   <div className="max-h-16 h-auto overflow-y-auto border rounded-md p-1 bg-muted/20">
                    <ul className="text-xs space-y-0.5">
                      {tokens.map(token => (
                        <li key={token.id} className="cursor-pointer hover:bg-muted/50 p-0.5 rounded truncate" title={`ID: ${token.id}, Value: ${JSON.stringify(token.value)}`} onClick={() => setSelectedToken(token)}>
                          ID: {token.id.substring(0,8)}, Val: {JSON.stringify(token.value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </>
        );
      case 'Sink':
        const sinkStateTyped = SNodeState as SinkState;
        return (
            <>
                <p>Tokens Consumed Count: {sinkStateTyped.consumedTokenCount || 0}</p>
                <p>Last Consumed Time: {sinkStateTyped.lastConsumedTime && sinkStateTyped.lastConsumedTime >= 0 ? `${formatSimTimestamp(sinkStateTyped.lastConsumedTime)}` : 'N/A'}</p>
                {sinkStateTyped.consumedTokens && sinkStateTyped.consumedTokens.length > 0 &&
                  renderTokenList(sinkStateTyped.consumedTokens, "Recently Consumed Tokens (Max 50, Newest First)")
                }
            </>
        );
      default:
        return <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">{JSON.stringify(SNodeState, null, 2)}</pre>;
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Node Inspector: {nodeConfig.displayName}</DialogTitle>
          <DialogDescription>ID: {nodeConfig.nodeId} | Type: {nodeConfig.type} (Node ID and Type cannot be changed here)</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-3"> 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
            <div>
              <h3 className="font-semibold text-primary mb-2">Configuration (Editable JSON)</h3>
              <Textarea
                value={editedConfigText}
                onChange={(e) => setEditedConfigText(e.target.value)}
                rows={15}
                className="text-xs font-mono bg-muted/30 border-input focus:bg-background w-full"
                placeholder="Node configuration in JSON format..."
              />
               <Button
                onClick={handleConfigSave}
                disabled={isSaving || editedConfigText === JSON.stringify(nodesConfig[selectedNodeId!] || {}, null, 2)}
                className="mt-2 w-full"
               >
                {isSaving ? 'Saving...' : 'Save Configuration Changes'}
              </Button>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Current State</h3>
              <div className="text-sm bg-muted p-3 rounded-md min-h-[calc(15rem_+_2.5rem)]"> 
                {renderStateDetails()}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col"> 
            <h3 className="font-semibold text-primary mb-2 flex-shrink-0">Activity Log (Newest First)</h3>
            {displayedActivityLog && displayedActivityLog.length > 0 ? (
              <div className="h-80 overflow-y-auto border rounded-md"> 
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[120px] py-1 px-2 text-xs">Event Time</TableHead>
                      <TableHead className="w-[50px] py-1 px-2 text-xs">Seq</TableHead>
                      <TableHead className="w-[70px] py-1 px-2 text-xs">Sim Time</TableHead>
                      <TableHead className="py-1 px-2 text-xs whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis">Action</TableHead>
                      <TableHead className="py-1 px-2 text-xs max-w-[150px] break-words">Value</TableHead>
                      <TableHead className="py-1 px-2 text-xs break-words">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedActivityLog.map((log: HistoryEntry) => (
                      <TableRow key={`${log.timestamp}-${log.epochTimestamp}-${log.sequence}-${log.nodeId}-${log.action}-${log.details || 'no_details_key'}`}>
                        <TableCell className="py-0.5 px-2 text-xs">{getEventTimeDisplay(log)}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs">{log.sequence}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs">{formatSimTimestamp(log.timestamp)}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis" title={log.action}>{log.action}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs whitespace-pre-wrap break-words max-w-[150px]">
                          {log.value !== undefined ? JSON.stringify(log.value) : '-'}
                          {renderSourceTokenSummariesDisplay(log.sourceTokenSummaries)}
                        </TableCell>
                        <TableCell className="py-0.5 px-2 text-xs whitespace-pre-wrap break-words">{log.details || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-md">No activity logged for this node yet.</p>
            )}
          </div>
        </div> 

        <DialogFooter className="pt-4 border-t border-border mt-auto flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeInspectorModal;

    