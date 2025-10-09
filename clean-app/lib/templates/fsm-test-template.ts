import { nanoid } from "@/lib/nanoid";
import type { TemplateDefinition } from "@/lib/types/template";

// Helper to create unique IDs
const createNodeId = () => nanoid();

// Node IDs
const sourceId = createNodeId();
const processorId = createNodeId();
const fsmId = createNodeId();
const multiplexerId = createNodeId();
const sinkIdleId = createNodeId();
const sinkProcessingId = createNodeId();
const sinkCompleteId = createNodeId();

export const fsmTestTemplate: TemplateDefinition = {
  nodes: [
    // Event Source - generates numbers 1-10
    {
      nodeId: sourceId,
      type: "DataSource",
      displayName: "Number Generator",
      position: { x: 50, y: 200 },
      data: {
        streamType: "random",
        config: {
          minValue: 1,
          maxValue: 10,
          interval: 2000  // Generate every 2 seconds
        }
      }
    },

    // Process Node - transforms numbers to messages
    {
      nodeId: processorId,
      type: "ProcessNode",
      displayName: "Number to Message",
      position: { x: 250, y: 200 },
      data: {
        inputs: [
          {
            nodeId: sourceId,
            inputId: "number",
            alias: "num"
          }
        ],
        outputs: [
          {
            outputId: "message",
            destinationNodeId: fsmId,
            transformation: {
              // Transform number to message based on range
              // 1-3: "token_received", 4-6: "processing_complete", 7-10: "reset"
              formula: `
                num.value <= 3 ? "token_received" :
                num.value <= 6 ? "processing_complete" :
                "reset"
              `
            }
          }
        ],
        formula: "inputs.num"  // Pass through for now, real transformation in output
      }
    },

    // FSM Node - state machine
    {
      nodeId: fsmId,
      type: "FSM",
      displayName: "State Machine",
      position: { x: 450, y: 200 },
      data: {
        initialState: "idle",
        states: {
          idle: {
            on: {
              token_received: "processing"
            },
            actions: {
              onEntry: [
                { type: "emit", target: "state_output", value: "idle" }
              ]
            }
          },
          processing: {
            on: {
              processing_complete: "complete"
            },
            actions: {
              onEntry: [
                { type: "emit", target: "state_output", value: "processing" }
              ]
            }
          },
          complete: {
            on: {
              reset: "idle"
            },
            actions: {
              onEntry: [
                { type: "emit", target: "state_output", value: "complete" }
              ]
            }
          }
        },
        inputs: [
          { nodeId: processorId, inputId: "message" }
        ],
        outputs: [
          {
            outputId: "state_output",
            destinationNodeId: multiplexerId
          }
        ]
      }
    },

    // Multiplexer - routes based on FSM state
    {
      nodeId: multiplexerId,
      type: "Multiplexer",
      displayName: "State Router",
      position: { x: 650, y: 200 },
      data: {
        inputs: [
          { nodeId: fsmId, inputId: "state" }
        ],
        routes: [
          {
            condition: 'input === "idle"',
            outputId: "idle_output",
            destinationNodeId: sinkIdleId
          },
          {
            condition: 'input === "processing"',
            outputId: "processing_output",
            destinationNodeId: sinkProcessingId
          },
          {
            condition: 'input === "complete"',
            outputId: "complete_output",
            destinationNodeId: sinkCompleteId
          }
        ],
        defaultRoute: {
          outputId: "default_output",
          destinationNodeId: sinkIdleId
        }
      }
    },

    // Sink for idle state
    {
      nodeId: sinkIdleId,
      type: "Sink",
      displayName: "Idle State Sink",
      position: { x: 850, y: 100 },
      data: {
        capacity: 100
      }
    },

    // Sink for processing state
    {
      nodeId: sinkProcessingId,
      type: "Sink",
      displayName: "Processing State Sink",
      position: { x: 850, y: 200 },
      data: {
        capacity: 100
      }
    },

    // Sink for complete state
    {
      nodeId: sinkCompleteId,
      type: "Sink",
      displayName: "Complete State Sink",
      position: { x: 850, y: 300 },
      data: {
        capacity: 100
      }
    }
  ],

  edges: [
    // Source to Processor
    {
      id: `${sourceId}-${processorId}`,
      source: sourceId,
      target: processorId,
      type: "default"
    },

    // Processor to FSM
    {
      id: `${processorId}-${fsmId}`,
      source: processorId,
      target: fsmId,
      type: "default"
    },

    // FSM to Multiplexer
    {
      id: `${fsmId}-${multiplexerId}`,
      source: fsmId,
      target: multiplexerId,
      type: "default"
    },

    // Multiplexer to Sinks
    {
      id: `${multiplexerId}-${sinkIdleId}`,
      source: multiplexerId,
      target: sinkIdleId,
      sourceHandle: "idle_output",
      type: "default"
    },
    {
      id: `${multiplexerId}-${sinkProcessingId}`,
      source: multiplexerId,
      target: sinkProcessingId,
      sourceHandle: "processing_output",
      type: "default"
    },
    {
      id: `${multiplexerId}-${sinkCompleteId}`,
      source: multiplexerId,
      target: sinkCompleteId,
      sourceHandle: "complete_output",
      type: "default"
    }
  ],

  metadata: {
    name: "FSM Test Template",
    description: "Complete FSM workflow: Source → Processor → FSM → Multiplexer → Sinks",
    version: "1.0.0",
    createdAt: new Date().toISOString()
  }
};