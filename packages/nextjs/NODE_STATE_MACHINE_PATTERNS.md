# Node State Machine Patterns

## Terminology Clarification

- **Template**: The design/blueprint of a workflow (visual nodes + connections)
- **Procedure**: An instance/execution of a template (runtime state machine)
- **Node**: A component in a template that represents a state machine
- **Token**: A message/data packet that flows between nodes (state machine messages)

## Core Node State Machine Patterns

### 1. Data Source Node

**Purpose**: Generates tokens at regular intervals

**State Machine:**
```fsl
source_idle 'timer_tick' -> source_generating;
source_generating 'value_created' -> source_emitting;
source_emitting 'token_sent' -> source_waiting;
source_waiting 'interval_elapsed' -> source_idle;
```

**States:**
- `source_idle`: Ready to generate next value
- `source_generating`: Creating new token with random value
- `source_emitting`: Sending token to destination
- `source_waiting`: Waiting for next interval

**Actions:**
- `source_generating`: Generate random value between min/max
- `source_emitting`: Create and send token to destinationNodeId

**Inputs**: None (timer-driven)
**Outputs**: Single token stream

---

### 2. Queue Node

**Purpose**: Accumulates tokens and emits aggregated results

**State Machine:**
```fsl
queue_idle 'token_received' -> queue_accumulating;
queue_accumulating 'token_received' -> queue_accumulating;
queue_accumulating 'capacity_reached' -> queue_processing;
queue_accumulating 'timeout_reached' -> queue_processing;
queue_processing 'aggregation_complete' -> queue_emitting;
queue_emitting 'token_sent' -> queue_idle;
```

**States:**
- `queue_idle`: Empty queue, waiting for first token
- `queue_accumulating`: Collecting tokens until trigger condition
- `queue_processing`: Applying aggregation method (sum/average/etc)
- `queue_emitting`: Sending aggregated token

**Actions:**
- `queue_accumulating`: Add token to internal queue
- `queue_processing`: Apply aggregationMethod formula
- `queue_emitting`: Send aggregated result to destinationNodeId

**Multiple Inputs**: ✅ All inputs go to same accumulating state
**Inputs**: Multiple token streams (from any source)
**Outputs**: Single aggregated token stream

---

### 3. Process Node

**Purpose**: Transforms input tokens using formulas

**State Machine:**
```fsl
process_idle 'token_received' -> process_collecting;
process_collecting 'token_received' -> process_collecting;
process_collecting 'all_inputs_ready' -> process_calculating;
process_calculating 'computation_complete' -> process_emitting;
process_emitting 'all_outputs_sent' -> process_idle;
```

**States:**
- `process_idle`: Waiting for input tokens
- `process_collecting`: Gathering tokens from all required inputs
- `process_calculating`: Executing formulas
- `process_emitting`: Sending results to multiple destinations

**Actions:**
- `process_collecting`: Store token by input source
- `process_calculating`: Execute all formula calculations
- `process_emitting`: Send each formula result to its destination (multiple actions in one state)

**Multiple Inputs**: ✅ Different inputs collected separately, all needed before processing
**Multiple Outputs**: ✅ Multiple actions in emitting state, each formula → destination

**Example:**
```json
{
  "inputNodeIds": ["Queue_A", "Queue_B"],
  "outputs": [
    {"formula": "inputs.Queue_A.value + inputs.Queue_B.value", "destinationNodeId": "Sink_1"},
    {"formula": "inputs.Queue_A.value * 0.5", "destinationNodeId": "Sink_2"}
  ]
}
```

---

### 4. Splitter Node

**Purpose**: Routes single input to different outputs based on conditions

**State Machine:**
```fsl
splitter_idle 'token_received' -> splitter_evaluating;
splitter_evaluating 'condition_true' -> splitter_route_output1;
splitter_evaluating 'condition_false' -> splitter_route_output2;
splitter_route_output1 'token_sent' -> splitter_idle;
splitter_route_output2 'token_sent' -> splitter_idle;
```

**States:**
- `splitter_idle`: Waiting for input token
- `splitter_evaluating`: Evaluating routing condition
- `splitter_route_output1`: Sending to first output
- `splitter_route_output2`: Sending to second output

**Actions:**
- `splitter_evaluating`: Apply condition formula to token
- `splitter_route_output1`: Send token to first destination
- `splitter_route_output2`: Send token to second destination

**Multiple Outputs**: ✅ Different states for different outputs (conditional routing)
**Inputs**: Single token stream
**Outputs**: Multiple conditional streams

---

### 5. Sink Node

**Purpose**: Consumes tokens (terminal node)

**State Machine:**
```fsl
sink_idle 'token_received' -> sink_processing;
sink_processing 'logging_complete' -> sink_idle;
```

**States:**
- `sink_idle`: Waiting for tokens
- `sink_processing`: Logging/storing token data

**Actions:**
- `sink_processing`: Log token data, update counters

**Inputs**: Single or multiple token streams
**Outputs**: None

---

## Token Flow Patterns

### Token Structure
```typescript
interface Token {
  id: string;
  timestamp: number;
  value: number;
  metadata: {
    sourceNodeId: string;
    processedBy: string[];
    hops: number;
  };
}
```

### Message Types Between State Machines
- `TOKEN_RECEIVED`: Node received a token input
- `CAPACITY_REACHED`: Queue reached maximum capacity
- `TIMEOUT_REACHED`: Time window expired
- `ALL_INPUTS_READY`: Process node has all required inputs
- `COMPUTATION_COMPLETE`: Formula calculation finished
- `CONDITION_TRUE/FALSE`: Splitter evaluated condition

## Multi-Input Handling Strategies

### Strategy 1: Unified Accumulating State
**Used by**: Queue Node
- All inputs feed into same accumulating state
- No distinction between input sources
- Simple aggregation across all inputs

### Strategy 2: Input-Specific Collection
**Used by**: Process Node
- Separate tracking for each named input
- Wait until all required inputs available
- Enables complex multi-input formulas

### Strategy 3: Multiple State Machines (Future)
**Could be used for**: Complex nodes needing different behavior per input
- Each input gets its own sub-state machine
- Coordination layer manages interactions
- More complex but very flexible

## Implementation Notes

1. **Current template editor** shows visual nodes but these map to state machines
2. **Each node type** needs state tracking during simulation
3. **Token Inspector** should show token's journey through state machines
4. **Node Inspector** should show current state + recent transitions
5. **Step simulation** should highlight state changes as tokens flow

## Next Steps

1. Add state machine tracking to simulation store
2. Show node states during template editor simulation
3. Create node inspector dialogs showing FSL + current state
4. Add state transition animations
5. Enable custom node creation with user-defined state machines