# Fix 19: FSM Visual State Updates & Configuration

## Issues

### 1. Visual Node Not Showing Current State
**Problem**: Node diagram shows "Current State: idle" even when FSM is in "processing" or "complete"  
**Root Cause**: React not detecting changes in `fsmState.currentFSMState` from Zustand store

**Investigation Steps**:
1. Added useEffect to log state changes in FSMProcessNodeDisplay
2. Added logging in GraphVisualization to track nodeStates updates
3. Verify if nodeState prop is being updated correctly

**Potential Solutions**:
- Ensure Zustand is creating new state objects (not mutating)
- Force re-render by using currentTime or sequence number as dependency
- Use React key based on state to force remount

### 2. Wrong Stats in Bottom Section
**Problem**: Shows "Queue:0" or "Processed:0" - stats from other node types  
**Status**: ✅ FIXED - Now shows:
- States: Total FSM states
- Transitions: Total defined transitions
- Messages: Tokens in input buffers
- State Changes: Total transitions executed
- Current State: Bold orange text with actual state

### 3. No Way to Edit FSM Configuration
**Problem**: Can't modify FSM states/transitions after creation  
**Status**: ✅ Modal exists (FSMConfigurationModal.tsx) but need to verify:
- Opens correctly when clicking edit button
- Saves changes back to store
- Updates FSM definition properly

## Files Modified

1. **components/graph/nodes/FSMProcessNodeDisplay.tsx**
   - Added useEffect to log state changes
   - Fixed bottom stats section (removed Queue/Processed)
   - Added Current State display

2. **components/library/NodeLibraryPanel.tsx**
   - Removed duplicate `fsm.outputs` field
   - Only `config.outputs` now

3. **components/graph/nodes/FSMProcessNodeDisplay.tsx**
   - Changed to use `config.outputs` instead of `fsm.outputs` for handles

4. **components/graph/GraphVisualization.tsx**
   - Added logging for FSM state updates
   - Enhanced node deletion cleanup

## Testing Required

### Visual State Update Test:
1. Start simulation
2. Watch console for:
   - `🔍 [GRAPH VIZ]` - Shows store state updates
   - `🎨 [FSM DISPLAY]` - Shows component re-renders
3. Verify if:
   - Store state updates correctly (processing, complete, idle)
   - Component receives updated nodeState prop
   - Component re-renders with new state

### Expected Behavior:
- **Header**: Shows current state dynamically
- **Bottom Stats**: Shows Messages: X, State Changes: Y, Current State: processing
- **State Badge**: Updates color/text based on current state

### FSM Edit Test:
1. Click edit button (pencil icon) on FSM node
2. Modal should open showing:
   - FSL code editor
   - State list
   - Transition list
   - Save button
3. Make changes and save
4. Verify FSM definition updates

## Next Steps

1. **Run simulation** and check console logs
2. **If state not updating**:
   - Check if `_updateNodeState` creates new object
   - Add dependency on `nodeStates` timestamp
   - Use `key={fsmState?.currentFSMState}` to force remount
3. **Test FSM configuration modal**
4. **Add visual indicator** (pulsing dot) when state changes
5. **Consider adding state history** in inspector

## Related Issues

- Fix 18: FSM Complete Implementation
- Fix 17: FSM Edge Visibility
- Connection Fixes: FSM → Multiplexer

## Notes

**Zustand State Updates**:
Zustand uses immer by default, which should create new state objects. But if `_updateNodeState` is mutating, React won't detect changes.

**Workaround**:
Can add `key={currentTime}` to force re-render on every simulation tick, but this is expensive.

**Better Solution**:
Use `useSimulationStore(state => state.nodeStates[nodeId]?.currentFSMState)` directly in component to subscribe to specific state field.
