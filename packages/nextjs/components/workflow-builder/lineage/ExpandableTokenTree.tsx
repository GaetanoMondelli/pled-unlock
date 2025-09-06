"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AncestorToken, OperationInfo, TokenLineage } from "@/lib/simulation/tokenGenealogyEngine";
import { BarChart3, ChevronDown, ChevronRight, Cog, History, Target, TreePine } from "lucide-react";

/**
 * Props for the ExpandableTokenTree component
 */
export interface ExpandableTokenTreeProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  onExportRequest?: (format: ExportFormat) => void;
  viewMode?: "tree" | "compact" | "detailed";
  showSourceContributions?: boolean;
  initialExpandLevel?: number;
  nodesConfig?: Record<string, { displayName: string }>;
}

/**
 * Export format options
 */
export type ExportFormat = "json" | "csv" | "mermaid" | "markdown";

/**
 * Interactive tree node state
 */
interface InteractiveTreeNode {
  id: string;
  tokenId: string;
  label: string;
  value: any;
  nodeType: "datasource" | "queue" | "processor" | "sink" | "current";
  children: InteractiveTreeNode[];
  operation?: OperationInfo;
  isExpanded: boolean;
  isExpandable: boolean;
  depth: number;
  generationLevel: number;
  isRoot: boolean;
  contributionPath: string[];
  completeHistory: any[];
}

/**
 * Tree node visual style configuration
 */
interface TreeNodeStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Main expandable token tree component
 */
export const ExpandableTokenTree: React.FC<ExpandableTokenTreeProps> = ({
  lineage,
  onTokenClick,
  onExportRequest,
  viewMode = "tree",
  showSourceContributions = false,
  initialExpandLevel = 2,
  nodesConfig = {},
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showOperationDetails, setShowOperationDetails] = useState<Set<string>>(new Set());

  // Build tree structure from lineage
  const treeStructure = useMemo(() => {
    return buildTreeFromLineage(lineage, initialExpandLevel);
  }, [lineage, initialExpandLevel]);

  // Initialize expanded nodes based on initial expand level
  React.useEffect(() => {
    const initialExpanded = new Set<string>();
    const addExpandedNodes = (node: InteractiveTreeNode, currentLevel: number) => {
      if (currentLevel < initialExpandLevel) {
        initialExpanded.add(node.id);
        node.children.forEach(child => addExpandedNodes(child, currentLevel + 1));
      }
    };

    if (treeStructure) {
      addExpandedNodes(treeStructure, 0);
    }

    setExpandedNodes(initialExpanded);
  }, [treeStructure, initialExpandLevel]);

  const toggleNodeExpansion = (nodeId: string) => {
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

  const toggleOperationDetails = (nodeId: string) => {
    setShowOperationDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getNodeStyle = (node: InteractiveTreeNode): TreeNodeStyle => {
    if (node.nodeType === "current") {
      return {
        backgroundColor: "bg-primary/10",
        borderColor: "border-primary",
        textColor: "text-primary",
        icon: <Target className="w-4 h-4" />,
        badgeVariant: "default",
      };
    }

    if (node.isRoot) {
      return {
        backgroundColor: "bg-green-50",
        borderColor: "border-green-300",
        textColor: "text-green-800",
        icon: <TreePine className="w-4 h-4" />,
        badgeVariant: "outline",
      };
    }

    if (node.operation?.type === "transformation") {
      return {
        backgroundColor: "bg-blue-50",
        borderColor: "border-blue-300",
        textColor: "text-blue-800",
        icon: <Cog className="w-4 h-4" />,
        badgeVariant: "secondary",
      };
    }

    if (node.operation?.type === "aggregation") {
      return {
        backgroundColor: "bg-purple-50",
        borderColor: "border-purple-300",
        textColor: "text-purple-800",
        icon: <BarChart3 className="w-4 h-4" />,
        badgeVariant: "outline",
      };
    }

    return {
      backgroundColor: "bg-gray-50",
      borderColor: "border-gray-300",
      textColor: "text-gray-800",
      icon: <div className="w-4 h-4 rounded-full bg-gray-400" />,
      badgeVariant: "outline",
    };
  };

  if (!treeStructure) {
    return <div className="text-center py-8 text-muted-foreground">No lineage data available for this token.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Tree Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allNodeIds = getAllNodeIds(treeStructure);
              setExpandedNodes(new Set(allNodeIds));
            }}
          >
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpandedNodes(new Set())}>
            Collapse All
          </Button>
        </div>

        {onExportRequest && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExportRequest("json")}>
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExportRequest("csv")}>
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Tree Visualization */}
      <div className="border rounded-lg p-4 bg-background">
        <TokenTreeNode
          node={treeStructure}
          depth={0}
          isLast={true}
          parentLines={[]}
          expandedNodes={expandedNodes}
          showOperationDetails={showOperationDetails}
          onToggleExpand={toggleNodeExpansion}
          onToggleOperationDetails={toggleOperationDetails}
          onNodeClick={onTokenClick}
          getNodeStyle={getNodeStyle}
          nodesConfig={nodesConfig}
          showSourceContributions={showSourceContributions}
          viewMode={viewMode}
        />
      </div>

      {/* Source Contributions Summary */}
      {showSourceContributions && lineage.sourceContributions.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TreePine className="w-4 h-4" />
            Source Contributions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lineage.sourceContributions.map((contribution, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                <div className="flex items-center gap-2">
                  <TreePine className="w-3 h-3 text-green-600" />
                  <span className="font-mono text-sm">{contribution.sourceTokenId}</span>
                  <span className="text-xs text-muted-foreground">
                    ({nodesConfig[contribution.sourceNodeId]?.displayName || contribution.sourceNodeId})
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {(contribution.proportionalContribution * 100).toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Individual tree node component
 */
interface TokenTreeNodeProps {
  node: InteractiveTreeNode;
  depth: number;
  isLast: boolean;
  parentLines: boolean[];
  expandedNodes: Set<string>;
  showOperationDetails: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onToggleOperationDetails: (nodeId: string) => void;
  onNodeClick: (tokenId: string) => void;
  getNodeStyle: (node: InteractiveTreeNode) => TreeNodeStyle;
  nodesConfig: Record<string, { displayName: string }>;
  showSourceContributions: boolean;
  viewMode: "tree" | "compact" | "detailed";
}

const TokenTreeNode: React.FC<TokenTreeNodeProps> = ({
  node,
  depth,
  isLast,
  parentLines,
  expandedNodes,
  showOperationDetails,
  onToggleExpand,
  onToggleOperationDetails,
  onNodeClick,
  getNodeStyle,
  nodesConfig,
  showSourceContributions,
  viewMode,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const showDetails = showOperationDetails.has(node.id);
  const style = getNodeStyle(node);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      {/* Connection Lines */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {parentLines.map((hasLine, index) => (
            <div key={index} className="w-6 flex justify-center">
              {hasLine && <div className="w-px bg-border" />}
            </div>
          ))}
          <div className="w-6 flex justify-center">
            <div className="w-px bg-border" style={{ height: "1.5rem" }} />
          </div>
          <div className="w-6 h-6 flex items-center">
            <div className={`h-px bg-border flex-1 ${isLast ? "" : "border-b"}`} />
          </div>
        </div>
      )}

      {/* Node Content */}
      <div className={`flex items-start gap-2 ${depth > 0 ? "ml-12" : ""}`}>
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 flex-shrink-0"
            onClick={() => onToggleExpand(node.id)}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </Button>
        )}

        {!hasChildren && <div className="w-6" />}

        {/* Node Card */}
        <div className={`flex-1 border-2 rounded-lg p-3 ${style.backgroundColor} ${style.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {style.icon}
              <Button
                variant="ghost"
                className={`font-mono text-sm font-semibold ${style.textColor} p-0 h-auto hover:underline`}
                onClick={() => onNodeClick(node.tokenId)}
              >
                {node.tokenId}
              </Button>
              <Badge variant={style.badgeVariant} className="text-xs">
                {node.value}
              </Badge>
              {node.isRoot && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                  🌱 Source
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {node.operation && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onToggleOperationDetails(node.id)}
                >
                  <History className="w-3 h-3 mr-1" />
                  {showDetails ? "Hide" : "Show"} Details
                </Button>
              )}
            </div>
          </div>

          {/* Node Details */}
          {viewMode !== "compact" && (
            <div className="mt-2 text-xs text-muted-foreground">
              <div>Origin: {nodesConfig[node.tokenId]?.displayName || "Unknown"}</div>
              <div>Generation: {node.generationLevel}</div>
            </div>
          )}

          {/* Operation Details */}
          {showDetails && node.operation && (
            <Collapsible open={showDetails}>
              <CollapsibleContent className="mt-3 p-2 bg-background/50 rounded border">
                <OperationDetails operation={node.operation} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Child Nodes */}
      {hasChildren && isExpanded && (
        <div className="mt-2">
          {node.children.map((child, index) => (
            <TokenTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              parentLines={[...parentLines, !isLast]}
              expandedNodes={expandedNodes}
              showOperationDetails={showOperationDetails}
              onToggleExpand={onToggleExpand}
              onToggleOperationDetails={onToggleOperationDetails}
              onNodeClick={onNodeClick}
              getNodeStyle={getNodeStyle}
              nodesConfig={nodesConfig}
              showSourceContributions={showSourceContributions}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Operation details component
 */
const OperationDetails: React.FC<{ operation: OperationInfo }> = ({ operation }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {operation.type}
        </Badge>
        {operation.method && (
          <Badge variant="secondary" className="text-xs">
            {operation.method}
          </Badge>
        )}
      </div>

      {operation.formula && (
        <div>
          <div className="text-xs font-medium">Formula:</div>
          <div className="font-mono text-xs bg-background p-1 rounded">{operation.formula}</div>
        </div>
      )}

      {operation.calculation && (
        <div>
          <div className="text-xs font-medium">Calculation:</div>
          <div className="font-mono text-xs bg-background p-1 rounded">{operation.calculation}</div>
        </div>
      )}

      {operation.sourceTokens && operation.sourceTokens.length > 0 && (
        <div>
          <div className="text-xs font-medium">Source Tokens:</div>
          <div className="space-y-1">
            {operation.sourceTokens.map((source, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className="font-mono">{source.tokenId}</span>
                <Badge variant="outline" className="text-xs">
                  {source.value}
                </Badge>
                <span className="text-muted-foreground">({source.originNodeId})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Build tree structure from lineage data
 */
function buildTreeFromLineage(lineage: TokenLineage, initialExpandLevel: number): InteractiveTreeNode | null {
  if (!lineage.targetToken) {
    return null;
  }

  // Create the target token as root of the tree
  const rootNode: InteractiveTreeNode = {
    id: `tree-${lineage.targetToken.id}`,
    tokenId: lineage.targetToken.id,
    label: lineage.targetToken.id,
    value: lineage.targetToken.value,
    nodeType: "current",
    children: [],
    isExpanded: true,
    isExpandable: lineage.immediateParents.length > 0,
    depth: 0,
    generationLevel: 0,
    isRoot: false,
    contributionPath: [lineage.targetToken.id],
    completeHistory: lineage.targetToken.history || [],
  };

  // Build ancestry tree recursively
  const ancestorMap = new Map<string, AncestorToken>();
  lineage.allAncestors.forEach(ancestor => {
    ancestorMap.set(ancestor.id, ancestor);
  });

  // Build children from immediate parents
  rootNode.children = lineage.immediateParents
    .map(parent => buildAncestorNode(parent.id, ancestorMap, 1, [lineage.targetToken.id, parent.id]))
    .filter(Boolean) as InteractiveTreeNode[];

  return rootNode;
}

/**
 * Build ancestor node recursively
 */
function buildAncestorNode(
  tokenId: string,
  ancestorMap: Map<string, AncestorToken>,
  depth: number,
  contributionPath: string[],
): InteractiveTreeNode | null {
  const ancestor = ancestorMap.get(tokenId);
  if (!ancestor) {
    return null;
  }

  const node: InteractiveTreeNode = {
    id: `tree-${tokenId}-${depth}`,
    tokenId: ancestor.id,
    label: ancestor.id,
    value: ancestor.value,
    nodeType: ancestor.isRoot
      ? "datasource"
      : ancestor.operation?.type === "transformation"
        ? "processor"
        : ancestor.operation?.type === "aggregation"
          ? "queue"
          : "sink",
    children: [],
    operation: ancestor.operation,
    isExpanded: false,
    isExpandable: !ancestor.isRoot,
    depth,
    generationLevel: ancestor.generationLevel,
    isRoot: ancestor.isRoot,
    contributionPath,
    completeHistory: ancestor.completeHistory,
  };

  // For non-root tokens, we would recursively build their parents
  // This is simplified for now to avoid infinite recursion
  if (!ancestor.isRoot && ancestor.operation?.sourceTokens) {
    node.children = ancestor.operation.sourceTokens
      .map(source => buildAncestorNode(source.tokenId, ancestorMap, depth + 1, [...contributionPath, source.tokenId]))
      .filter(Boolean) as InteractiveTreeNode[];

    node.isExpandable = node.children.length > 0;
  }

  return node;
}

/**
 * Get all node IDs from tree structure
 */
function getAllNodeIds(node: InteractiveTreeNode): string[] {
  const ids = [node.id];
  node.children.forEach(child => {
    ids.push(...getAllNodeIds(child));
  });
  return ids;
}

export default ExpandableTokenTree;
