
      
'use client';
import React, {useEffect, useState} from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HistoryEntry, SourceTokenSummary } from '@/lib/simulation/types';

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

const GlobalLedgerModal: React.FC = () => {
  const {
    isGlobalLedgerOpen,
    toggleGlobalLedger,
    globalActivityLog,
    nodesConfig,
   } = useSimulationStore(state => ({
    isGlobalLedgerOpen: state.isGlobalLedgerOpen,
    toggleGlobalLedger: state.toggleGlobalLedger,
    globalActivityLog: state.globalActivityLog,
    nodesConfig: state.nodesConfig,
   }));

  const [displayedGlobalLog, setDisplayedGlobalLog] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (globalActivityLog) {
      const currentLog = globalActivityLog || [];
      const sortedLog = [...currentLog].sort((a, b) => {
        if (b.timestamp !== a.timestamp) { // Sim time
          return b.timestamp - a.timestamp; // Descending (15s before 10s)
        }
        if (b.epochTimestamp !== a.epochTimestamp) { // Real-world event time
          return b.epochTimestamp - a.epochTimestamp; // Descending (later epoch is newer)
        }
        return b.sequence - a.sequence; // Descending (higher sequence is newer)
      });
      setDisplayedGlobalLog(sortedLog);
    }
  }, [globalActivityLog]);


  const handleOpenChange = (open: boolean) => {
    if (!open && isGlobalLedgerOpen) {
      toggleGlobalLedger();
    } else if (open && !isGlobalLedgerOpen) {
      toggleGlobalLedger();
    }
  };
  
  const getNodeDisplayName = (nodeId: string) => {
    if (nodeId === 'simulation_errors' || nodeId === 'simulation_system') return 'Simulation System';
    return nodesConfig[nodeId]?.displayName || nodeId;
  };


  return (
    <Dialog open={isGlobalLedgerOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Global Event Ledger</DialogTitle>
          <DialogDescription>
            A chronological log of all significant events across all nodes in the simulation. (Newest First)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-2">
          {displayedGlobalLog && displayedGlobalLog.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[120px] py-1 px-2 text-xs">Event Time</TableHead>
                    <TableHead className="w-[50px] py-1 px-2 text-xs">Seq</TableHead>
                    <TableHead className="w-[80px] py-1 px-2 text-xs">Sim Time</TableHead>
                    <TableHead className="w-[150px] py-1 px-2 text-xs">Node</TableHead>
                    <TableHead className="w-[180px] py-1 px-2 text-xs">Action</TableHead>
                    <TableHead className="py-1 px-2 text-xs max-w-[200px] break-words">Value</TableHead>
                    <TableHead className="py-1 px-2 text-xs break-words">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedGlobalLog.map((log: HistoryEntry) => (
                    <TableRow key={`${log.timestamp}-${log.epochTimestamp}-${log.sequence}-${log.nodeId}-${log.action}-${log.details || 'no_details_key'}`}>
                      <TableCell className="py-0.5 px-2 text-xs">{getEventTimeDisplay(log)}</TableCell>
                      <TableCell className="py-0.5 px-2 text-xs">{log.sequence}</TableCell>
                      <TableCell className="py-0.5 px-2 text-xs">{formatSimTimestamp(log.timestamp)}</TableCell>
                      <TableCell className="py-0.5 px-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={getNodeDisplayName(log.nodeId)}>
                        {getNodeDisplayName(log.nodeId)}
                      </TableCell>
                      <TableCell className="py-0.5 px-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]" title={log.action}>
                        {log.action}
                      </TableCell>
                      <TableCell className="py-0.5 px-2 text-xs whitespace-pre-wrap break-words max-w-[200px]">
                        {log.value !== undefined ? JSON.stringify(log.value) : '-'}
                      </TableCell>
                      <TableCell className="py-0.5 px-2 text-xs whitespace-pre-wrap break-words">
                        {log.details || '-'}
                        {log.sourceTokenSummaries && log.sourceTokenSummaries.length > 0 && (
                            <div className="mt-1 pl-2 border-l-2 border-muted text-muted-foreground">
                                <p className="text-xs font-semibold">Source Tokens:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                {log.sourceTokenSummaries.map(summary => (
                                    <li key={summary.id} className="text-xs">
                                    ID: {summary.id.substring(0,8)}, Val: {JSON.stringify(summary.originalValue)}, Origin: {getNodeDisplayName(summary.originNodeId)} @ {formatSimTimestamp(summary.createdAt)}
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

    