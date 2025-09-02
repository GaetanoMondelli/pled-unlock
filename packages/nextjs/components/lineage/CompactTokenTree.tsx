"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TokenLineage } from "@/lib/simulation/tokenGenealogyEngine";
import { ChevronDown, ChevronRight, Info } from "lucide-react";

interface CompactTokenTreeProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  nodesConfig?: Record<string, { displayName: string }>;
  maxDepth?: number;
  showCompleteHistory?: boolean;
}

interface TreeNode {
  id: string;
  tokenId: string;
  value: number;
  nodeId: string;
  nodeName: string;
  operation?: {
    type: string;
    method?: string;
    formula?: string;
    calculation?: string;
  };
  children: TreeNode[];
  isRoot: boolean;
  depth: number;
  timestamp?: number;
}

const CompactTokenTree: React.FC<CompactTokenTreeProps> = ({
  lineage,
  onTokenClick,
  nodesConfig = {},
  maxDepth = 10,
  showCompleteHistory = true,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());

  // Build compact tree structure using DFS - organized by generation levels
  const buildCompactTree = (): TreeNode | null => {
    if (!lineage.targetToken) return null;

    // Create a comprehensive token map
    const tokenMap = new Map<string, any>();
    tokenMap.set(lineage.targetToken.id, {
      ...lineage.targetToken,
      isTarget: true,
      isRoot: false,
      operation: undefined,
    });
    
    // Add all ancestors with their metadata
    lineage.allAncestors.forEach(ancestor => {
      tokenMap.set(ancestor.id, ancestor);
    });

    // Add immediate parents with their metadata
    lineage.immediateParents.forEach(parent => {
      if (!tokenMap.has(parent.id)) {
        tokenMap.set(parent.id, parent);
      }
    });

    const visited = new Set<string>();
    
    const buildNode = (tokenId: string, depth: number = 0): TreeNode | null => {
      if (visited.has(tokenId) || depth > maxDepth) return null;
      visited.add(tokenId);

      const token = tokenMap.get(tokenId);
      if (!token) return null;

      const node: TreeNode = {
        id: `node-${tokenId}-${depth}`,
        tokenId: token.id,
        value: token.value,
        nodeId: token.originNodeId || 'unknown',
        nodeName: nodesConfig[token.originNodeId || '']?.displayName || token.originNodeId || 'Unknown',
        operation: token.operation,
        children: [],
        isRoot: token.isRoot || false,
        depth,
        timestamp: token.createdAt,
      };

      // Build children using DFS logic - prioritize immediate relationships
      const childTokenIds = new Set<string>();

      // For target token, use immediate parents first
      if (token.isTarget && lineage.immediateParents.length > 0) {
        lineage.immediateParents.forEach(parent => {
          childTokenIds.add(parent.id);
        });
      }
      // For other tokens, use their operation source tokens
      else if (token.operation?.sourceTokens) {
        token.operation.sourceTokens.forEach(source => {
          childTokenIds.add(source.tokenId);
        });
      }
      // Fallback: find tokens that this token depends on based on generation levels
      else if (!token.isRoot) {
        // Find ancestors with higher generation levels (closer to sources)
        const higherGenAncestors = lineage.allAncestors.filter(a => 
          a.generationLevel > (token.generationLevel || 0)
        );
        
        // Add a few of the most relevant ancestors
        higherGenAncestors.slice(0, 3).forEach(ancestor => {
          childTokenIds.add(ancestor.id);
        });
      }

      // Build child nodes recursively
      node.children = Array.from(childTokenIds)
        .map(childId => buildNode(childId, depth + 1))
        .filter(Boolean) as TreeNode[];

      visited.delete(tokenId); // Allow revisiting in different branches
      return node;
    };

    return buildNode(lineage.targetToken.id);
  };

  const treeRoot = buildCompactTree();

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const toggleDetails = (nodeId: string) => {
    setShowDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getNodeIcon = (node: TreeNode) => {
    if (node.depth === 0) return "🎯"; // Current token
    if (node.isRoot) return "🌱"; // Source token
    if (node.operation?.type === "aggregation") return "📊"; // Aggregation
    if (node.operation?.type === "transformation") return "⚙️"; // Transformation
    return "🔗"; // Generic processed token
  };

  const getNodeColor = (node: TreeNode) => {
    if (node.depth === 0) return "text-blue-600 bg-blue-50 border-blue-200";
    if (node.isRoot) return "text-green-600 bg-green-50 border-green-200";
    if (node.operation?.type === "aggregation") return "text-purple-600 bg-purple-50 border-purple-200";
    if (node.operation?.type === "transformation") return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  if (!treeRoot) {
    return <div className="text-center py-4 text-muted-foreground">No lineage data available</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Compact lineage summary */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-6 text-muted-foreground">
              <span>
                📊 Lineage: {lineage.immediateParents.length} parents, {lineage.allAncestors.length} ancestors, {lineage.allAncestors.filter(a => a.isRoot).length} sources
              </span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded mt-1 space-y-1">
              <div><strong>🎯 Target:</strong> {lineage.targetToken.id} (value: {lineage.targetToken.value})</div>
              <div><strong>📥 Immediate Parents:</strong> {lineage.immediateParents.map(p => `${p.id}(${p.value})`).join(', ') || 'None'}</div>
              <div><strong>🌱 Source Tokens:</strong> {lineage.allAncestors.filter(a => a.isRoot).map(a => `${a.id}(${a.value})`).join(', ') || 'None'}</div>
              {lineage.allAncestors.filter(a => !a.isRoot).length > 0 && (
                <div><strong>🔗 Intermediate:</strong> {lineage.allAncestors.filter(a => !a.isRoot).map(a => `${a.id}(${a.value})`).join(', ')}</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="font-mono text-sm">
          <CompactTreeNode
          node={treeRoot}
          expandedNodes={expandedNodes}
          showDetails={showDetails}
          onToggleExpanded={toggleExpanded}
          onToggleDetails={toggleDetails}
          onTokenClick={onTokenClick}
          getNodeIcon={getNodeIcon}
          getNodeColor={getNodeColor}
          isLast={true}
          prefix=""
        />
        </div>

        {/* Complete Event History - DFS traversal of ALL events */}
        {showCompleteHistory && (
          <div className="mt-6">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="font-semibold text-sm">Complete Event History (DFS Traversal)</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <CompleteEventHistory lineage={lineage} nodesConfig={nodesConfig} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

interface CompactTreeNodeProps {
  node: TreeNode;
  expandedNodes: Set<string>;
  showDetails: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onToggleDetails: (nodeId: string) => void;
  onTokenClick: (tokenId: string) => void;
  getNodeIcon: (node: TreeNode) => string;
  getNodeColor: (node: TreeNode) => string;
  isLast: boolean;
  prefix: string;
}

const CompactTreeNode: React.FC<CompactTreeNodeProps> = ({
  node,
  expandedNodes,
  showDetails,
  onToggleExpanded,
  onToggleDetails,
  onTokenClick,
  getNodeIcon,
  getNodeColor,
  isLast,
  prefix,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasDetails = showDetails.has(node.id);
  const hasChildren = node.children.length > 0;
  
  const currentPrefix = prefix + (isLast ? "└── " : "├── ");
  const childPrefix = prefix + (isLast ? "    " : "│   ");

  return (
    <div>
      {/* Node Line */}
      <div className="flex items-center gap-1 py-1 hover:bg-muted/30 rounded">
        {/* Tree Structure */}
        <span className="text-muted-foreground select-none">{currentPrefix}</span>
        
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={() => onToggleExpanded(node.id)}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        )}
        {!hasChildren && <div className="w-4" />}

        {/* Node Icon */}
        <span className="text-sm">{getNodeIcon(node)}</span>

        {/* Token ID (clickable) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-auto p-1 px-2 text-xs font-mono border ${getNodeColor(node)} hover:opacity-80`}
              onClick={() => onTokenClick(node.tokenId)}
            >
              {node.tokenId}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div><strong>Token:</strong> {node.tokenId}</div>
              <div><strong>Value:</strong> {node.value}</div>
              <div><strong>Node:</strong> {node.nodeName}</div>
              {node.timestamp && <div><strong>Created:</strong> {node.timestamp}s</div>}
              {node.operation && <div><strong>Operation:</strong> {node.operation.type}</div>}
              <div className="text-muted-foreground">Click to inspect</div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Value Badge */}
        <Badge variant="outline" className="text-xs h-5">
          {node.value}
        </Badge>

        {/* Node Name */}
        <span className="text-xs text-muted-foreground truncate max-w-24" title={node.nodeName}>
          {node.nodeName}
        </span>

        {/* Operation Info */}
        {node.operation && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs h-5 cursor-help">
                {node.operation.type}
                {node.operation.method && `:${node.operation.method}`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1 max-w-64">
                <div><strong>Operation:</strong> {node.operation.type}</div>
                {node.operation.method && <div><strong>Method:</strong> {node.operation.method}</div>}
                {node.operation.formula && <div><strong>Formula:</strong> {node.operation.formula}</div>}
                {node.operation.calculation && <div><strong>Calculation:</strong> {node.operation.calculation}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Details Button */}
        {node.operation && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={() => onToggleDetails(node.id)}
            title="Show/hide operation details"
          >
            <Info className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Operation Details */}
      {hasDetails && node.operation && (
        <div className={`${childPrefix.replace(/[├└]/, " ")} ml-8 mb-2`}>
          <div className="bg-muted/50 rounded p-3 text-xs space-y-2 border-l-2 border-muted-foreground/20">
            {/* Step-by-step process description */}
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground">Process Steps:</div>
              {node.operation.type === "aggregation" && (
                <div className="space-y-1 pl-2">
                  <div>1. 📥 Source tokens consumed from input buffer</div>
                  <div>2. 📊 Aggregation performed: {node.operation.method || "unknown method"}</div>
                  {node.operation.calculation && (
                    <div>3. 🧮 Calculation: <code className="bg-background px-1 rounded">{node.operation.calculation}</code></div>
                  )}
                  <div>4. 🎯 New token created with value {node.value}</div>
                  <div>5. 📤 Token placed in output buffer</div>
                </div>
              )}
              {node.operation.type === "transformation" && (
                <div className="space-y-1 pl-2">
                  <div>1. 📥 Input token received</div>
                  <div>2. ⚙️ Transformation applied: {node.operation.method || "unknown method"}</div>
                  {node.operation.formula && (
                    <div>3. 📐 Formula: <code className="bg-background px-1 rounded">{node.operation.formula}</code></div>
                  )}
                  <div>4. 🎯 Output token created with value {node.value}</div>
                  <div>5. 📤 Token forwarded to next node</div>
                </div>
              )}
              {node.isRoot && (
                <div className="space-y-1 pl-2">
                  <div>1. 🌱 Original token generated by data source</div>
                  <div>2. 📊 Initial value: {node.value}</div>
                  <div>3. 📤 Token emitted to processing pipeline</div>
                </div>
              )}
            </div>
            
            {/* Technical details */}
            <div className="border-t border-muted-foreground/10 pt-2 space-y-1">
              <div className="font-medium text-muted-foreground">Technical Details:</div>
              <div><strong>Operation:</strong> {node.operation.type}</div>
              {node.operation.method && <div><strong>Method:</strong> {node.operation.method}</div>}
              {node.operation.formula && (
                <div><strong>Formula:</strong> <code className="bg-background px-1 rounded">{node.operation.formula}</code></div>
              )}
              {node.operation.calculation && (
                <div><strong>Calculation:</strong> <code className="bg-background px-1 rounded">{node.operation.calculation}</code></div>
              )}
              <div><strong>Node:</strong> {node.nodeName} ({node.nodeId})</div>
              {node.timestamp && <div><strong>Timestamp:</strong> {node.timestamp}s</div>}
            </div>
          </div>
        </div>
      )}

      {/* Child Nodes */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, index) => (
            <CompactTreeNode
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              showDetails={showDetails}
              onToggleExpanded={onToggleExpanded}
              onToggleDetails={onToggleDetails}
              onTokenClick={onTokenClick}
              getNodeIcon={getNodeIcon}
              getNodeColor={getNodeColor}
              isLast={index === node.children.length - 1}
              prefix={childPrefix}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Complete Event History Component - organized by DFS tree structure
const CompleteEventHistory: React.FC<{
  lineage: TokenLineage;
  nodesConfig: Record<string, { displayName: string }>;
}> = ({ lineage, nodesConfig }) => {
  const [viewMode, setViewMode] = useState<"chronological" | "by-token" | "dfs-tree">("dfs-tree");
  
  // Organize events by DFS tree structure
  const organizedEvents = React.useMemo(() => {
    const tokenEvents = new Map<string, Array<{ event: any; isTarget: boolean; isRoot: boolean }>>();
    
    // Add target token history
    if (lineage.targetToken.history) {
      tokenEvents.set(lineage.targetToken.id, 
        lineage.targetToken.history.map(event => ({ event, isTarget: true, isRoot: false }))
      );
    }

    // Add all ancestor histories
    lineage.allAncestors.forEach(ancestor => {
      if (ancestor.completeHistory) {
        tokenEvents.set(ancestor.id, 
          ancestor.completeHistory.map(event => ({ event, isTarget: false, isRoot: ancestor.isRoot }))
        );
      }
    });

    // Create chronological view
    const chronological: Array<{ tokenId: string; event: any; isTarget: boolean; isRoot: boolean }> = [];
    tokenEvents.forEach((events, tokenId) => {
      events.forEach(item => {
        chronological.push({ tokenId, ...item });
      });
    });
    chronological.sort((a, b) => a.event.timestamp - b.event.timestamp);

    return { tokenEvents, chronological };
  }, [lineage]);

  const getEventColor = (event: any, isTarget: boolean, isRoot: boolean) => {
    if (isTarget) return "bg-blue-50 text-blue-700 border-blue-200";
    if (isRoot) return "bg-green-50 text-green-700 border-green-200";
    if (event.action.includes("AGGREGATED")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (event.action.includes("CREATED")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (event.action.includes("CONSUMED")) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const renderCompactEvent = (item: { tokenId: string; event: any; isTarget: boolean; isRoot: boolean }, showToken = true) => (
    <div className={`p-1.5 rounded text-xs border ${getEventColor(item.event, item.isTarget, item.isRoot)} mb-1`}>
      <div className="flex items-center gap-1.5">
        {showToken && (
          <span className="font-mono text-xs">
            {item.isTarget ? "🎯" : item.isRoot ? "🌱" : "🔗"} {item.tokenId}
          </span>
        )}
        <Badge variant="outline" className="text-xs h-4 px-1">
          {item.event.timestamp}s
        </Badge>
        <span className="font-medium text-xs">{item.event.action}</span>
        {item.event.value !== undefined && (
          <Badge variant="secondary" className="text-xs h-4 px-1">
            {item.event.value}
          </Badge>
        )}
      </div>
      {item.event.details && (
        <div className="text-muted-foreground text-xs mt-1 truncate" title={item.event.details}>
          {item.event.details}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* View Mode Selector */}
      <div className="flex gap-1">
        <Button
          variant={viewMode === "dfs-tree" ? "default" : "outline"}
          size="sm"
          className="text-xs h-6"
          onClick={() => setViewMode("dfs-tree")}
        >
          DFS Tree
        </Button>
        <Button
          variant={viewMode === "by-token" ? "default" : "outline"}
          size="sm"
          className="text-xs h-6"
          onClick={() => setViewMode("by-token")}
        >
          By Token
        </Button>
        <Button
          variant={viewMode === "chronological" ? "default" : "outline"}
          size="sm"
          className="text-xs h-6"
          onClick={() => setViewMode("chronological")}
        >
          Timeline
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto border rounded p-2 bg-muted/10">
        {viewMode === "chronological" && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground mb-2">
              {organizedEvents.chronological.length} events in chronological order
            </div>
            {organizedEvents.chronological.map((item, index) => (
              <div key={`${item.tokenId}-${item.event.sequence}-${index}`}>
                {renderCompactEvent(item)}
              </div>
            ))}
          </div>
        )}

        {viewMode === "by-token" && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              Events grouped by token ({organizedEvents.tokenEvents.size} tokens)
            </div>
            {Array.from(organizedEvents.tokenEvents.entries()).map(([tokenId, events]) => {
              const isTarget = tokenId === lineage.targetToken.id;
              const ancestor = lineage.allAncestors.find(a => a.id === tokenId);
              const isRoot = ancestor?.isRoot || false;
              
              return (
                <Collapsible key={tokenId}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-6">
                      <span className="flex items-center gap-1">
                        {isTarget ? "🎯" : isRoot ? "🌱" : "🔗"} {tokenId}
                        <Badge variant="outline" className="text-xs h-4">
                          {events.length} events
                        </Badge>
                      </span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 mt-1">
                    {events.map((item, index) => (
                      <div key={index}>
                        {renderCompactEvent({ tokenId, ...item }, false)}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {viewMode === "dfs-tree" && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              Events organized by DFS tree structure (target → ancestors)
            </div>
            
            {/* Target Token Events */}
            <div className="border-l-2 border-blue-300 pl-2">
              <div className="text-xs font-medium text-blue-700 mb-1">🎯 Target Token: {lineage.targetToken.id}</div>
              {organizedEvents.tokenEvents.get(lineage.targetToken.id)?.map((item, index) => (
                <div key={index}>
                  {renderCompactEvent({ tokenId: lineage.targetToken.id, ...item }, false)}
                </div>
              )) || <div className="text-xs text-muted-foreground">No events</div>}
            </div>

            {/* Immediate Parents */}
            {lineage.immediateParents.length > 0 && (
              <div className="border-l-2 border-orange-300 pl-2">
                <div className="text-xs font-medium text-orange-700 mb-1">📥 Immediate Parents</div>
                {lineage.immediateParents.map(parent => {
                  const events = organizedEvents.tokenEvents.get(parent.id) || [];
                  return (
                    <Collapsible key={parent.id}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-5 p-1">
                          🔗 {parent.id} ({events.length} events)
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-2">
                        {events.map((item, index) => (
                          <div key={index}>
                            {renderCompactEvent({ tokenId: parent.id, ...item }, false)}
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {/* Root Ancestors */}
            {lineage.allAncestors.filter(a => a.isRoot).length > 0 && (
              <div className="border-l-2 border-green-300 pl-2">
                <div className="text-xs font-medium text-green-700 mb-1">🌱 Source Tokens</div>
                {lineage.allAncestors.filter(a => a.isRoot).map(ancestor => {
                  const events = organizedEvents.tokenEvents.get(ancestor.id) || [];
                  return (
                    <Collapsible key={ancestor.id}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-5 p-1">
                          🌱 {ancestor.id} ({events.length} events)
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-2">
                        {events.map((item, index) => (
                          <div key={index}>
                            {renderCompactEvent({ tokenId: ancestor.id, ...item }, false)}
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {organizedEvents.chronological.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No event history available
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactTokenTree;