"use client";

/* eslint-disable */
import React, { useMemo } from "react";
import ReactFlow, { Controls, Edge, MarkerType, Node, Position } from "reactflow";
import "reactflow/dist/style.css";

const pill = (text: string) => (
  <div className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs bg-background text-foreground">
    {text}
  </div>
);

export default function HowItWorksFlow() {
  // Static layout for a clean, readable diagram
  const nodes = useMemo<Node[]>(
    () => [
      // Inputs
      {
        id: "pdfs",
        position: { x: 0, y: 10 },
        data: { label: pill("PDFs") },
        type: "input",
        draggable: false,
        sourcePosition: Position.Right,
      },
      {
        id: "txs",
        position: { x: 0, y: 58 },
        data: { label: pill("TXs") },
        type: "input",
        draggable: false,
        sourcePosition: Position.Right,
      },
      {
        id: "apis",
        position: { x: 0, y: 106 },
        data: { label: pill("APIs") },
        type: "input",
        draggable: false,
        sourcePosition: Position.Right,
      },
      {
        id: "emails",
        position: { x: 0, y: 154 },
        data: { label: pill("Emails") },
        type: "input",
        draggable: false,
        sourcePosition: Position.Right,
      },
      {
        id: "iot",
        position: { x: 0, y: 202 },
        data: { label: pill("IoT") },
        type: "input",
        draggable: false,
        sourcePosition: Position.Right,
      },

      // AI Interpretation & Normalization
      {
        id: "norm",
        position: { x: 240, y: 90 },
        data: {
          label: (
            <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2">
              <span className="text-lg" aria-hidden>
                🤖
              </span>
              <span className="font-medium">Interpretation & Normalization</span>
              <span className="ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]">AI</span>
            </div>
          ),
        },
        draggable: false,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      },

      // Tokenization and State
      {
        id: "token",
        position: { x: 520, y: 60 },
        data: { label: <div className="rounded-md bg-primary/10 px-4 py-2">Tokenization</div> },
        draggable: false,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      },
      {
        id: "state",
        position: { x: 520, y: 130 },
        data: { label: <div className="rounded-md bg-primary/10 px-4 py-2">State</div> },
        draggable: false,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      },

      // Outputs from State
      {
        id: "signatures",
        position: { x: 780, y: 10 },
        data: { label: pill("Verifiable Signatures") },
        draggable: false,
        targetPosition: Position.Left,
      },
      {
        id: "ledger",
        position: { x: 780, y: 70 },
        data: { label: pill("Integrity Ledger") },
        draggable: false,
        targetPosition: Position.Left,
      },
      {
        id: "story",
        position: { x: 780, y: 130 },
        data: { label: pill("State Story") },
        draggable: false,
        targetPosition: Position.Left,
      },

      // Agent (AI) and its outputs
      {
        id: "agent",
        position: { x: 740, y: 190 },
        data: {
          label: (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <span className="text-lg" aria-hidden>
                🤖
              </span>
              <span className="font-medium">Agent</span>
              <span className="ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]">AI</span>
            </div>
          ),
        },
        draggable: false,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      },
      {
        id: "alerts",
        position: { x: 980, y: 180 },
        data: { label: pill("Alerts") },
        draggable: false,
        targetPosition: Position.Left,
      },
      {
        id: "notifications",
        position: { x: 980, y: 220 },
        data: { label: pill("Notifications") },
        draggable: false,
        targetPosition: Position.Left,
      },
      {
        id: "actions",
        position: { x: 980, y: 260 },
        data: { label: pill("Actions") },
        draggable: false,
        targetPosition: Position.Left,
      },
    ],
    [],
  );

  const edges = useMemo<Edge[]>(
    () => [
      // Inputs to Interpretation & Normalization
      { id: "e1", source: "pdfs", target: "norm" },
      { id: "e2", source: "txs", target: "norm" },
      { id: "e3", source: "apis", target: "norm" },
      { id: "e4", source: "emails", target: "norm" },
      { id: "e5", source: "iot", target: "norm" },

      // Flow through Tokenization to State
      { id: "e6", source: "norm", target: "token" },
      { id: "e7", source: "token", target: "state" },

      // State fan-out
      { id: "e8", source: "state", target: "signatures" },
      { id: "e9", source: "state", target: "ledger" },
      { id: "e10", source: "state", target: "story" },

      // Agent hooks
      { id: "e11", source: "state", target: "agent" },
      { id: "e12", source: "agent", target: "alerts" },
      { id: "e13", source: "agent", target: "notifications" },
      { id: "e14", source: "agent", target: "actions" },
    ],
    [],
  );

  return (
    <div className="mt-8 mb-12 w-full">
      <style jsx>{`
        /* subtle color for edges */
        .react-flow__edge-path {
          stroke: hsl(var(--primary));
        }
        /* Ensure ReactFlow doesn't capture scroll events */
        .react-flow {
          pointer-events: none;
        }
        /* Re-enable pointer events only for the controls */
        .react-flow__controls {
          pointer-events: auto;
        }
        /* Prevent wheel events from being captured */
        .react-flow__pane {
          pointer-events: none !important;
        }
        /* Ensure the container doesn't interfere with scrolling */
        .flow-container {
          overflow: visible;
          position: relative;
        }
      `}</style>
      <div className="mx-auto w-full max-w-5xl rounded-xl border bg-background p-2">
        <div className="flow-container" style={{ height: 280 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodesConnectable={false}
            nodesDraggable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
            panOnDrag={false}
            preventScrolling={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              style: { strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
          >
            {/* No dotted background */}
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        A clean path from unstructured events to a verifiable, auditable digital twin of your asset or process.
      </p>
    </div>
  );
}
