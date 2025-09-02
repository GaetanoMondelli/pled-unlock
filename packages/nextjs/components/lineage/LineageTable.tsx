"use client";

import React, { useMemo, useState } from "react";
import { TokenLineage, TokenLineageNode } from "./types";
import { ChevronDown, ChevronRight, ChevronUp, Filter, Search, Settings } from "lucide-react";
import { Button } from "~~/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { Input } from "~~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/ui/table";

type SortField = "generation" | "timestamp" | "value" | "operation";
type SortDirection = "asc" | "desc";
type GroupBy = "none" | "generation" | "operation" | "sourceNode";

interface ColumnVisibility {
  generation: boolean;
  timestamp: boolean;
  value: boolean;
  operation: boolean;
  sourceNode: boolean;
  metadata: boolean;
}

interface LineageTableProps {
  lineage: TokenLineage;
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string;
  nodesConfig?: Record<string, { displayName: string }>;
}

interface GroupedData {
  [key: string]: TokenLineageNode[];
}

const LineageTable: React.FC<LineageTableProps> = ({ lineage, onNodeSelect, selectedNodeId, nodesConfig = {} }) => {
  const [sortField, setSortField] = useState<SortField>("generation");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    generation: true,
    timestamp: true,
    value: true,
    operation: true,
    sourceNode: true,
    metadata: false,
  });

  // Create nodes array from lineage data
  const allNodes = useMemo(() => {
    const nodes: any[] = [];
    // Add target token
    if (lineage.targetToken) {
      nodes.push({
        ...lineage.targetToken,
        tokenId: lineage.targetToken.id,
        nodeId: lineage.targetToken.originNodeId,
        nodeName: nodesConfig[lineage.targetToken.originNodeId]?.displayName || lineage.targetToken.originNodeId || "Unknown",
        isTarget: true,
        isRoot: false,
        timestamp: lineage.targetToken.createdAt,
        children: [],
      });
    }
    // Add ancestors
    lineage.allAncestors.forEach(ancestor => {
      nodes.push({
        ...ancestor,
        tokenId: ancestor.id,
        nodeId: ancestor.originNodeId,
        nodeName: nodesConfig[ancestor.originNodeId]?.displayName || ancestor.originNodeId || "Unknown",
        timestamp: ancestor.createdAt,
        children: [],
      });
    });
    // Add immediate parents
    lineage.immediateParents.forEach(parent => {
      nodes.push({
        ...parent,
        tokenId: parent.id,
        nodeId: parent.originNodeId,
        nodeName: nodesConfig[parent.originNodeId]?.displayName || parent.originNodeId || "Unknown",
        timestamp: parent.createdAt,
        isTarget: false,
        children: [],
      });
    });
    return nodes;
  }, [lineage, nodesConfig]);

  // Filter nodes based on search term
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return allNodes;
    return allNodes.filter((node: any) =>
      Object.values(node).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [allNodes, searchTerm]);

  // Sort nodes
  const sortedNodes = useMemo(() => {
    const sorted = [...filteredNodes].sort((a: any, b: any) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases
      if (sortField === "timestamp") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredNodes, sortField, sortDirection]);

  // Group nodes
  const groupedData = useMemo(() => {
    if (groupBy === "none") return { "All Tokens": sortedNodes };

    const grouped: GroupedData = {};
    sortedNodes.forEach(node => {
      let groupKey: string;
      switch (groupBy) {
        case "generation":
          groupKey = `Generation ${(node as any).generationLevel || 0}`;
          break;
        case "operation":
          groupKey = (node as any).operation?.type || "Unknown Operation";
          break;
        case "sourceNode":
          groupKey = node.originNodeId || "Root Tokens";
          break;
        default:
          groupKey = "All Tokens";
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(node);
    });
    return grouped;
  }, [sortedNodes, groupBy]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleRowExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatValue = (value: number) => {
    return value.toLocaleString();
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium hover:bg-transparent"
    >
      {children}
      {sortField === field && (
        <span className="ml-1">
          {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      )}
    </Button>
  );

  const renderExpandedContent = (node: TokenLineageNode) => (
    <TableRow key={`${node.id}-expanded`}>
      <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length + 1}>
        <div className="p-4 bg-muted/50 rounded-md space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Token ID:</strong> {node.tokenId}
            </div>
            <div>
              <strong>Node ID:</strong> {node.id}
            </div>
            {node.nodeId && (
              <div>
                <strong>Source Node:</strong> {node.nodeId}
              </div>
            )}
          </div>
          {(node as any).operation && (
            <div>
              <strong>Operation Details:</strong>
              <pre className="mt-1 text-xs bg-background p-2 rounded border overflow-auto">
                {JSON.stringify((node as any).operation, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          {/* Group By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Group: {groupBy === "none" ? "None" : groupBy}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Group By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={groupBy === "none"} onCheckedChange={() => setGroupBy("none")}>
                None
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={groupBy === "generation"}
                onCheckedChange={() => setGroupBy("generation")}
              >
                Generation
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={groupBy === "operation"}
                onCheckedChange={() => setGroupBy("operation")}
              >
                Operation
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={groupBy === "sourceNode"}
                onCheckedChange={() => setGroupBy("sourceNode")}
              >
                Source Node
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.generation}
              onCheckedChange={() => toggleColumnVisibility("generation")}
            >
              Generation
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.timestamp}
              onCheckedChange={() => toggleColumnVisibility("timestamp")}
            >
              Timestamp
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.value}
              onCheckedChange={() => toggleColumnVisibility("value")}
            >
              Value
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.operation}
              onCheckedChange={() => toggleColumnVisibility("operation")}
            >
              Operation
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.sourceNode}
              onCheckedChange={() => toggleColumnVisibility("sourceNode")}
            >
              Source Node
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.metadata}
              onCheckedChange={() => toggleColumnVisibility("metadata")}
            >
              Metadata
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              {columnVisibility.generation && (
                <TableHead>
                  <SortButton field="generation">Generation</SortButton>
                </TableHead>
              )}
              {columnVisibility.timestamp && (
                <TableHead>
                  <SortButton field="timestamp">Timestamp</SortButton>
                </TableHead>
              )}
              {columnVisibility.value && (
                <TableHead>
                  <SortButton field="value">Value</SortButton>
                </TableHead>
              )}
              {columnVisibility.operation && (
                <TableHead>
                  <SortButton field="operation">Operation</SortButton>
                </TableHead>
              )}
              {columnVisibility.sourceNode && <TableHead>Source Node</TableHead>}
              {columnVisibility.metadata && <TableHead>Metadata</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedData).map(([groupKey, nodes]) => (
              <React.Fragment key={groupKey}>
                {groupBy !== "none" && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length + 1}>
                      <Collapsible
                        open={expandedGroups.has(groupKey)}
                        onOpenChange={() => toggleGroupExpansion(groupKey)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-start font-medium">
                            {expandedGroups.has(groupKey) ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            {groupKey} ({nodes.length} tokens)
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                )}
                <Collapsible open={groupBy === "none" || expandedGroups.has(groupKey)}>
                  <CollapsibleContent>
                    {nodes.map((node: any) => (
                      <React.Fragment key={node.id}>
                        <TableRow
                          className={`cursor-pointer ${selectedNodeId === node.id ? "bg-muted" : ""}`}
                          onClick={() => onNodeSelect?.(node.id)}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                toggleRowExpansion(node.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              {expandedRows.has(node.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          {columnVisibility.generation && <TableCell>{(node as any).generationLevel || 0}</TableCell>}
                          {columnVisibility.timestamp && <TableCell>{formatTimestamp(node.createdAt)}</TableCell>}
                          {columnVisibility.value && <TableCell>{formatValue(node.value)}</TableCell>}
                          {columnVisibility.operation && <TableCell>{(node as any).operation?.type || "N/A"}</TableCell>}
                          {columnVisibility.sourceNode && <TableCell>{node.originNodeId || "Root"}</TableCell>}
                          {columnVisibility.metadata && (
                            <TableCell>
                              {(node as any).operation && Object.keys((node as any).operation).length > 0
                                ? `${Object.keys((node as any).operation).length} fields`
                                : "None"}
                            </TableCell>
                          )}
                        </TableRow>
                        {expandedRows.has(node.id) && renderExpandedContent(node)}
                      </React.Fragment>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredNodes.length} of {allNodes.length} tokens
      </div>
    </div>
  );
};

export default LineageTable;
