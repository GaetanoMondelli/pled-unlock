# Connection Fixes Summary - 2025-10-10

## What Was Fixed Today

### 1. StateMultiplexer Display Simplified ✅
**File**: `clean-app/components/graph/nodes/StateMultiplexerDisplay.tsx`

**Changes**:
- Removed "Active" status badge (multiplexer is passive, not active)
- Removed "Test State" preview (only relevant during execution)
- Removed "Matched routes" count (only meaningful when running)
- Changed subtitle from "Multiplexer" to "Router (Passive)"
- Simplified stats to show: Routes, Conditions, Outputs, Input (always 1)

**Why**: StateMultiplexer is a PASSIVE routing component that evaluates conditions when data flows through. It doesn't have active/idle states like active processors.

### 2. Previous Critical Fixes (Still Active)

#### Fix 13: FSM Handle IDs ✅
- FSM nodes now have dynamic output handles based on `fsm.outputs` array
- Each output gets its own handle with proper `id` prop
- Input handle explicitly named `id="event"`

#### Fix 14: Single vs Multi-Input Logic ✅  
- StateMultiplexer categorized as single-input node
- Only allows ONE input connection (replaces existing)
- ProcessNode remains multi-input (creates input_1, input_2, etc.)

#### Fix 15: FSM outputs Array Initialization ✅
- FSM nodes get `node.outputs` array created from `fsm.outputs` during load
- Enables edge creation from FSM nodes
- Preserves existing connections

## What To Test Now

### Test 1: FSM → Multiplexer Connection
1. Open your scenario in the template editor
2. Look for FSM node (has state machine)
3. Look for Multiplexer node (shows "Router (Passive)")
4. **Drag from FSM's "state" output handle** (right side) **to Multiplexer's "input" handle** (left side)
5. Check browser console for:
   ```
   🔧 [INIT FSM] Creating outputs array...
   🔗 [FSM CONNECT] Connecting FSM output: ...
   ➕ [EDGE CREATE] Creating edge: ...
   ```
6. **Visual check**: Edge should appear and stay visible
7. Click "View JSON Data" and verify:
   - FSM has `outputs: [{ name: "state", destinationNodeId: "<multiplexer-id>" }]`
   - Multiplexer has `inputs: [{ nodeId: "<fsm-id>", name: "input" }]`

### Test 2: Check Multiplexer Display
1. Look at Multiplexer node card
2. Should show:
   - Title: Node name
   - Subtitle: "Router (Passive)" 
   - Routes: Number of routing rules
   - Conditions: Number of conditional routes
   - Outputs: Number of output destinations
   - Input: Always shows "1"
3. Should NOT show:
   - "Active" badge with pulse animation
   - "Test State: processing"
   - "Matched: X" stat

## If Connection Still Fails

### Symptom: Connection disappears immediately
**Check**:
1. Browser console for errors
2. Look for `⚠️ [EDGE CREATE] No matching input found`
3. Click "View JSON Data":
   - Does FSM have `outputs` array?
   - Does Multiplexer have `inputs` array?
   - Are node IDs matching?

### Symptom: No edge appears at all
**Check**:
1. Do you see `🔗 [FSM CONNECT]` log in console?
2. Does FSM have a visible "state" output handle on the right side?
3. Does Multiplexer have a visible "input" handle on the left side?
4. Try refreshing the page and reloading the scenario

### Symptom: Console shows errors
**Look for**:
- `Cannot read property 'outputs' of undefined` → FSM initialization failed
- `Handle 'state' not found` → FSM handle IDs not matching
- `Node not found: <id>` → Node ID mismatch in scenario data

## Console Logs to Monitor

When making a connection, you should see this sequence:

```
1. 🔧 [INIT FSM] Creating outputs array for FSM <id> from fsm.outputs: ["state"]
2. 🔗 [CONNECT] Attempting connection: {source, target, sourceHandle, targetHandle}
3. 🔗 [FSM CONNECT] Connecting FSM output: {handleName: "state", outputName: "state"}
4. 🔗 [INPUT HANDLING] Target: StateMultiplexer, handle: input
5. 🔄 [SINGLE-INPUT] StateMultiplexer supports only one connection via "input"
6. 🔗 [CONNECT] After update - Source outputs: [...]
7. 🔗 [CONNECT] After update - Target inputs: [...]
8. ➕ [EDGE CREATE] Creating edge: e-<fsm-id>-state-<multiplexer-id>
```

If you see `⚠️` warnings or missing logs, that indicates where the problem is.

## Files Changed

- ✅ `StateMultiplexerDisplay.tsx` - Simplified display (today)
- ✅ `FSMProcessNodeDisplay.tsx` - Added handle IDs (Fix 13)
- ✅ `GraphVisualization.tsx` - Single/multi input logic (Fix 14)
- ✅ `simulationStore.ts` - FSM outputs initialization (Fix 15)

## What Hasn't Changed

- **Node Inspector Modal** - Still works for editing configs
- **JSON Validation** - Still validates scenario structure  
- **Execution Engine** - Runtime behavior unchanged
- **Other Node Types** - ProcessNode, Queue, Sink, DataSource still work as before

## Next Steps

1. **Test the connection** (FSM → Multiplexer)
2. **Report results**:
   - ✅ If it works: Great! Connection system is complete
   - ❌ If it fails: Share the console logs showing where it breaks
3. **Check the display**: Does Multiplexer look cleaner now?

---

*All fixes are in the current dev environment. Refresh browser to see changes.*
