#!/usr/bin/env node

// Test what template is being created
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

    // FSMProcessNode - state machine with proper schema
    {
      nodeId: fsmId,
      type: "FSMProcessNode",
      displayName: "State Machine",
      position: { x: 450, y: 200 },
      inputs: [
        {
          name: "event",
          nodeId: processorId,
          sourceOutputName: "message",
          interface: {
            type: "string",
            requiredFields: []
          },
          required: true
        }
      ],
      fsm: {
        states: ["idle", "processing", "complete"],
        initialState: "idle",
        transitions: [
          {
            from: "idle",
            to: "processing",
            trigger: "token_received"
          },
          {
            from: "processing",
            to: "complete",
            trigger: "processing_complete"
          },
          {
            from: "complete",
            to: "idle",
            trigger: "reset"
          }
        ],
        stateActions: {
          idle: {
            onEntry: { "state": '"idle"' }
          },
          processing: {
            onEntry: { "state": '"processing"' }
          },
          complete: {
            onEntry: { "state": '"complete"' }
          }
        },
        outputs: ["state"]
      }
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
        },
        {
          outputId: "default_output",
          destinationNodeId: sinkIdleId
        }
      ]
    },

    // Sink for idle state
    {
      nodeId: sinkIdleId,
      type: "Sink",
      displayName: "Idle State Sink",
      position: { x: 850, y: 100 },
      inputs: [
        {
          name: "input",
          nodeId: multiplexerId,
          sourceOutputName: "idle_output",
          interface: {
            type: "any",
            requiredFields: []
          },
          required: true
        }
      ]
    },

    // Sink for processing state
    {
      nodeId: sinkProcessingId,
      type: "Sink",
      displayName: "Processing State Sink",
      position: { x: 850, y: 200 },
      inputs: [
        {
          name: "input",
          nodeId: multiplexerId,
          sourceOutputName: "processing_output",
          interface: {
            type: "any",
            requiredFields: []
          },
          required: true
        }
      ]
    },

    // Sink for complete state
    {
      nodeId: sinkCompleteId,
      type: "Sink",
      displayName: "Complete State Sink",
      position: { x: 850, y: 300 },
      inputs: [
        {
          name: "input",
          nodeId: multiplexerId,
          sourceOutputName: "complete_output",
          interface: {
            type: "any",
            requiredFields: []
          },
          required: true
        }
      ]
    }
  ];

  return { nodes };
}

// Test it
const template = createFSMTemplate();
console.log("FSM Node type:", template.nodes[2].type);
console.log("FSM Node:", JSON.stringify(template.nodes[2], null, 2));
console.log("\nSink nodes have inputs:", template.nodes[4].inputs.length > 0);
console.log("First Sink inputs:", JSON.stringify(template.nodes[4].inputs, null, 2));