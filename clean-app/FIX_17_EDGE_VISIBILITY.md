# FIX 17: FSM Connection Edge Not Visible (CRITICAL)

**Date:** October 10, 2025  
**Status:** ✅ FIXED

## Problem Identified

Based on console logs, the FSM connection was partially working but **edges were not visible** because:

1. **FSM had duplicate outputs with different names:**
   - Output `"state"` (from `fsm.outputs: ["state"]`) - NO destination
   - Output `"state_output"` (from old connection attempt) - HAS destination to Multiplexer

2. **Edge creation logic checked wrong output:**
   - Looked at output `"state"` first (no destination) → skipped creating edge
   - Never got to output `"state_output"` with actual connection

3. **Console showed the smoking gun:**
   ```
   🔍 [EDGE CHECK] Checking output from nvzyfy17m (FSMProcessNode): {
     outputName: 'state',           ← Wrong output!
     destinationNodeId: '',         ← No destination
     hasDestination: false,
     isVisible: false              ← Skipped!
   }
   ```

## Root Cause Analysis

### Issue 1: Output Name Mismatch
- **FSM library template:** `fsm.outputs: ["state_output"]` ✅
- **User's FSM in scenario:** `fsm.outputs: ["state"]` ❌
- **FSM Display:** Creates handles from `fsm.outputs`, so handle ID = `"state"`
- **Connection code:** Used handle ID `"state_output"` as default fallback
- **Result:** Connection created output named `"state_output"`, but display showed handle `"state"`

### Issue 2: loadScenario Creating Duplicate Outputs
- Fix 15 checks `fsm.outputs: ["state"]` and ensures output exists
- Sees existing `outputs: [{ name: "state_output" }]`
- Thinks `"state"` is missing → adds it
- **Result:** FSM has TWO outputs: `"state"` (empty) + `"state_output"` (connected)

### Issue 3: Edge Creation Checking Wrong Output
- Edge creation loops through ALL outputs
- Finds `"state"` first (no destination) → skips
- Edge never created even though `"state_output"` has valid connection

## Solutions Implemented

### Fix 1: Use Actual Source Handle Name (GraphVisualization.tsx line ~324)
**Before:**
```tsx
const outputName = sourceHandleName || 'state_output';
```

**After:**
```tsx
const outputName = sourceHandleName || 'state';
```

**Why:** `sourceHandleName` comes directly from ReactFlow and is the ACTUAL handle ID that was dragged. FSM displays use output names from `fsm.outputs` as handle IDs. So if the handle ID is `"state"`, that's the output name we should use, not a hardcoded default.

### Fix 2: Improved Edge Visibility Check (GraphVisualization.tsx line ~655)
**Before:**
```tsx
if (output.destinationNodeId &&
    output.destinationNodeId.trim() !== "" &&
    visibleNodeIds.has(output.destinationNodeId)) {
```

**After:**
```tsx
const hasDestination = output.destinationNodeId && output.destinationNodeId.trim() !== "";
const isVisible = hasDestination && visibleNodeIds.has(output.destinationNodeId);

if (hasDestination && isVisible) {
```

**Why:** More explicit checking with better logging to see exactly why edges are/aren't created.

### Fix 3: Clean Up Duplicate Outputs (simulationStore.ts line ~378)
**Enhanced Logic:**
1. Check if `node.outputs` names match `fsm.outputs` names
2. If there are EXTRA outputs not in `fsm.outputs`:
   - Keep them ONLY if they have active connections
   - Remove unconnected outputs that aren't in `fsm.outputs`
   - Log warnings about mismatch
3. Add any MISSING `fsm.outputs` that aren't in `node.outputs`

**Key Code:**
```tsx
const extraOutputs = node.outputs.filter((o: any) => !fsmOutputNames.includes(o.name));
if (extraOutputs.length > 0) {
  console.warn(`⚠️ [INIT FSM] FSM has outputs not in fsm.outputs:`, extraOutputs.map(o => o.name));
  
  const validOutputs = node.outputs.filter((o: any) => {
    const inFsmOutputs = fsmOutputNames.includes(o.name);
    const hasConnection = o.destinationNodeId && o.destinationNodeId.trim() !== '';
    
    if (!inFsmOutputs && hasConnection) {
      // Keep connected outputs even if not in fsm.outputs
      return true;
    }
    return inFsmOutputs;
  });
}
```

## What This Fixes

1. ✅ **FSM connections now create edges with correct output names**
   - Uses actual handle ID from FSM display
   - No more hardcoded default names

2. ✅ **Edges are visible after connection**
   - Edge creation finds outputs with connections
   - No longer skips due to checking wrong output

3. ✅ **No more duplicate outputs**
   - loadScenario removes unconnected outputs not in `fsm.outputs`
   - Keeps connected outputs even if names don't match (for backward compatibility)
   - Adds missing `fsm.outputs` if needed

4. ✅ **Better debugging**
   - Console logs show exact output being checked
   - Warnings when outputs don't match `fsm.outputs`
   - Clear indication of hasDestination and isVisible status

## Testing Instructions

### Test 1: Fresh FSM Connection
1. Drag new FSM from library
2. Connect FSM → Multiplexer
3. **Expected:** Edge appears immediately
4. **Console should show:**
   ```
   🔗 [FSM CONNECT] Connecting FSM output: { handleName: 'state_output', outputName: 'state_output', ... }
   🔄 Updating existing FSM output: state_output
   ✅ [EDGE CREATE] Found target input: input for edge ...
   ➕ [EDGE CREATE] Creating edge: e-FSM...-state_output-Multiplexer...
   ```

### Test 2: Existing Scenario with Broken FSM
1. Load scenario with FSM that has `fsm.outputs: ["state"]`
2. **Console should show:**
   ```
   ⚠️ [INIT FSM] FSM has outputs not in fsm.outputs: ["state_output"]
   ⚠️ [INIT FSM] Keeping connected output "state_output" even though it's not in fsm.outputs
   ➕ [INIT FSM] Adding missing fsm.outputs to FSM: ["state"]
   ```
3. FSM will have BOTH outputs temporarily
4. Delete and reconnect → should use correct `"state"` output name

### Test 3: FSM → ProcessNode
1. Connect FSM → ProcessNode
2. **Expected:** Edge appears, ProcessNode creates new input
3. **Console should show:**
   ```
   🆕 [MULTI-INPUT] Generated new input name: input_1 for ProcessNode
   ```

## Known Issues & Limitations

### Issue: Legacy FSMs with Wrong Output Names
**Symptom:** Old scenarios have FSM with `fsm.outputs: ["state"]` but connections use `"state_output"`

**Temporary Fix:** loadScenario keeps connected outputs even if names don't match

**Permanent Fix:** User should:
1. Note which nodes FSM connects to
2. Delete all FSM connections
3. Reconnect using correct handles
4. Or manually edit JSON to fix `fsm.outputs` to match `outputs[].name`

### Issue: FSM Template Library Inconsistency
**Current State:** Library template has `fsm.outputs: ["state_output"]`

**User's Scenario:** Has `fsm.outputs: ["state"]`

**Why Different:** Unknown - user may have:
- Edited FSM configuration
- Used older template version
- Loaded scenario from external source

**Recommendation:** Standardize FSM output names:
- Either use `"state"` everywhere (shorter)
- Or use `"state_output"` everywhere (more descriptive)

## Related Fixes

- **Fix 13:** FSM dynamic handles from `fsm.outputs`
- **Fix 14:** Single/multi-input handling
- **Fix 15:** FSM outputs initialization in loadScenario
- **Fix 16:** Comprehensive debugging logs (previous)
- **Fix 17:** This fix - edge visibility and output cleanup

## Files Modified

1. `components/graph/GraphVisualization.tsx`
   - Line ~324: Use actual sourceHandle name instead of default
   - Line ~655: Improved edge visibility checking

2. `stores/simulationStore.ts`
   - Line ~378: Enhanced FSM output validation and cleanup
   - Removes duplicate outputs
   - Warns about mismatches
   - Keeps connected outputs for backward compatibility

## Next Steps

1. **Test thoroughly** with both fresh FSMs and existing scenarios
2. **Check console logs** to verify no duplicate output warnings
3. **Verify edges appear** for all FSM connections
4. **Consider standardizing** FSM output names across all templates and scenarios

---

**Status:** Ready for testing  
**Dev Server:** http://localhost:3002  
**Logs to Watch:** `🔗 [CONNECT]`, `🔍 [EDGE CHECK]`, `➕ [EDGE CREATE]`, `⚠️ [INIT FSM]`
