
      
'use client';
import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '@/stores/simulationStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HistoryEntry, SourceTokenSummary, Token } from '@/lib/simulation/types';

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


const TokenInspectorModal: React.FC = () => {
  const { selectedToken, setSelectedToken, nodesConfig, globalActivityLog } = useSimulationStore(state => ({
    selectedToken: state.selectedToken,
    setSelectedToken: state.setSelectedToken,
    nodesConfig: state.nodesConfig,
    globalActivityLog: state.globalActivityLog,
  }));

  const [displayedHistory, setDisplayedHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (selectedToken && globalActivityLog && globalActivityLog.length > 0 && nodesConfig) {
      const collectedHistory: HistoryEntry[] = [];
      const allAncestralTokenIds = new Set<string>();
      const discoveryQueue: string[] = [selectedToken.id];
      const processedForAncestry = new Set<string>();

      while(discoveryQueue.length > 0) {
        const currentTokenIdToDiscover = discoveryQueue.shift()!;
        if(processedForAncestry.has(currentTokenIdToDiscover)) continue;
        processedForAncestry.add(currentTokenIdToDiscover);
        allAncestralTokenIds.add(currentTokenIdToDiscover);

        const createdEvent = globalActivityLog.find(
          log => log.action === 'CREATED' && log.details === `Token ${currentTokenIdToDiscover}`
        );
        if (createdEvent && createdEvent.sourceTokenSummaries) {
          createdEvent.sourceTokenSummaries.forEach(summary => {
            if (!processedForAncestry.has(summary.id)) {
              discoveryQueue.push(summary.id);
            }
          });
        }
      }
      
      globalActivityLog.forEach(logEntry => {
        let isRelevant = false;
        if (logEntry.details?.startsWith("Token ")) {
            const mentionedTokenIdInDetails = logEntry.details.substring(6).split(" ")[0]; 
            if (allAncestralTokenIds.has(mentionedTokenIdInDetails)) {
                isRelevant = true;
            }
        }
        if (!isRelevant && logEntry.sourceTokenIds) {
            if (logEntry.sourceTokenIds.some(id => allAncestralTokenIds.has(id))) {
                isRelevant = true;
            }
        }
        if (!isRelevant && logEntry.sourceTokenSummaries) {
            if (logEntry.sourceTokenSummaries.some(summary => allAncestralTokenIds.has(summary.id))) {
                isRelevant = true;
            }
        }

        if (isRelevant) {
          collectedHistory.push(logEntry);
        }
      });
      
      const uniqueEntriesMap = new Map<string, HistoryEntry>();
      
      if (selectedToken.history) { 
        selectedToken.history.forEach(entry => {
            const entryKey = `${entry.timestamp}-${entry.epochTimestamp}-${entry.sequence}-${entry.nodeId}-${entry.action}-${entry.details || 'no_details_key'}`;
            if (!uniqueEntriesMap.has(entryKey)) {
              uniqueEntriesMap.set(entryKey, entry);
            }
        });
      }

      collectedHistory.forEach(entry => {
        const entryKey = `${entry.timestamp}-${entry.epochTimestamp}-${entry.sequence}-${entry.nodeId}-${entry.action}-${entry.details || 'no_details_key'}`;
        if (!uniqueEntriesMap.has(entryKey)) {
          uniqueEntriesMap.set(entryKey, entry);
        }
      });
      
      const sortedHistory = Array.from(uniqueEntriesMap.values()).sort((a, b) => {
        if (b.timestamp !== a.timestamp) { // Sim time
          return b.timestamp - a.timestamp; // Descending (15s before 10s)
        }
        if (b.epochTimestamp !== a.epochTimestamp) { // Real-world event time
          return b.epochTimestamp - a.epochTimestamp; // Descending (later epoch is newer)
        }
        return b.sequence - a.sequence; // Descending (higher sequence is newer)
      });
      
      setDisplayedHistory(sortedHistory);

    } else {
      setDisplayedHistory([]);
    }
  }, [selectedToken, globalActivityLog, nodesConfig]);


  const isOpen = !!selectedToken;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedToken(null);
      setDisplayedHistory([]); 
    }
  };

  if (!selectedToken) {
    return null;
  }
  
  const getNodeDisplayName = (nodeId: string) => {
    if (!nodesConfig) return nodeId;
    if (nodeId === 'simulation_errors' || nodeId === 'simulation_system') return 'Simulation System';
    return nodesConfig[nodeId]?.displayName || nodeId;
  };

  const renderSourceTokenSummariesDisplay = (summaries?: SourceTokenSummary[]) => {
    if (!summaries || summaries.length === 0) return null;
    return (
      <div className="mt-1 pl-4 border-l-2 border-muted text-xs">
        <p className="font-semibold">Source Tokens:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {summaries.map(summary => (
            <li key={summary.id}>
              ID: {summary.id.substring(0,8)} (Created by: {getNodeDisplayName(summary.originNodeId)} at {formatSimTimestamp(summary.createdAt)}) - Value: {JSON.stringify(summary.originalValue)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col"> 
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Token Inspector: {selectedToken.id}</DialogTitle>
          <DialogDescription>
            Origin: {getNodeDisplayName(selectedToken.originNodeId)} at {formatSimTimestamp(selectedToken.createdAt)}s. Current Value: {JSON.stringify(selectedToken.value)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
           <div className="px-1">
            <h3 className="font-semibold text-primary mb-2 px-2">Full Event History (Newest First)</h3>
            {displayedHistory.length > 0 ? (
              <div className="h-96 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[120px] py-1 px-2 text-xs">Event Time</TableHead>
                      <TableHead className="w-[50px] py-1 px-2 text-xs">Seq</TableHead>
                      <TableHead className="w-[80px] py-1 px-2 text-xs">Sim Time</TableHead>
                      <TableHead className="w-[130px] py-1 px-2 text-xs">Node</TableHead>
                      <TableHead className="w-[180px] py-1 px-2 text-xs">Action</TableHead>
                      <TableHead className="py-1 px-2 text-xs">Details & Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedHistory.map((entry: HistoryEntry) => (
                      <TableRow key={`${entry.timestamp}-${entry.epochTimestamp}-${entry.sequence}-${entry.nodeId}-${entry.action}-${entry.details || 'no_details_key'}`}>
                        <TableCell className="py-0.5 px-2 text-xs align-top">{getEventTimeDisplay(entry)}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs align-top">{entry.sequence}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs align-top">{formatSimTimestamp(entry.timestamp)}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs truncate align-top" title={getNodeDisplayName(entry.nodeId)}>
                          {getNodeDisplayName(entry.nodeId)}
                        </TableCell>
                        <TableCell className="py-0.5 px-2 text-xs align-top whitespace-pre-wrap break-words">{entry.action}</TableCell>
                        <TableCell className="py-0.5 px-2 text-xs break-words align-top">
                          {entry.details || ''}
                          {entry.value !== undefined && entry.action !== 'CREATED' && !entry.action.startsWith('AGGREGATED_') && ` (Val: ${JSON.stringify(entry.value)})`}
                          {renderSourceTokenSummariesDisplay(entry.sourceTokenSummaries)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-md">No history available for this token or its ancestors. Ensure simulation has run.</p>
            )}
          </div>
        </div>
        
        <div className="pt-4 mt-auto border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TokenInspectorModal;

    