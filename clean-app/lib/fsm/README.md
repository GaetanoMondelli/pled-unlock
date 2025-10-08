# Simplified FSM + Multiplexer Architecture

This module provides a super-simple, decoupled architecture for template-editor nodes. FSM nodes only handle state transitions and emit state changes. Multiplexer nodes handle "if input == X then route to Y" logic (works with any input type).

## Architecture Components

### 1. **EventQueue** - Simple Event Buffer
- Stores events in chronological order
- No complex logic, just a buffer
- Methods: `addEvent()`, `getEvents()`, `clear()`

### 2. **EventProcessor** - Event → Message Transformation
- Transforms events into messages using rules
- Pure function approach
- Configurable rules with conditions
- Methods: `processEvents(events, rules)`

### 3. **SimpleFSM** - Pure State Machine
- Only handles state transitions
- No side effects or complex logic
- Always emits state context on state changes
- Methods: `processMessage()`, `getCurrentState()`, `canTransition()`

### 4. **ActionExecutor** - Side Effect Handler
- Executes actions separately from FSM logic
- Supports different action types: LOG_MESSAGE, CREATE_EVENT, HTTP_REQUEST
- Methods: `executeActions(actions, context)`

### 5. **FSMOrchestrator** - Coordinator
- Ties all components together
- Single entry point for the system
- Methods: `addEvent()`, `getCurrentState()`, `getStats()`

### 6. **NodeFSMAdapter** - Template Editor Integration
- Bridges template-editor nodes with decoupled FSM
- Converts existing node configs to FSM definitions
- Always emits state context output
- Methods: `processTokenInput()`, `processCustomEvent()`

### 7. **StateMultiplexer** - State-Based Router 🆕
- Takes FSM state context as input
- Routes to different outputs based on conditions
- Handles "if state == X then do Y" logic
- Methods: `processStateContext()`, `testCondition()`

## Usage in Template Editor

### Adding a Decoupled FSM Node

1. The new "Decoupled FSM" node type is available in the Node Library
2. It uses the `DecoupledFSMNodeDisplay` component
3. Shows real-time FSM state and event processing
4. Includes debugging buttons for testing transitions

### Key Benefits

✅ **Simple to understand** - Each component has one responsibility
✅ **Easy to test** - Pure functions and clear interfaces
✅ **No complex embedded logic** - FSM is just state transitions
✅ **Flexible** - Can easily add new action types or rules
✅ **Clean separation** - Events → Messages → State → Actions
✅ **Debugging friendly** - Can inspect each step of the process

### New Architecture Flow

```
Input → FSM → State Context → StateMultiplexer → Multiple Outputs
        ↓                           ↓               ↓
   State Changes            Route Conditions    Actions/Events
```

**Key Concept**: FSM only emits state changes. StateMultiplexer handles routing based on state.

### Example Usage

**FSM Node:**
```typescript
// FSM processes input and emits state context
const adapter = new NodeFSMAdapter(nodeId, nodeConfig);
const result = await adapter.processTokenInput(token);
// result.stateOutput contains: { currentState, previousState, variables, context }
```

**StateMultiplexer Node:**
```typescript
// StateMultiplexer routes based on state
const multiplexer = new StateMultiplexer(nodeId, {
  routes: [
    {
      condition: "state_input.data.currentState === 'processing'",
      outputName: "output1",
      action: { type: "emit", data: "state_input.data.context" }
    },
    {
      condition: "state_input.data.currentState === 'complete'",
      outputName: "output2",
      action: { type: "emit", data: "{ result: 'done' }" }
    }
  ]
});

const result = multiplexer.processStateContext(stateContext);
// Routes to different outputs based on current state
```

## Comparison with Old Architecture

### Old (Embedded FSM)
```typescript
// Complex node with embedded FSM logic
class FSMProcessNode {
  // FSM state mixed with node logic
  // Actions embedded in state transitions
  // Hard to test individual components
  // Tight coupling between concerns
}
```

### New (Decoupled FSM)
```typescript
// Simple, focused components
const eventQueue = new EventQueue();
const processor = new EventProcessor();
const fsm = new SimpleFSM(definition);
const executor = new ActionExecutor();

// Clear separation of concerns
// Easy to test each component
// Flexible and extensible
```

## Files

- `types.ts` - Type definitions
- `EventQueue.ts` - Event buffer
- `EventProcessor.ts` - Event → Message transformation
- `SimpleFSM.ts` - Pure state machine
- `ActionExecutor.ts` - Action execution
- `FSMOrchestrator.ts` - Component coordinator
- `NodeFSMAdapter.ts` - Template editor integration
- `DecoupledFSMNodeDisplay.tsx` - React component for nodes
- `__tests__/` - Unit tests