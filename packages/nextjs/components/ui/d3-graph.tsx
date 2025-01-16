import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import { Button } from "./button";
import { MoveIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon, CrosshairIcon } from "lucide-react";

interface Node {
  id: string;
  isActive?: boolean;
  isInitial?: boolean;
  isFinal?: boolean;
}

interface Link {
  source: string;
  target: string;
  label?: string;
}

interface D3GraphProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
  direction?: 'LR' | 'TB';
}

export const D3Graph: React.FC<D3GraphProps> = ({
  nodes,
  links,
  width = 800,
  height = 400,
  direction = 'LR',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const graphRef = useRef<any>(null);
  const zoomRef = useRef<any>(null);
  const NODE_WIDTH = 150;
  const NODE_HEIGHT = 50;

  const resetLayout = useCallback(() => {
    if (!svgRef.current || !graphRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const initialScale = 0.75;
    const xCenterOffset = (width - graphRef.current.graph().width * initialScale) / 2;
    const yCenterOffset = 20;
    
    svg.call(zoomRef.current.transform,
      d3.zoomIdentity
        .translate(xCenterOffset, yCenterOffset)
        .scale(initialScale)
    );
  }, [width]);

  const focusOnCurrentState = useCallback(() => {
    if (!svgRef.current || !graphRef.current || !zoomRef.current) return;
    
    const currentNode = nodes.find(n => n.isActive);
    if (!currentNode) return;

    const nodeData = graphRef.current.node(currentNode.id);
    if (!nodeData) return;

    const svg = d3.select(svgRef.current);
    const scale = 1;
    const x = width / 2 - nodeData.x * scale;
    const y = height / 2 - nodeData.y * scale;

    svg.call(zoomRef.current.transform,
      d3.zoomIdentity
        .translate(x, y)
        .scale(scale)
    );
  }, [nodes, width, height]);

  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node()!);
    const newScale = currentTransform.k * factor;
    
    if (newScale >= 0.1 && newScale <= 2) {
      svg.call(zoomRef.current.scaleBy, factor);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    if (nodes.length === 0) return;

    const finalStates = new Set(nodes.map(n => n.id));
    links.forEach(link => {
      finalStates.delete(link.source);
    });

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    
    svg.selectAll("*").remove();

    const g = new dagreD3.graphlib.Graph()
      .setGraph({
        rankdir: direction,
        nodesep: 40,
        ranksep: 60,
        marginx: 20,
        marginy: 20,
        edgesep: 15,
        ranker: "tight-tree"
      });

    nodes.forEach(node => {
      const isInitial = node.id === 'idle';
      const isFinal = finalStates.has(node.id);
      
      let nodeStyle = '';
      if (node.isActive) {
        nodeStyle = 'fill: #22c55e; stroke: #16a34a;';
      } else if (isInitial) {
        nodeStyle = 'fill: #3b82f6; stroke: #2563eb;';
      } else if (isFinal) {
        nodeStyle = 'fill: #ef4444; stroke: #dc2626;';
      } else {
        nodeStyle = 'fill: #fff; stroke: #333;';
      }

      g.setNode(node.id, {
        label: node.id,
        class: `${node.isActive ? 'active' : ''} ${isInitial ? 'initial' : ''} ${isFinal ? 'final' : ''}`,
        shape: 'rect',
        rx: 4,
        ry: 4,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        style: nodeStyle
      });
    });

    links.forEach(link => {
      g.setEdge(link.source, link.target, {
        label: link.label,
        labelStyle: 'font-size: 11px;',
        curve: d3.curveBasis,
        arrowheadStyle: 'fill: #333;',
        style: 'stroke: #333; stroke-width: 1.5px;'
      });
    });

    const render = new dagreD3.render();
    const svgGroup = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        svgGroup.attr('transform', event.transform);
      });
    
    svg.call(zoom as any);

    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-10 -5 10 5")
      .attr("refX", 0)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M -10,-5 L 0,0 L -10,5 Z")
      .attr("fill", "#333");

    const dragBehavior = d3.drag()
      .on('start', dragStart)
      .on('drag', dragMove)
      .on('end', dragEnd);

    let draggedNode: any = null;

    let isPanning = false;
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        isPanning = true;
        if (svgRef.current) {
          svgRef.current.style.cursor = 'grab';
        }
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isPanning = false;
        if (svgRef.current) {
          svgRef.current.style.cursor = 'default';
        }
      }
    });

    function dragStart(event: any, d: any) {
      if (isPanning) return;
      event.sourceEvent.stopPropagation();
      draggedNode = d;
    }

    function dragMove(event: any, d: any) {
      if (isPanning || !draggedNode) return;

      const node = g.node(draggedNode);
      node.x += event.dx;
      node.y += event.dy;

      d3.select(this).attr('transform', `translate(${node.x},${node.y})`);

      g.edges().forEach(e => {
        if (e.v === draggedNode || e.w === draggedNode) {
          const sourceNode = g.node(e.v);
          const targetNode = g.node(e.w);

          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          
          const curvature = 0.3;
          const offset = Math.min(Math.abs(dx), Math.abs(dy)) * curvature;
          
          const controlPoint = {
            x: midX,
            y: midY - offset
          };

          const points = [
            { x: sourceNode.x, y: sourceNode.y },
            controlPoint,
            { x: targetNode.x, y: targetNode.y }
          ];

          const edgePath = svgGroup.select(`path[data-source="${e.v}"][data-target="${e.w}"]`);
          
          edgePath
            .attr('d', d3.line()
              .x(d => d.x)
              .y(d => d.y)
              .curve(d3.curveBasis)(points))
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead)');

          const labelGroup = svgGroup.select(`g[data-source="${e.v}"][data-target="${e.w}"].edgeLabel`);
          if (labelGroup.node()) {
            labelGroup.attr('transform', `translate(${midX},${midY})`);
          }
        }
      });
    }

    function dragEnd(event: any, d: any) {
      draggedNode = null;
    }

    render(svgGroup, g);

    svgGroup.selectAll('.edgePath path')
      .attr('data-source', (d: any) => d.v)
      .attr('data-target', (d: any) => d.w)
      .attr('marker-end', 'url(#arrowhead)');

    svgGroup.selectAll('g.node')
      .call(dragBehavior as any);

    graphRef.current = g;
    zoomRef.current = zoom;

    const style = document.createElement('style');
    style.textContent = `
      .node rect {
        stroke-width: 2px;
        cursor: move;
      }
      .node.active rect {
        fill: #22c55e;
        stroke: #16a34a;
      }
      .node.initial rect {
        fill: #3b82f6;
        stroke: #2563eb;
      }
      .node.final rect {
        fill: #ef4444;
        stroke: #dc2626;
      }
      .edgePath path {
        stroke: #333;
        stroke-width: 1.5px;
        fill: none;
        pointer-events: none;
        marker-end: url(#arrowhead);
      }
      .edgePath:hover path {
        stroke-width: 2px;
      }
      .edgeLabel {
        font-size: 12px;
        fill: #333;
        background: white;
      }
      .edgeLabel rect {
        fill: white;
      }
      .node text {
        font-size: 14px;
        font-weight: 500;
        fill: white;
      }
      .node:not(.active):not(.initial):not(.final) text {
        fill: #333;
      }
      marker#arrowhead path {
        fill: #333;
        stroke: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [nodes, links, width, height, direction]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleZoom(1.2)}
            title="Zoom In"
          >
            <ZoomInIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleZoom(0.8)}
            title="Zoom Out"
          >
            <ZoomOutIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetLayout}
            title="Reset Layout"
          >
            <RotateCcwIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={focusOnCurrentState}
            title="Focus on Current State"
          >
            <CrosshairIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MoveIcon className="h-4 w-4" />
          <span>Hold Space + Drag to Pan</span>
        </div>
      </div>
      <div className="relative w-full h-[400px] border rounded-lg overflow-hidden bg-white">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}; 