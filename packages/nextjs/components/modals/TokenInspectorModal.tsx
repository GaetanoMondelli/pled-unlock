'use client';
import React, { useMemo } from 'react';
import { useSimulationStore } from '@/stores/simulationStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Token, HistoryEntry } from '@/lib/simulation/types';

const TokenInspectorModal: React.FC = () => {
  const selectedToken = useSimulationStore(state => state.selectedToken);
  const setSelectedToken = useSimulationStore(state => state.setSelectedToken);
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);

  const isOpen = !!selectedToken;

  // Build token lineage tree
  const tokenLineage = useMemo(() => {
    if (!selectedToken || !globalActivityLog) return null;
    return buildTokenLineage(selectedToken, globalActivityLog);
  }, [selectedToken, globalActivityLog]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedToken(null);
    }
  };

  const handleTokenClick = (tokenId: string) => {
    // Find the token in the global activity log and reconstruct it
    const tokenEvents = globalActivityLog.filter(log => 
      log.sourceTokenIds?.includes(tokenId) || 
      log.details?.includes(tokenId) ||
      (log.action === 'CREATED' && log.details?.includes(tokenId)) ||
      (log.action.includes('AGGREGATED_') && log.details?.includes(tokenId))
    );
    
    if (tokenEvents.length > 0) {
      // Look for creation or aggregation event
      const createEvent = tokenEvents.find(e => e.action === 'CREATED' && e.details?.includes(tokenId));
      const aggregationEvent = tokenEvents.find(e => e.action.includes('AGGREGATED_') && e.details?.includes(tokenId));
      const sourceEvent = aggregationEvent || createEvent;
      
      if (sourceEvent) {
        const reconstructedToken: Token = {
          id: tokenId,
          value: sourceEvent.value,
          createdAt: sourceEvent.timestamp,
          originNodeId: sourceEvent.nodeId,
          history: tokenEvents.filter(e => e.details?.includes(tokenId))
        };
        setSelectedToken(reconstructedToken);
      }
    }
  };

  if (!selectedToken) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col"> 
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Token Inspector: {selectedToken.id}</DialogTitle>
          <DialogDescription>
            Value: {selectedToken.value} | Created: {selectedToken.createdAt}s | Origin: {nodesConfig[selectedToken.originNodeId]?.displayName || selectedToken.originNodeId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-6">
          {/* Token Basic Info */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Token Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Token ID</div>
                <div className="font-mono text-sm">{selectedToken.id}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Value</div>
                <div className="font-mono text-sm font-semibold">{selectedToken.value}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created At</div>
                <div className="font-mono text-sm">{selectedToken.createdAt}s</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Origin Node</div>
                <div className="text-sm">{nodesConfig[selectedToken.originNodeId]?.displayName || selectedToken.originNodeId}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Token Lineage */}
          {tokenLineage && (
            <div>
              <h3 className="font-semibold text-primary mb-3">Token Lineage</h3>
              <TokenLineageTree 
                lineage={tokenLineage} 
                onTokenClick={handleTokenClick}
                nodesConfig={nodesConfig}
                currentTokenId={selectedToken.id}
              />
            </div>
          )}

          <Separator />

          {/* Token History */}
          <div>
            <h3 className="font-semibold text-primary mb-3">Token Journey</h3>
            <TokenHistoryTable history={selectedToken.history} nodesConfig={nodesConfig} />
          </div>
        </div>
        
        <div className="pt-4 mt-auto border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to build complete token lineage
function buildTokenLineage(token: Token, globalLog: HistoryEntry[]) {
  const lineage = {
    token,
    immediateParents: [] as any[],
    allAncestors: [] as any[],
    children: [] as any[]
  };

  // Find the creation event for this token
  const creationEvent = globalLog.find(log => 
    log.action === 'CREATED' && log.details?.includes(token.id)
  );

  // Also look for aggregation events that might have created this token
  const aggregationEvent = globalLog.find(log => 
    log.action.includes('AGGREGATED_') && log.details?.includes(token.id)
  );

  // Use aggregation event if available, otherwise creation event
  const sourceEvent = aggregationEvent || creationEvent;
  
  if (sourceEvent?.sourceTokenSummaries) {
    lineage.immediateParents = sourceEvent.sourceTokenSummaries.map(summary => ({
      id: summary.id,
      value: summary.originalValue,
      createdAt: summary.createdAt,
      originNodeId: summary.originNodeId
    }));

    // Build complete ancestry tree by recursively finding ancestors
    const visited = new Set<string>();
    const findAllAncestors = (tokenId: string, level: number = 0): any[] => {
      if (visited.has(tokenId) || level > 10) return []; // Prevent infinite loops
      visited.add(tokenId);

      // Look for creation event
      const tokenCreationEvent = globalLog.find(log => 
        log.action === 'CREATED' && log.details?.includes(tokenId)
      );

      // Also look for aggregation event
      const tokenAggregationEvent = globalLog.find(log => 
        log.action.includes('AGGREGATED_') && log.details?.includes(tokenId)
      );

      // Use the event that has source information
      const tokenSourceEvent = tokenAggregationEvent || tokenCreationEvent;

      if (!tokenSourceEvent?.sourceTokenSummaries || tokenSourceEvent.sourceTokenSummaries.length === 0) {
        // This is a root token (from DataSource) - no source tokens
        return [{
          id: tokenId,
          value: tokenSourceEvent?.value || tokenCreationEvent?.value,
          createdAt: tokenSourceEvent?.timestamp || tokenCreationEvent?.timestamp,
          originNodeId: tokenSourceEvent?.nodeId || tokenCreationEvent?.nodeId,
          level,
          isRoot: true
        }];
      }

      // This token has parents, recurse
      const ancestors: any[] = [];
      tokenSourceEvent.sourceTokenSummaries.forEach(summary => {
        const parentAncestors = findAllAncestors(summary.id, level + 1);
        ancestors.push(...parentAncestors);
      });

      return ancestors;
    };

    // Find all ancestors for each immediate parent
    lineage.immediateParents.forEach(parent => {
      const ancestors = findAllAncestors(parent.id, 0);
      lineage.allAncestors.push(...ancestors);
    });

    // Remove duplicates and sort by level (roots first)
    const ancestorMap = new Map();
    lineage.allAncestors.forEach(ancestor => {
      if (!ancestorMap.has(ancestor.id) || ancestorMap.get(ancestor.id).level > ancestor.level) {
        ancestorMap.set(ancestor.id, ancestor);
      }
    });
    lineage.allAncestors = Array.from(ancestorMap.values()).sort((a, b) => b.level - a.level);
  }

  // Find child tokens (tokens created using this token)
  const childEvents = globalLog.filter(log => 
    log.sourceTokenIds?.includes(token.id) && log.action === 'CREATED'
  );
  
  lineage.children = childEvents.map(event => ({
    id: event.details?.match(/Token (\w+)/)?.[1] || 'unknown',
    value: event.value,
    createdAt: event.timestamp,
    originNodeId: event.nodeId
  }));

  return lineage;
}

// Token Lineage Tree Component
const TokenLineageTree: React.FC<{
  lineage: any;
  onTokenClick: (tokenId: string) => void;
  nodesConfig: any;
  currentTokenId: string;
}> = ({ lineage, onTokenClick, nodesConfig, currentTokenId }) => {
  // Group ancestors by level for better visualization
  const ancestorsByLevel = lineage.allAncestors.reduce((acc: any, ancestor: any) => {
    if (!acc[ancestor.level]) acc[ancestor.level] = [];
    acc[ancestor.level].push(ancestor);
    return acc;
  }, {});

  const maxLevel = Math.max(...Object.keys(ancestorsByLevel).map(Number), -1);

  return (
    <div className="space-y-6">
      {/* Complete Ancestry Chain */}
      {lineage.allAncestors.length > 0 && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3">
            Complete Token Ancestry (traced back to original sources):
          </div>
          <div className="space-y-3">
            {/* Show levels from root (highest level) to immediate parents (level 0) */}
            {Array.from({ length: maxLevel + 1 }, (_, i) => maxLevel - i).map(level => {
              const tokensAtLevel = ancestorsByLevel[level] || [];
              if (tokensAtLevel.length === 0) return null;

              return (
                <div key={level} className="flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-2">
                    {level === maxLevel ? 'Original Sources' : 
                     level === 0 ? 'Immediate Parents' : 
                     `Generation ${maxLevel - level}`}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {tokensAtLevel.map((ancestor: any) => (
                      <Button
                        key={ancestor.id}
                        variant={ancestor.isRoot ? "default" : "outline"}
                        size="sm"
                        className={`h-auto p-2 text-xs ${ancestor.isRoot ? 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300' : ''}`}
                        onClick={() => onTokenClick(ancestor.id)}
                      >
                        <div className="text-left">
                          <div className="font-mono">{ancestor.id}</div>
                          <div className="text-muted-foreground text-xs">
                            Value: {ancestor.value} | {nodesConfig[ancestor.originNodeId]?.displayName || ancestor.originNodeId}
                            {ancestor.isRoot && <div className="text-green-600 font-medium">🌱 Source</div>}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {level > 0 && (
                    <div className="text-center text-muted-foreground text-xs mt-1 mb-1">↓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Immediate Parents (if different from ancestry) */}
      {lineage.immediateParents.length > 0 && lineage.allAncestors.length > lineage.immediateParents.length && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Immediate Parents (direct contributors):
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {lineage.immediateParents.map((parent: any) => (
              <Button
                key={parent.id}
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs border-blue-300 bg-blue-50 hover:bg-blue-100"
                onClick={() => onTokenClick(parent.id)}
              >
                <div className="text-left">
                  <div className="font-mono">{parent.id}</div>
                  <div className="text-muted-foreground text-xs">
                    Value: {parent.value} | {nodesConfig[parent.originNodeId]?.displayName || parent.originNodeId}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Current Token */}
      <div className="flex justify-center">
        <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
          <div className="text-center">
            <div className="font-mono font-semibold text-lg">{currentTokenId}</div>
            <div className="text-sm text-muted-foreground">
              Value: {lineage.token.value} | 🎯 Current Token
            </div>
          </div>
        </div>
      </div>

      {/* Child Tokens */}
      {lineage.children.length > 0 && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Child Tokens (created from this token):
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {lineage.children.map((child: any) => (
              <Button
                key={child.id}
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs border-purple-300 bg-purple-50 hover:bg-purple-100"
                onClick={() => onTokenClick(child.id)}
              >
                <div className="text-left">
                  <div className="font-mono">{child.id}</div>
                  <div className="text-muted-foreground text-xs">
                    Value: {child.value} | {nodesConfig[child.originNodeId]?.displayName || child.originNodeId}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Token History Table Component
const TokenHistoryTable: React.FC<{
  history: HistoryEntry[];
  nodesConfig: any;
}> = ({ history, nodesConfig }) => {
  const getActionColor = (action: string): string => {
    if (action.includes('CREATED')) return 'bg-green-100 text-green-800';
    if (action.includes('CONSUMED') || action.includes('AGGREGATION')) return 'bg-blue-100 text-blue-800';
    if (action.includes('ARRIVED') || action.includes('ADDED')) return 'bg-orange-100 text-orange-800';
    if (action.includes('ERROR')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="border rounded-md">
      <div className="bg-muted/50 px-3 py-2 text-xs font-medium border-b">
        <div className="flex gap-4">
          <div className="w-16 flex-shrink-0">Time</div>
          <div className="w-32 flex-shrink-0">Node</div>
          <div className="w-40 flex-shrink-0">Action</div>
          <div className="w-16 flex-shrink-0">Value</div>
          <div className="flex-1 min-w-0">Details</div>
        </div>
      </div>
      <ScrollArea className="max-h-64">
        <div className="divide-y">
          {history.map((log, index) => (
            <div key={`${log.sequence}-${index}`} className="px-3 py-2 text-xs hover:bg-muted/30">
              <div className="flex gap-4 items-start">
                <div className="w-16 flex-shrink-0 font-mono text-muted-foreground">
                  {log.timestamp}s
                </div>
                <div className="w-32 flex-shrink-0 font-medium truncate" title={nodesConfig[log.nodeId]?.displayName || log.nodeId}>
                  {nodesConfig[log.nodeId]?.displayName || log.nodeId}
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

export default TokenInspectorModal;