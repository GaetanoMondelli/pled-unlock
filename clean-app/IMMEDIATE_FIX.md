# IMMEDIATE FIX FOR FSM CONNECTION

## The Problem
Your FSM node is missing the `outputs` array. It only has `fsm.outputs` (metadata) but not `node.outputs` (connection tracking).

## What You Have (Broken)
```json
{
  "nodeId": "nvzyfy17m",
  "type": "FSMProcessNode",
  "inputs": [...],
  "fsm": {
    "outputs": ["state"]  // ← Only metadata, no connection array!
  }
  // ❌ Missing: "outputs": []
}
```

## What You Need (Fixed)
```json
{
  "nodeId": "nvzyfy17m",
  "type": "FSMProcessNode",
  "inputs": [...],
  "outputs": [
    {
      "name": "state",
      "destinationNodeId": "",
      "destinationInputName": "",
      "interface": {
        "type": "StateContext",
        "requiredFields": ["data.currentState", "data.context"]
      }
    }
  ],
  "fsm": {
    "outputs": ["state"]
  }
}
```

## Two Ways to Fix

### Option 1: Use the Fixed Scenario (EASIEST)
1. Copy the contents of `clean-app/test-scenario-fixed.json`
2. In your template editor, click "Load Scenario" or "Import JSON"
3. Paste the fixed JSON
4. Now try connecting FSM → Multiplexer

### Option 2: Let loadScenario Fix It
1. **Refresh your browser** (Cmd+R or F5) - this ensures latest code is loaded
2. Open browser console (Cmd+Option+J on Mac, F12 on Windows)
3. Load your existing scenario
4. **Look for this log**: `🔧 [INIT FSM] Creating outputs array for FSM nvzyfy17m from fsm.outputs: ["state"]`
5. If you see that log, the FSM is now ready to connect!
6. Try connecting FSM → Multiplexer

## Testing the Connection

Once the FSM has its outputs array:

1. **Find the FSM node** (State Machine) - should show "state" output handle on right side
2. **Find the Multiplexer** (State Router) - should show "input" handle on left side
3. **Drag from FSM's "state" handle → Multiplexer's "input" handle**
4. **Check console for**:
   ```
   🔗 [FSM CONNECT] Connecting FSM output: {handleName: "state", outputName: "state"}
   🔄 [SINGLE-INPUT] StateMultiplexer supports only one connection via "input"
   ➕ [EDGE CREATE] Creating edge: e-nvzyfy17m-state-StateMultiplexer_1760039800089
   ```
5. **Visual check**: Edge should appear and stay visible
6. **View JSON**: FSM should show:
   ```json
   "outputs": [{
     "name": "state",
     "destinationNodeId": "StateMultiplexer_1760039800089",
     "destinationInputName": "input"
   }]
   ```

## Why This Happened

Your scenario was created/saved BEFORE Fix 15 was implemented. Old scenarios have FSM nodes without the `outputs` array. The fix (in `simulationStore.ts`) automatically adds the missing array when loading, but you need to:

1. **Refresh the browser** to get the latest code
2. **Reload the scenario** to trigger the initialization
3. **Then try connecting**

## Multiplexer Display Updates

The Multiplexer is now much simpler:
- ❌ Removed: "Active" badge (passive component)
- ❌ Removed: "Test State" (not relevant until execution)
- ❌ Removed: "Matched" count (only meaningful during runtime)
- ✅ Shows: "Routes → Outputs" (e.g., "2 → 3")
- ✅ Shows: Subtitle "Router (Passive)"

## If Still Not Working

Check browser console for:
- ❌ **No `🔧 [INIT FSM]` log** → Refresh browser, code didn't update
- ❌ **`Cannot read property 'outputs'`** → FSM outputs array missing
- ❌ **`Handle 'state' not found`** → FSM handle IDs don't match
- ❌ **Edge disappears immediately** → Check for validation errors in console

Then share the exact console logs with me!
