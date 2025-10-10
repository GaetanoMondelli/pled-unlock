# Troubleshooting Connection Issues

## Quick Diagnostic Checklist

If you're having trouble connecting nodes, follow these steps:

### 1. Check Browser Console
Open the browser console (F12) and look for these log messages:

#### When Creating Connections:
- `🔗 [CONNECT] Attempting connection:` - Shows connection details
- `🔗 [CONNECT] After update:` - Shows updated outputs/inputs
- `➕ [EDGE CREATE] Creating edge:` - Shows edge being created

**What to look for:**
- Are sourceHandle and targetHandle defined?
- Do the handle names match what you expect?
- Are outputs/inputs arrays being updated?

#### When Deleting Connections:
- `🗑️ [DELETE EDGES] Deleting edges:` - Shows which edges are being deleted
- `🗑️ Clearing output X on node Y` - Confirms output is cleared
- `🗑️ Removing input X from node Y` - Confirms input is removed

**What to look for:**
- Is the input being removed from the target node?
- Are both source and target being updated?

### 2. Check JSON Structure
Click "View JSON Data" and verify:

#### For Source Nodes (FSM, ProcessNode, DataSource):
```json
{
  "nodeId": "nvzyfy17m",
  "outputs": [
    {
      "name": "state_output",  // Must match handle ID
      "destinationNodeId": "StateMultiplexer_1760039800089",  // Must be actual node ID
      "destinationInputName": "input"  // Must match target's input name
    }
  ]
}
```

#### For Target Nodes (Multiplexer, ProcessNode, Sink):
```json
{
  "nodeId": "StateMultiplexer_1760039800089",
  "inputs": [
    {
      "name": "input",  // Must match handle ID
      "nodeId": "nvzyfy17m",  // Must reference source node
      "sourceOutputName": "state_output"  // Must match source's output name
    }
  ]
}
```

### 3. Common Issues and Solutions

#### Issue: Connection disappears immediately after creation
**Possible causes:**
1. **Missing inputs array on target** - Fixed by initializing empty array
2. **Handle ID mismatch** - Check that handle IDs match between display component and data
3. **Validation error** - Check console for validation errors

**Solution:** Check console logs for the exact cause.

#### Issue: Can't connect to a node - no input handle visible
**Cause:** All inputs were deleted, and the node had no handles to connect to.

**Solution:** NOW FIXED - ProcessNode will always show at least one input handle (labeled "Connect input here") even when the inputs array is empty. This allows you to:
1. Drag a connection to the handle
2. The connection will auto-create an input with name "input"
3. You can then edit the input details in the Node Inspector modal

#### Issue: Input count keeps increasing (1 → 2 → 3)
**Cause:** Inputs weren't being removed on edge deletion

**Solution:** This is now fixed - inputs are properly removed when edges are deleted.

#### Issue: Can't connect FSM to Multiplexer
**Possible causes:**
1. **FSM has no outputs array** - Should be initialized by library template
2. **Handle ID mismatch** - FSM uses "state_output", Multiplexer uses "input"
3. **Missing target inputs** - Multiplexer should have input array

**Solution:** Check that:
- FSM has `outputs: [{ name: "state_output", ... }]`
- Multiplexer has `inputs: [{ name: "input", ... }]`
- Connection uses correct handle IDs

#### Issue: Connection works in one direction but not the other
**Cause:** Different node types use different handle ID patterns:
- **ProcessNode**: `output-{name}` for outputs
- **FSMProcessNode**: `{name}` directly (e.g., "state_output")
- **StateMultiplexer**: `{name}` directly
- **DataSource**: "output" (fixed)

**Solution:** Check the node display component to see what handle IDs it uses.

### 4. Manual Fix for Corrupted Scenario

If your scenario JSON is corrupted:

1. **Export JSON** - Click "View JSON Data" and copy
2. **Find corrupted connections:**
   - Look for `destinationNodeId: ""` (empty)
   - Look for references to non-existent node IDs
   - Look for duplicate inputs
3. **Fix manually:**
   - Remove empty destinationNodeId entries
   - Update node ID references to match actual nodes
   - Remove duplicate inputs
4. **Import fixed JSON** - Paste back into editor

### 5. Reset to Clean State

If all else fails:
1. Click "New Template" to start fresh
2. Add nodes one at a time
3. Connect them one at a time
4. Check console after each action
5. Verify JSON after each connection

## Handle ID Reference

| Node Type | Output Handle ID | Input Handle ID |
|-----------|-----------------|-----------------|
| DataSource | "output" | N/A |
| ProcessNode | "output-{name}" | "{name}" |
| FSMProcessNode | "state_output" | "input" |
| StateMultiplexer | "{name}" (e.g., "output1") | "input" |
| Sink | N/A | "input" |
| Queue | "output" | "input" |

## Getting Help

If you still have issues:
1. Copy all console logs starting with 🔗, 🗑️, ➕, ⚠️
2. Export your scenario JSON
3. Note the exact steps to reproduce
4. Report the issue with all this information
