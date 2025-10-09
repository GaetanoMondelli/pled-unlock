import { nanoid } from "@/lib/nanoid";
import type { AnyNode } from "@/lib/simulation/types";

// Node IDs
const sourceId = nanoid();
const processorId = nanoid();
const fsmId = nanoid();
const multiplexerId = nanoid();
const sinkIdleId = nanoid();
const sinkProcessingId = nanoid();
const sinkCompleteId = nanoid();

const createFSMTestTemplate = () => {
  const nodes: AnyNode[] = [
    // Event Source - generates numbers 1-10
    {
      nodeId: sourceId,
      type: "DataSource",
      displayName: "Number Generator",
      position: { x: 50, y: 200 },
      streamType: "random",
      config: {
        minValue: 1,
        maxValue: 10,
        interval: 2000  // Generate every 2 seconds
      },
      outputs: [
        {
          outputId: "output-0",
          destinationNodeId: processorId
        }
      ]
    } as any,

    // Process Node - transforms numbers to messages
    {
      nodeId: processorId,
      type: "ProcessNode",
      displayName: "Number to Message",
      position: { x: 250, y: 200 },
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
            formula: 'num <= 3 ? "token_received" : num <= 6 ? "processing_complete" : "reset"'
          }
        }
      ]
    } as any,

    // FSM Node - state machine
    {
      nodeId: fsmId,
      type: "FSM",
      displayName: "State Machine",
      position: { x: 450, y: 200 },
      config: {
        initialState: "idle",
        states: {
          idle: {
            on: {
              token_received: {
                target: "processing",
                actions: [
                  { type: "emit", target: "state_output", value: "processing" }
                ]
              }
            }
          },
          processing: {
            on: {
              processing_complete: {
                target: "complete",
                actions: [
                  { type: "emit", target: "state_output", value: "complete" }
                ]
              }
            }
          },
          complete: {
            on: {
              reset: {
                target: "idle",
                actions: [
                  { type: "emit", target: "state_output", value: "idle" }
                ]
              }
            }
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
    } as any,

    // Multiplexer - routes based on FSM state
    {
      nodeId: multiplexerId,
      type: "StateMultiplexer",
      displayName: "State Router",
      position: { x: 650, y: 200 },
      config: {
        routes: [
          {
            condition: 'value === "idle"',
            outputId: "idle_output"
          },
          {
            condition: 'value === "processing"',
            outputId: "processing_output"
          },
          {
            condition: 'value === "complete"',
            outputId: "complete_output"
          }
        ],
        defaultRoute: {
          outputId: "default_output"
        }
      },
      inputs: [
        { nodeId: fsmId, inputId: "state" }
      ],
      outputs: [
        {
          outputId: "idle_output",
          destinationNodeId: sinkIdleId
        },
        {
          outputId: "processing_output",
          destinationNodeId: sinkProcessingId
        },
        {
          outputId: "complete_output",
          destinationNodeId: sinkCompleteId
        }
      ]
    } as any,

    // Sink for idle state
    {
      nodeId: sinkIdleId,
      type: "Sink",
      displayName: "Idle State Sink",
      position: { x: 850, y: 100 },
      capacity: 100,
      inputs: []
    } as any,

    // Sink for processing state
    {
      nodeId: sinkProcessingId,
      type: "Sink",
      displayName: "Processing State Sink",
      position: { x: 850, y: 200 },
      capacity: 100,
      inputs: []
    } as any,

    // Sink for complete state
    {
      nodeId: sinkCompleteId,
      type: "Sink",
      displayName: "Complete State Sink",
      position: { x: 850, y: 300 },
      capacity: 100,
      inputs: []
    } as any
  ];

  const edges = [
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
  ];

  return { nodes, edges };
};

export async function saveFSMTestTemplate() {
  try {
    const { nodes, edges } = createFSMTestTemplate();

    // Create the scenario document
    const scenarioId = `fsm-test-${Date.now()}`;
    const scenarioDocument = {
      id: scenarioId,
      name: "FSM Complete Test Workflow",
      description: "Tests FSM with number→message transformation, state transitions, and routing",
      scenario: {
        nodes,
        edges
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
        author: "system",
        tags: ["fsm", "test", "workflow", "multiplexer"],
        details: {
          workflow: "Source(1-10) → Processor(num→msg) → FSM(states) → Multiplexer(routing) → Sinks",
          transformations: {
            "1-3": "token_received",
            "4-6": "processing_complete",
            "7-10": "reset"
          },
          states: {
            idle: "→ processing (on token_received)",
            processing: "→ complete (on processing_complete)",
            complete: "→ idle (on reset)"
          }
        }
      }
    };

    // Save via API endpoint
    const response = await fetch('/api/admin/scenarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenarioDocument),
    });

    if (!response.ok) {
      throw new Error(`Failed to save template: ${response.statusText}`);
    }

    const result = await response.json();

    console.log("✅ FSM Test Template saved successfully!");
    console.log("Scenario ID:", result.id);
    console.log("\nYou can now load this template from the UI using 'Manage Scenarios'");

    return result;
  } catch (error) {
    console.error("❌ Error saving FSM template:", error);
    throw error;
  }
}

// Export for use in UI
export { createFSMTestTemplate };