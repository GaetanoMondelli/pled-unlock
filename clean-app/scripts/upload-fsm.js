#!/usr/bin/env node

/**
 * Standalone script to upload the FSM test template to cloud storage
 * Usage: node scripts/upload-fsm.js
 */

function createFSMTemplate() {
  const nanoid = () => Math.random().toString(36).substr(2, 9);

  // Node IDs
  const sourceId = nanoid();
  const processorId = nanoid();
  const fsmId = nanoid();
  const multiplexerId = nanoid();
  const sinkIdleId = nanoid();
  const sinkProcessingId = nanoid();
  const sinkCompleteId = nanoid();

  const nodes = [
    // Event Source - generates numbers 1-10 (V3 format)
    {
      nodeId: sourceId,
      type: "DataSource",
      displayName: "Number Generator",
      position: { x: 50, y: 200 },
      interval: 2,  // 2 seconds - moved out of config
      generation: {  // moved out of config
        type: "random",
        valueMin: 1,
        valueMax: 10
      },
      outputs: [
        {
          name: "output",  // changed from outputId
          destinationNodeId: processorId,
          destinationInputName: "number",  // added
          interface: {  // added required interface
            type: "number",
            requiredFields: []
          }
        }
      ]
    },

    // Process Node - transforms numbers to messages (V3 format)
    {
      nodeId: processorId,
      type: "ProcessNode",
      displayName: "Number to Message",
      position: { x: 250, y: 200 },
      inputs: [
        {
          name: "number",  // V3 format
          nodeId: sourceId,
          sourceOutputName: "output",  // added
          interface: {  // added required interface
            type: "number",
            requiredFields: []
          },
          alias: "num",
          required: true
        }
      ],
      outputs: [
        {
          name: "message",  // changed from outputId
          destinationNodeId: fsmId,
          destinationInputName: "event",  // added
          interface: {  // added required interface
            type: "string",
            requiredFields: []
          },
          transformation: {
            // Transform number to message based on range
            // 1-3: "token_received", 4-6: "processing_complete", 7-10: "reset"
            formula: 'num <= 3 ? "token_received" : num <= 6 ? "processing_complete" : "reset"',
            fieldMapping: {}  // added
          }
        }
      ]
    },

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
    },

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
    },

    // Sink for idle state
    {
      nodeId: sinkIdleId,
      type: "Sink",
      displayName: "Idle State Sink",
      position: { x: 850, y: 100 },
      capacity: 100,
      inputs: []
    },

    // Sink for processing state
    {
      nodeId: sinkProcessingId,
      type: "Sink",
      displayName: "Processing State Sink",
      position: { x: 850, y: 200 },
      capacity: 100,
      inputs: []
    },

    // Sink for complete state
    {
      nodeId: sinkCompleteId,
      type: "Sink",
      displayName: "Complete State Sink",
      position: { x: 850, y: 300 },
      capacity: 100,
      inputs: []
    }
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
}

async function uploadFSMTemplate() {
  try {
    console.log('🚀 Uploading FSM Test Template...\n');

    // Get the template configuration
    const { nodes, edges } = createFSMTemplate();

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

    // Upload via API
    const response = await fetch('http://localhost:3001/api/admin/scenarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenarioDocument),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save template: ${response.status} ${response.statusText}\n${error}`);
    }

    const result = await response.json();

    console.log('✅ FSM Test Template uploaded successfully!\n');
    console.log('📋 Template Details:');
    console.log('   ID:', result.id);
    console.log('   Name:', result.name);
    console.log('   Description:', result.description);
    console.log('\n📦 Template includes:');
    console.log('   • Event Source (Number Generator 1-10)');
    console.log('   • ProcessNode (transforms numbers to messages)');
    console.log('     - 1-3 → "token_received"');
    console.log('     - 4-6 → "processing_complete"');
    console.log('     - 7-10 → "reset"');
    console.log('   • FSM with states: idle, processing, complete');
    console.log('   • Multiplexer routing based on state');
    console.log('   • 3 Sink nodes for different states');
    console.log('\n🎯 You can now load this template from the UI using "Manage Scenarios"');

    return result;
  } catch (error) {
    console.error('❌ Error uploading FSM template:', error.message);
    console.error('\n💡 Make sure the dev server is running on port 3001');
    process.exit(1);
  }
}

// Run the upload
uploadFSMTemplate()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });