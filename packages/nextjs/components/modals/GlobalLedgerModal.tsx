'use client';
import React from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { HistoryEntry } from '@/lib/simulation/types';

const GlobalActivityTable: React.FC<{ logs: HistoryEntry[] }> = ({ logs }) => {
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  
  const getNodeDisplayName = (nodeId: string) => {
    return nodesConfig[nodeId]?.displayName || nodeId;
  };

  const getActionColor = (action: string): string => {
    if (action.includes('CREATED') || action.includes('EMITTED')) return 'bg-green-100 text-green-800';
    if (action.includes('AGGREGATED') || action.includes('CONSUMED')) return 'bg-blue-100 text-blue-800';
    if (action.includes('OUTPUT') || action.includes('GENERATED')) return 'bg-purple-100 text-purple-800';
    if (action.includes('ERROR')) return 'bg-red-100 text-red-800';
    if (action.includes('ARRIVED') || action.includes('ADDED')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="border rounded-md">
      <div className="bg-muted/50 px-3 py-2 text-xs font-medium border-b">
        <div className="flex gap-4">
          <div className="w-12 flex-shrink-0">Seq</div>
          <div className="w-16 flex-shrink-0">Time</div>
          <div className="w-32 flex-shrink-0">Node</div>
          <div className="w-40 flex-shrink-0">Action</div>
          <div className="w-16 flex-shrink-0">Value</div>
          <div className="flex-1 min-w-0">Details</div>
        </div>
      </div>
      <ScrollArea className="max-h-96">
        <div className="divide-y">
          {logs.slice(-100).reverse().map((log, index) => (
            <div key={`${log.sequence}-${index}`} className="px-3 py-2 text-xs hover:bg-muted/30">
              <div className="flex gap-4 items-start">
                <div className="w-12 flex-shrink-0 font-mono text-muted-foreground">
                  {log.sequence}
                </div>
                <div className="w-16 flex-shrink-0 font-mono text-muted-foreground">
                  {log.timestamp}s
                </div>
                <div className="w-32 flex-shrink-0 font-medium truncate" title={getNodeDisplayName(log.nodeId)}>
                  {getNodeDisplayName(log.nodeId)}
                </div>
                <div className="w-40 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)} block truncate`} title={log.action}>
                    {log.action}
                  </span>
                </div>
                <div className="w-16 flex-shrink-0 font-mono text-right">
                  {log.value !== undefined ? String(log.value) : '-'}
                </div>
                <div className="flex-1 min-w-0 text-muted-foreground">
                  <div className="break-words">
                    {log.details || '-'}
                  </div>
                  {log.sourceTokenIds && log.sourceTokenIds.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground/70">
                      Source: {log.sourceTokenIds.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const GlobalLedgerModal: React.FC = () => {
  const isGlobalLedgerOpen = useSimulationStore(state => state.isGlobalLedgerOpen);
  const toggleGlobalLedger = useSimulationStore(state => state.toggleGlobalLedger);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);

  const handleOpenChange = (open: boolean) => {
    if (!open && isGlobalLedgerOpen) {
      toggleGlobalLedger();
    } else if (open && !isGlobalLedgerOpen) {
      toggleGlobalLedger();
    }
  };

  return (
    <Dialog open={isGlobalLedgerOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Global Event Ledger</DialogTitle>
          <DialogDescription>
            A chronological log of all significant events across all nodes in the simulation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-2">
          {globalActivityLog && globalActivityLog.length > 0 ? (
            <GlobalActivityTable logs={globalActivityLog} />
          ) : (
            <p className="text-sm text-muted-foreground p-3 border rounded-md">
              No global activity logged yet. Start the simulation or load a scenario.
            </p>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border mt-auto flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalLedgerModal;