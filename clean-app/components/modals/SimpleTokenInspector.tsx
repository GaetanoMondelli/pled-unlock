"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Token } from "@/lib/simulation/types";
import { useSimulationStore } from "@/stores/simulationStore";
import { SimpleTokenTracer, type TokenEvent } from "@/lib/simulation/simpleTokenTracer";
import { Clock, Hash, Activity } from "lucide-react";

const SimpleTokenInspector: React.FC = () => {
  const selectedToken = useSimulationStore(state => state.selectedToken);
  const setSelectedToken = useSimulationStore(state => state.setSelectedToken);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);

  const isOpen = !!selectedToken;

  // Trace token history using BFS
  const tokenTrace = useMemo(() => {
    if (!selectedToken || !globalActivityLog) return null;

    const tracer = new SimpleTokenTracer(globalActivityLog, nodesConfig);
    return tracer.traceToken(selectedToken.id);
  }, [selectedToken, globalActivityLog, nodesConfig]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedToken(null);
    }
  };

  const handleTokenClick = (tokenId: string) => {
    // Find token in activity log and open it
    const tokenEvent = globalActivityLog.find(log =>
      log.details?.includes(`Token ${tokenId}`)
    );

    if (tokenEvent) {
      const reconstructedToken: Token = {
        id: tokenId,
        value: tokenEvent.value || 0,
        createdAt: tokenEvent.timestamp,
        originNodeId: tokenEvent.nodeId,
        history: []
      };
      setSelectedToken(reconstructedToken);
    }
  };

  if (!selectedToken || !tokenTrace) {
    return null;
  }

  const getActionColor = (action: string): string => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("created")) return "text-green-700 bg-green-50";
    if (lowerAction.includes("emitted")) return "text-green-600 bg-green-50";
    if (lowerAction.includes("received")) return "text-blue-600 bg-blue-50";
    if (lowerAction.includes("processing") || lowerAction.includes("firing")) return "text-purple-600 bg-purple-50";
    if (lowerAction.includes("consumed") || lowerAction.includes("consuming")) return "text-orange-600 bg-orange-50";
    if (lowerAction.includes("dropped")) return "text-red-600 bg-red-50";
    if (lowerAction.includes("input")) return "text-indigo-600 bg-indigo-50";
    return "text-gray-600 bg-gray-50";
  };

  // Group events by depth for visualization
  const eventsByDepth = new Map<number, TokenEvent[]>();
  let maxDepth = 0;

  for (const event of tokenTrace.events) {
    if (!eventsByDepth.has(event.depth)) {
      eventsByDepth.set(event.depth, []);
    }
    eventsByDepth.get(event.depth)!.push(event);
    maxDepth = Math.max(maxDepth, event.depth);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Token Inspector: {selectedToken.id}
          </DialogTitle>
          <DialogDescription>
            Tracing token history through the simulation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Token Summary</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono font-medium">{selectedToken.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-semibold">{selectedToken.value}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{selectedToken.createdAt}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Origin:</span>
                  <span>{nodesConfig[selectedToken.originNodeId]?.displayName || selectedToken.originNodeId}</span>
                </div>
              </div>

              {tokenTrace.parentTokens.size > 0 && (
                <div className="pt-1 mt-1 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Parents:</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(tokenTrace.parentTokens).map(parentId => (
                        <button
                          key={parentId}
                          onClick={() => handleTokenClick(parentId)}
                          className="px-1.5 py-0.5 text-xs font-mono bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        >
                          {parentId}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token History */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Token History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {/* Show from deepest (sources) to target */}
                  {Array.from({ length: maxDepth + 1 }, (_, i) => maxDepth - i).map(depth => {
                    const depthEvents = eventsByDepth.get(depth) || [];
                    if (depthEvents.length === 0) return null;

                    const isTarget = depth === 0;
                    const isSource = depth === maxDepth;

                    return (
                      <div key={depth} className={`${isTarget ? 'border-l-4 border-blue-500 pl-3' : isSource ? 'border-l-4 border-green-500 pl-3' : 'border-l-2 border-gray-200 pl-3'} ${depth < maxDepth ? 'pb-2' : ''}`}>
                        {(isSource || isTarget) && (
                          <div className="flex items-center gap-2 mb-1">
                            {isSource && (
                              <Badge variant="outline" className="text-xs bg-green-50 h-5">Source</Badge>
                            )}
                            {isTarget && (
                              <Badge variant="default" className="text-xs h-5">Target</Badge>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          {depthEvents.map((event, idx) => {
                            // Extract token ID and formula from details
                            const tokenMatch = event.details?.match(/Token ([A-Za-z0-9]{8})/);
                            const eventTokenId = tokenMatch ? tokenMatch[1] : null;

                            // Clean up action display first (needed for conditionals below)
                            let cleanAction = event.action.replace('INPUT_', '').replace(/_/g, ' ').toLowerCase();
                            if (cleanAction === 'created') cleanAction = 'created';
                            else if (cleanAction === 'processing') cleanAction = 'aggregated';  // Shows formula created token
                            else if (cleanAction === 'token consumed') cleanAction = 'consumed';
                            else if (cleanAction === 'token received') cleanAction = 'received';
                            else if (cleanAction === 'token emitted') cleanAction = 'emitted';
                            else if (cleanAction === 'accumulating') cleanAction = 'buffering';

                            // Extract formula patterns more comprehensively
                            const sumFormulaMatch = event.details?.match(/sum\(([^)]+)\)\s*=\s*([^=]+)\s*=\s*(\d+(?:\.\d+)?)/i);
                            const averageFormulaMatch = event.details?.match(/average\(([^)]+)\)\s*=\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)\s*=\s*(\d+(?:\.\d+)?)/i);
                            const multiplyFormulaMatch = event.details?.match(/multiply\(([^)]+)\)\s*=\s*([^=]+)\s*=\s*(\d+(?:\.\d+)?)/i);
                            const simpleAggregationMatch = event.details?.match(/(sum|average|multiply|count|min|max)\(([^)]+)\)\s*=\s*(\d+(?:\.\d+)?)/i);
                            const divisionMatch = event.details?.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)\s*=\s*(\d+(?:\.\d+)?)/);
                            const multiplicationMatch = event.details?.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+)\s*=\s*(\d+(?:\.\d+)?)/);
                            const fromOutputMatch = event.details?.match(/from output (\d+) \(([^)]+)\)/);
                            const addedTokenMatch = event.details?.match(/Added Token (\w+) \((\d+(?:\.\d+)?)\)/);
                            const processingMatch = event.details?.match(/Token \w+ created:\s*(.+)/);

                            let displayFormula = null;
                            let additionalInfo = null;

                            if (sumFormulaMatch) {
                              // Full sum formula like "sum(4, 197, 4, 2, 180) = 4 + 197 + 4 + 2 + 180 = 387"
                              displayFormula = `Σ ${sumFormulaMatch[2]} = ${sumFormulaMatch[3]}`;
                            } else if (averageFormulaMatch) {
                              // Average formula like "average(1, 2, 3) = 6 / 3 = 2"
                              displayFormula = `avg: ${averageFormulaMatch[2]} ÷ ${averageFormulaMatch[3]} = ${averageFormulaMatch[4]}`;
                            } else if (multiplyFormulaMatch) {
                              // Multiply formula
                              displayFormula = `× ${multiplyFormulaMatch[2]} = ${multiplyFormulaMatch[3]}`;
                            } else if (processingMatch) {
                              // Processing event with formula
                              displayFormula = processingMatch[1];
                            } else if (simpleAggregationMatch) {
                              // Simple aggregation like "sum(1,2,3) = 6"
                              displayFormula = `${simpleAggregationMatch[1]}(${simpleAggregationMatch[2]}) = ${simpleAggregationMatch[3]}`;
                            } else if (divisionMatch) {
                              // Division like "387 / 2 = 193.5"
                              displayFormula = `${divisionMatch[1]} ÷ ${divisionMatch[2]} = ${divisionMatch[3]}`;
                            } else if (multiplicationMatch) {
                              // Multiplication like "10 × 2 = 20"
                              displayFormula = `${multiplicationMatch[1]} × ${multiplicationMatch[2]} = ${multiplicationMatch[3]}`;
                            } else if (fromOutputMatch) {
                              // Shows transformation formula from output
                              displayFormula = fromOutputMatch[2];
                            } else if (addedTokenMatch && cleanAction === 'buffering') {
                              // For accumulating, just show the token ID being added (value already shown)
                              additionalInfo = addedTokenMatch[1];
                              // Don't show the value again since it's already in the main display
                              event.value = undefined;
                            }

                            return (
                              <div
                                key={`${event.timestamp}-${idx}`}
                                className="flex items-start gap-1 text-xs"
                              >
                                <span className="font-mono text-muted-foreground w-10 flex-shrink-0">
                                  {event.timestamp}s
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium truncate max-w-[120px]" title={event.nodeName}>
                                      {event.nodeName}
                                    </span>
                                    {displayFormula ? (
                                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono text-xs">
                                        {displayFormula}
                                      </span>
                                    ) : additionalInfo ? (
                                      cleanAction === 'buffering' ? (
                                        // For buffering, just show the token being added inline
                                        <span className="text-xs text-gray-600">
                                          ← {additionalInfo}
                                        </span>
                                      ) : (
                                        <>
                                          <span className={`px-1.5 py-0.5 text-xs rounded ${getActionColor(cleanAction)}`}>
                                            {cleanAction}
                                          </span>
                                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono text-xs">
                                            {additionalInfo}
                                          </span>
                                        </>
                                      )
                                    ) : (
                                      <span className={`px-1.5 py-0.5 text-xs rounded ${getActionColor(cleanAction)}`}>
                                        {cleanAction}
                                      </span>
                                    )}
                                    {event.value !== undefined && (
                                      <span className="font-mono text-xs text-gray-600">
                                        → {event.value}
                                      </span>
                                    )}
                                    {eventTokenId && eventTokenId !== selectedToken.id && (
                                      <button
                                        onClick={() => handleTokenClick(eventTokenId)}
                                        className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                        title={`Open Token ${eventTokenId}`}
                                      >
                                        {eventTokenId}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

        </div>

        <div className="pt-4 mt-auto border-t flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleTokenInspector;