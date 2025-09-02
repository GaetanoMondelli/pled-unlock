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
import { ScrollArea } from '@/components/ui/scroll-area';

const NodeActivityLog: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const nodeActivityLogs = useSimulationStore(state => state.nodeActivityLogs);
  const logs = nodeActivityLogs[nodeId] || [];

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3 border rounded-md">
        No activity logged yet for this node.
      </p>
    );
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
      <ScrollArea className="max-h-64">
        <div className="divide-y">
          {logs.slice(-30).reverse().map((log, index) => (
            <div key={`${log.sequence}-${index}`} className="px-3 py-2 text-xs hover:bg-muted/30">
              <div className="flex gap-4 items-start">
                <div className="w-16 flex-shrink-0 font-mono text-muted-foreground">
                  {log.timestamp}s
                </div>
                <div className="w-40 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)} block truncate`} title={log.action}>
                    {log.action}
                  </span>
                </div>
                <div className="w-16 flex-shrink-0 font-mono text-right">
                  {log.value !== undefined ? String(log.value) : '-'}
                </div>
                <div className="flex-1 min-w-0 text-muted-foreground break-words">
                  {log.details || '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const getActionColor = (action: string): string => {
  if (action.includes('CREATED') || action.includes('EMITTED')) return 'bg-green-100 text-green-800';
  if (action.includes('AGGREGATED') || action.includes('CONSUMED')) return 'bg-blue-100 text-blue-800';
  if (action.includes('OUTPUT') || action.includes('GENERATED')) return 'bg-purple-100 text-purple-800';
  if (action.includes('ERROR')) return 'bg-red-100 text-red-800';
  if (action.includes('ARRIVED') || action.includes('ADDED')) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-800';
};

const NodeInspectorModal: React.FC = () => {
  const selectedNodeId = useSimulationStore(state => state.selectedNodeId);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const nodeStates = useSimulationStore(state => state.nodeStates);
  const setSelectedNodeId = useSimulationStore(state => state.setSelectedNodeId);

  const [editedConfigText, setEditedConfigText] = useState<string>('');

  const isOpen = !!selectedNodeId;
  const nodeConfig = selectedNodeId ? nodesConfig[selectedNodeId] : null;
  const nodeState = selectedNodeId ? nodeStates[selectedNodeId] : null;

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

  if (!isOpen || !nodeConfig) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Node Inspector: {nodeConfig.displayName}</DialogTitle>
          <DialogDescription>ID: {nodeConfig.nodeId} | Type: {nodeConfig.type}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-3"> 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
            <div>
              <h3 className="font-semibold text-primary mb-2">Configuration (Read-only)</h3>
              <Textarea
                value={editedConfigText}
                readOnly
                rows={15}
                className="text-xs font-mono bg-muted/30 border-input w-full"
                placeholder="Node configuration in JSON format..."
              />
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Current State</h3>
              <div className="text-sm bg-muted p-3 rounded-md min-h-[calc(15rem_+_2.5rem)]"> 
                <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">
                  {JSON.stringify(nodeState, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col"> 
            <h3 className="font-semibold text-primary mb-2 flex-shrink-0">Activity Log</h3>
            <NodeActivityLog nodeId={selectedNodeId} />
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