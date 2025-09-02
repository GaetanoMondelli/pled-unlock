"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TokenLineage } from "@/lib/simulation/tokenGenealogyEngine";
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface D3TokenTreeProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  nodesConfig?: Record<string, { displayName: string }>;
  showCompleteHistory?: boolean;
}

interface TreeNodeData {
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
  isRoot: boolean;
  isTarget: boolean;
  timestamp?: number;
  children?: TreeNodeData[];
}

const D3TokenTree: React.FC<D3TokenTreeProps> = ({
  lineage,
  onTokenClick,
  nodesConfig = {},
  showCompleteHistory = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // Build tree data structure
  const treeData = React.useMemo((): TreeNodeData => {
    const buildTreeNode = (tokenId: string, isTarget = false): TreeNodeData => {
      const token = isTarget ? lineage.targetToken : lineage.allAncestors.find(a => a.id === tokenId);
      const parent = lineage.immediateParents.find(p => p.id === tokenId);
      
      if (!token && !parent) {
        throw new Error(`Token ${tokenId} not found`);
      }
      
      const nodeData = token || parent;
      const ancestor = lineage.allAncestors.find(a => a.id === tokenId);
      
      const node: TreeNodeData = {
        id: `tree-${tokenId}`,
        tokenId: nodeData.id,
        value: nodeData.value,
        nodeId: nodeData.originNodeId || 'unknown',
        nodeName: nodesConfig[nodeData.originNodeId || '']?.displayName || nodeData.originNodeId || 'Unknown',
        operation: ancestor?.operation || parent?.operation,
        isRoot: ancestor?.isRoot || false,
        isTarget,
        timestamp: nodeData.createdAt,
        children: [],
      };

      // Add children based on relationships
      if (isTarget && lineage.immediateParents.length > 0) {
        node.children = lineage.immediateParents.map(p => buildTreeNode(p.id));
      } else if (ancestor?.operation?.sourceTokens) {
        node.children = ancestor.operation.sourceTokens.map(source => buildTreeNode(source.tokenId));
      }

      return node;
    };

    return buildTreeNode(lineage.targetToken.id, true);
  }, [lineage, nodesConfig]);

  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };

    // Create tree layout
    const treeLayout = d3.tree<TreeNodeData>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    // Create hierarchy
    const root = d3.hierarchy(treeData);
    const treeNodes = treeLayout(root);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create links (edges)
    const links = g.selectAll(".link")
      .data(treeNodes.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, TreeNodeData>()
        .x(d => d.y)
        .y(d => d.x))
      .style("fill", "none")
      .style("stroke", "#94a3b8")
      .style("stroke-width", 2)
      .style("stroke-dasharray", d => {
        const sourceNode = d.source.data;
        const targetNode = d.target.data;
        return targetNode.isRoot ? "5,5" : "none";
      });

    // Create nodes
    const nodes = g.selectAll(".node")
      .data(treeNodes.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data.tokenId);
        onTokenClick(d.data.tokenId);
      });

    // Add node circles
    nodes.append("circle")
      .attr("r", d => d.data.isTarget ? 12 : d.data.isRoot ? 10 : 8)
      .style("fill", d => {
        if (d.data.isTarget) return "#3b82f6";
        if (d.data.isRoot) return "#10b981";
        if (d.data.operation?.type === "aggregation") return "#8b5cf6";
        if (d.data.operation?.type === "transformation") return "#f59e0b";
        return "#6b7280";
      })
      .style("stroke", d => selectedNode === d.data.tokenId ? "#ef4444" : "#ffffff")
      .style("stroke-width", d => selectedNode === d.data.tokenId ? 3 : 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Add node icons
    nodes.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", d => d.data.isTarget ? "14px" : "12px")
      .style("font-weight", "bold")
      .text(d => {
        if (d.data.isTarget) return "🎯";
        if (d.data.isRoot) return "🌱";
        if (d.data.operation?.type === "aggregation") return "📊";
        if (d.data.operation?.type === "transformation") return "⚙️";
        return "🔗";
      });

    // Add node labels
    nodes.append("text")
      .attr("dy", d => d.data.isTarget ? "25px" : "20px")
      .attr("text-anchor", "middle")
      .style("fill", "#374151")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("font-family", "monospace")
      .text(d => d.data.tokenId);

    // Add value labels
    nodes.append("text")
      .attr("dy", d => d.data.isTarget ? "38px" : "33px")
      .attr("text-anchor", "middle")
      .style("fill", "#6b7280")
      .style("font-size", "10px")
      .text(d => `${d.data.value}`);

    // Add node name labels
    nodes.append("text")
      .attr("dy", d => d.data.isTarget ? "50px" : "45px")
      .attr("text-anchor", "middle")
      .style("fill", "#9ca3af")
      .style("font-size", "9px")
      .text(d => d.data.nodeName.length > 12 ? d.data.nodeName.substring(0, 12) + "..." : d.data.nodeName);

    // Add hover effects
    nodes
      .on("mouseenter", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", (d.data.isTarget ? 12 : d.data.isRoot ? 10 : 8) + 2)
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", d.data.isTarget ? 12 : d.data.isRoot ? 10 : 8)
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
      });

    // Center the tree
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const fullWidth = bounds.width;
      const fullHeight = bounds.height;
      const midX = bounds.x + fullWidth / 2;
      const midY = bounds.y + fullHeight / 2;
      
      const scale = Math.min(width / fullWidth, height / fullHeight) * 0.8;
      const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
      
      svg.call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

  }, [treeData, selectedNode, onTokenClick]);

  const handleZoomIn = () => {
    if (!zoomRef.current || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      zoomRef.current.scaleBy as any, 1.5
    );
  };

  const handleZoomOut = () => {
    if (!zoomRef.current || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      zoomRef.current.scaleBy as any, 1 / 1.5
    );
  };

  const handleReset = () => {
    if (!zoomRef.current || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      zoomRef.current.transform as any, d3.zoomIdentity
    );
  };

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

        {/* Tree Visualization */}
        <div className="relative border rounded-lg bg-white">
          {/* Controls */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleReset} className="h-8 w-8 p-0">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </div>

          {/* Zoom indicator */}
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="outline" className="text-xs">
              {Math.round(zoomLevel * 100)}%
            </Badge>
          </div>

          {/* SVG Tree */}
          <svg
            ref={svgRef}
            width="100%"
            height="500"
            className="overflow-hidden"
            style={{ background: "linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px" }}
          />

          {/* Legend */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded p-2 text-xs space-y-1 border">
            <div className="font-medium text-muted-foreground">Legend:</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>🎯 Target Token</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>🌱 Source Token</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>📊 Aggregation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>⚙️ Transformation</span>
            </div>
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="bg-muted/30 rounded p-3 text-sm">
            <div className="font-medium mb-2">Selected Token: {selectedNode}</div>
            {(() => {
              const token = selectedNode === lineage.targetToken.id 
                ? lineage.targetToken 
                : lineage.allAncestors.find(a => a.id === selectedNode) || lineage.immediateParents.find(p => p.id === selectedNode);
              
              if (!token) return null;
              
              return (
                <div className="space-y-1 text-xs">
                  <div><strong>Value:</strong> {token.value}</div>
                  <div><strong>Node:</strong> {nodesConfig[token.originNodeId || '']?.displayName || token.originNodeId}</div>
                  <div><strong>Created:</strong> {token.createdAt}s</div>
                  {lineage.allAncestors.find(a => a.id === selectedNode)?.operation && (
                    <div><strong>Operation:</strong> {lineage.allAncestors.find(a => a.id === selectedNode)?.operation?.type}</div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Complete Event History - same as before but collapsible */}
        {showCompleteHistory && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="font-semibold text-sm">Complete Event History (DFS Traversal)</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="text-xs text-muted-foreground p-2 border rounded bg-muted/10">
                Event history would go here (same as CompactTokenTree implementation)
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </TooltipProvider>
  );
};

export default D3TokenTree;