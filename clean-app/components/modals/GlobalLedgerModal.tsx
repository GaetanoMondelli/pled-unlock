"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HistoryEntry, Token } from "@/lib/simulation/types";
import { useSimulationStore } from "@/stores/simulationStore";
import { ActivityColors } from "@/lib/simulation/activityMessages";

const GlobalActivityTable: React.FC<{ logs: HistoryEntry[] }> = ({ logs }) => {
  const nodesConfig = useSimulationStore(state => state.nodesConfig);
  const setSelectedToken = useSimulationStore(state => state.setSelectedToken);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);

  const handleTokenClick = (tokenId: string) => {
    console.log(`🔍 [TOKEN CLICK] Inspecting token: ${tokenId}`);

    // Find the token in the global activity log and reconstruct it
    const tokenEvents = globalActivityLog.filter(
      log =>
        log.sourceTokenIds?.includes(tokenId) ||
        log.details?.includes(`Token ${tokenId}`) ||
        log.details?.includes(tokenId)
    );

    console.log(`🔍 [TOKEN CLICK] Found ${tokenEvents.length} events for token ${tokenId}`);

    if (tokenEvents.length > 0) {
      // Look for token creation events (token_emitted, processing, firing)
      const createEvent = tokenEvents.find(e =>
        (e.action === "token_emitted" ||
         e.action === "processing" ||
         e.action === "firing") &&
        e.details?.includes(tokenId)
      );

      if (createEvent) {
        console.log(`🔍 [TOKEN CLICK] Found creation event:`, createEvent);

        const reconstructedToken: Token = {
          id: tokenId,
          value: createEvent.value !== undefined ? createEvent.value : 0,
          createdAt: createEvent.timestamp,
          originNodeId: createEvent.nodeId,
          history: tokenEvents,
        };

        console.log(`🔍 [TOKEN CLICK] Setting selected token:`, reconstructedToken);
        setSelectedToken(reconstructedToken);
      } else {
        // If no creation event found, try to reconstruct from any event
        const firstEvent = tokenEvents[0];
        if (firstEvent) {
          console.log(`🔍 [TOKEN CLICK] Using first event as fallback:`, firstEvent);

          const reconstructedToken: Token = {
            id: tokenId,
            value: firstEvent.value !== undefined ? firstEvent.value : 0,
            createdAt: firstEvent.timestamp,
            originNodeId: firstEvent.nodeId,
            history: tokenEvents,
          };

          setSelectedToken(reconstructedToken);
        } else {
          console.warn(`🔍 [TOKEN CLICK] Could not reconstruct token ${tokenId}`);
        }
      }
    } else {
      console.warn(`🔍 [TOKEN CLICK] No events found for token ${tokenId}`);
    }
  };

  const renderTokenLinks = (text: string) => {
    if (!text) return text;

    // Match token IDs in the format "Token ABC123XY" - more restrictive to avoid false matches
    const tokenRegex = /Token ([A-Za-z0-9]{8})/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      const tokenId = match[1];

      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add clickable token link
      parts.push(
        <button
          key={`${tokenId}-${match.index}`}
          onClick={() => handleTokenClick(tokenId)}
          className="text-primary hover:text-primary/80 underline font-mono text-xs"
          title={`Click to inspect token ${tokenId}`}
        >
          {match[0]}
        </button>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 1 ? parts : text;
  };

  const getNodeDisplayName = (nodeId: string) => {
    return nodesConfig[nodeId]?.displayName || nodeId;
  };

  const getActionColor = (action: string): string => {
    return ActivityColors.getActionColor(action);
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
      <div className="max-h-96 overflow-y-auto">
        <div className="divide-y">
          {logs
            .slice(-100)
            .reverse()
            .map((log, index) => (
              <div key={`${log.sequence}-${index}`} className="px-3 py-2 text-xs hover:bg-muted/30">
                <div className="flex gap-4 items-start">
                  <div className="w-12 flex-shrink-0 font-mono text-muted-foreground">{log.sequence}</div>
                  <div className="w-16 flex-shrink-0 font-mono text-muted-foreground">{log.timestamp}s</div>
                  <div className="w-32 flex-shrink-0 font-medium truncate" title={getNodeDisplayName(log.nodeId)}>
                    {getNodeDisplayName(log.nodeId)}
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)} block truncate no-underline`}
                      title={log.action}
                    >
                      {log.action}
                    </span>
                  </div>
                  <div className="w-16 flex-shrink-0 font-mono text-right">
                    {log.value !== undefined ? String(log.value) : "-"}
                  </div>
                  <div className="flex-1 min-w-0 text-muted-foreground">
                    <div className="break-words">{renderTokenLinks(log.details || "-")}</div>
                    {log.sourceTokenIds && log.sourceTokenIds.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground/70">
                        Source:{" "}
                        {log.sourceTokenIds.map((tokenId, idx) => (
                          <span key={tokenId}>
                            {idx > 0 && ", "}
                            <button
                              onClick={() => handleTokenClick(tokenId)}
                              className="text-primary hover:text-primary/80 underline font-mono"
                              title={`Click to inspect token ${tokenId}`}
                            >
                              {tokenId}
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const GlobalLedgerModal: React.FC = () => {
  const isGlobalLedgerOpen = useSimulationStore(state => state.isGlobalLedgerOpen);
  const toggleGlobalLedger = useSimulationStore(state => state.toggleGlobalLedger);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);

  // Debug logging
  React.useEffect(() => {
    console.log(`📊 [GLOBAL LEDGER] Activity log updated: ${globalActivityLog.length} entries`);
  }, [globalActivityLog]);

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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalLedgerModal;
