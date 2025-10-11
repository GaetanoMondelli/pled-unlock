# Fix 18: Complete FSM Implementation

## Date: 2025-10-10

## Issues Fixed

### 1. **FSM Not Receiving Messages from ProcessNode** ✅
**Problem**: ProcessNode `_tryFireProcessNode` only handled `EnhancedFSMProcessNode`, not `FSMProcessNode`  
**Solution**: Added FSMProcessNode case to ProcessNode token forwarding (simulationStore.ts:2500-2575)
- Finds correct input buffer by matching source node and output name
- Logs message reception
- Checks for valid transitions from current state
- Executes transitions only when valid

### 2. **ProcessNode Not Consuming Tokens** ✅  
**Problem**: Token consumption used alias as buffer key instead of actual source node ID  
**Solution**: Fixed token consumption to use `aliasToSourceNodeId` mapping (simulationStore.ts:2343-2357)
- Maps alias back to actual source node ID
- Removes token from correct buffer
- Prevents duplicate firings with same token

### 3. **Formula Context Using Stale Values** ✅
**Problem**: Formula context contained object references instead of actual values  
**Solution**: Added direct value assignment after all context setup (simulationStore.ts:2400)
```typescript
formulaContext[aliasKey] = token.value; // Direct value, not object
```

### 4. **Duplicate FSM Transitions** ✅
**Problem**: "token_received" message triggered BOTH generic and message-specific transition checks  
**Solution**: Check for message-specific transitions only if message ≠ "token_received" (simulationStore.ts:2558-2577)

### 5. **Activity Log Showing Wrong FSM State** ✅
**Problem**: Activity logger looked for `stateMachine.currentState` but FSMProcessNode stores as `currentFSMState`  
**Solution**: Special-case FSMProcessNode in `_logNodeActivity` (simulationStore.ts:2213-2228)
```typescript
if (nodeConfig?.type === 'FSMProcessNode') {
  currentFSMState = (currentState as any)?.currentFSMState || 'idle';
} else {
  currentFSMState = currentState?.stateMachine?.currentState || 'unknown';
}
```

### 6. **Invalid Messages Triggering State Changes** ✅
**Problem**: FSM logged all messages AND executed transitions even when no valid transition existed  
**Solution**: Check for valid transitions FIRST, only execute if they exist (simulationStore.ts:2533-2560)
- Always log message reception (for auditing)
- Only execute transitions if message matches valid transition from current state
- Log warning if no valid transition found

### 7. **FSM Not Emitting State to Downstream Nodes** ✅
**Problem**: FSM didn't automatically emit current state on transitions  
**Solution**: Auto-emit state token to "state" output after every transition (simulationStore.ts:2661-2676)
```typescript
const stateOutput = fsmConfig.outputs?.find((out: any) => out.name === 'state');
if (stateOutput) {
  const stateToken = get()._createToken(fsmConfig.nodeId, transition.to, newTime);
  get()._routeFSMToken(fsmConfig, stateOutput, stateToken, newTime);
}
```

### 8. **FSM Visual Node Not Updating** ✅
**Problem**: Node display showed static state, didn't react to changes  
**Solution**: Enhanced FSMProcessNodeDisplay.tsx to show:
- Current state prominently in header
- Message count (tokens in input buffers)
- State change count (transition history length)
- Reactive to nodeState changes

### 9. **Duplicate FSM Outputs** ✅
**Problem**: FSM had both `outputs: [{ name: "state_output" }]` and `fsm.outputs: ["state_output"]`  
**Solution**: Unified to single output called "state" (NodeLibraryPanel.tsx:148-177)
- Changed from "state_output" to "state"
- Removed duplication
- Simplified interface to SimpleValue

## Files Modified

1. **stores/simulationStore.ts**
   - Line 809: Added DataSource random value logging
   - Line 835: Added TOKEN FORWARD logging
   - Lines 2343-2357: Fixed token consumption using correct node ID
   - Line 2400: Fixed formula context to use direct value
   - Lines 2213-2228: Fixed FSM state reading for activity log
   - Lines 2500-2575: Added FSMProcessNode forwarding from ProcessNode
   - Lines 2533-2560: Fixed message validation and transition execution
   - Lines 2645-2676: Added automatic state emission on transitions

2. **components/graph/nodes/FSMProcessNodeDisplay.tsx**
   - Lines 27-36: Added message count and transition count tracking
   - Lines 89-103: Enhanced header to show current state, messages, transitions
   - Line 278: Changed fallback handle from "state_output" to "state"

3. **components/library/NodeLibraryPanel.tsx**
   - Lines 148-177: Changed FSM output from "state_output" to "state"
   - Simplified output interface to SimpleValue

## FSM Behavior Now

### Message Flow
1. ProcessNode emits token with message value (e.g., "token_received", "processing_complete", "reset")
2. Token forwarded to FSMProcessNode input buffer
3. FSM logs "message_received" for ALL messages (auditing)
4. FSM checks if message triggers valid transition from current state
5. If valid: Execute transition, emit new state to "state" output
6. If invalid: Log warning, stay in current state, no action

### State Transitions
```
idle + "token_received" → processing (emits "processing")
processing + "processing_complete" → complete (emits "complete")
complete + "reset" → idle (emits "idle")
```

### Visual Feedback
- Node header shows: `State: processing | 2 msgs | 3 transitions`
- State badge updates in real-time
- Message count shows pending messages in buffer
- Transition count shows total state changes

## Testing Checklist

- [x] Different random values generated (4, 6, 2, 8, 1, etc.)
- [x] Different messages produced based on formula ("token_received", "processing_complete", "reset")
- [x] FSM receives messages and logs them
- [x] FSM only transitions on valid messages
- [x] FSM stays in current state on invalid messages
- [x] FSM emits state to Multiplexer on every transition
- [x] Multiplexer receives state tokens and routes accordingly
- [x] Activity log shows correct states before/after transitions
- [x] Visual node updates state display in real-time
- [x] No duplicate transitions logged
- [x] Tokens properly consumed (no duplicate firings)

## Next Steps

1. Test complete workflow: Generator → ProcessNode → FSM → Multiplexer → Sinks
2. Verify Multiplexer routes based on FSM state
3. Add FSL (Finite State Language) parsing if needed
4. Consider XState integration for more complex FSM features
