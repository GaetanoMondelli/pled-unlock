# FSM Connection Debugging - FIX 16

## Problem
- **FSM cannot connect to ANY node** (not just Multiplexer)
- **When connecting to Processor:** No visible edge but input count increases
- **This indicates a fundamental edge creation bug**

## Changes Made (Fix 16)

### 1. Added Comprehensive Logging
**File:** `components/graph/GraphVisualization.tsx`

#### In `onConnect` (line ~292):
- Added validation to check if `sourceHandle` is provided
- Added logging for FSM outputs from `fsm.outputs` array
- Added error if sourceHandle is missing

#### In Edge Creation (line ~645):
- Added logging for EVERY output check before edge creation
- Shows why edges are/aren't being created for each output
- Logs detailed target input matching logic

## What To Check Now

### Step 1: Open Browser Console
1. Open http://localhost:3002 (or your dev server port)
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Keep it visible while testing

### Step 2: Load Your Scenario
When you load a scenario, you should see:
```
🔧 [INIT FSM] Creating outputs array for FSM <nodeId>...
```
If you DON'T see this, the loadScenario initialization isn't running.

### Step 3: Try Connecting FSM → Multiplexer
1. Drag from FSM's output handle (right side)
2. Drop on Multiplexer's input handle (left side)

**Expected Console Logs:**
```
🔗 [CONNECT] Attempting connection: {
  source: "FSMProcessNode_...",
  sourceType: "FSMProcessNode",
  sourceHandle: "state_output",  // ← Should be the FSM output name
  sourceOutputs: ["state_output"],
  sourceFsmOutputs: ["state_output"],
  target: "StateMultiplexer_...",
  targetType: "StateMultiplexer",
  targetHandle: "input"
}

🔗 [FSM CONNECT] Connecting FSM output: {
  handleName: "state_output",
  outputName: "state_output",
  fsmOutputs: ["state_output"],
  existingOutputs: ["state_output"]
}

🔄 Updating existing FSM output: state_output

➕ Adding new input input on StateMultiplexer_... from FSMProcessNode_...

🔗 [CONNECT] After update - Source outputs: [{ name: "state_output", destinationNodeId: "..." }]
🔗 [CONNECT] After update - Target inputs: [{ name: "input", nodeId: "...", sourceOutputName: "state_output" }]
```

**Then during edge visualization:**
```
🔍 [EDGE CHECK] Checking output from FSMProcessNode_...:
  outputName: "state_output"
  destinationNodeId: "StateMultiplexer_..."
  destinationInputName: "input"
  hasDestination: true
  isVisible: true

➕ [EDGE CREATE] Creating edge: e-FSMProcessNode_...-state_output-StateMultiplexer_... {
  sourceHandle: "state_output",
  targetHandle: "input",
  sourceType: "FSMProcessNode",
  targetType: "StateMultiplexer"
}
```

### Step 4: Try Connecting FSM → ProcessNode
Same process but connecting to a Processor.

**Key Differences:**
- ProcessNode is multi-input (can accept multiple connections)
- Should generate new input names like `input_1`, `input_2` if `input` is taken

**Expected Logs:**
```
🔗 [INPUT HANDLING] Target: ProcessNode, handle: input, existingInputs: 0
🆕 [MULTI-INPUT] Generated new input name: input_1 for ProcessNode
```

### Step 5: Check JSON Data
After making a connection, click "View JSON Data" button and check:

**FSM Node should have:**
```json
{
  "nodeId": "FSMProcessNode_...",
  "type": "FSMProcessNode",
  "outputs": [
    {
      "name": "state_output",
      "destinationNodeId": "StateMultiplexer_...",  // ← Should match target
      "destinationInputName": "input"
    }
  ],
  "fsm": {
    "outputs": ["state_output"]  // ← Should match outputs[].name
  }
}
```

**Target Node should have:**
```json
{
  "nodeId": "StateMultiplexer_...",
  "type": "StateMultiplexer",
  "inputs": [
    {
      "name": "input",
      "nodeId": "FSMProcessNode_...",  // ← Should match FSM
      "sourceOutputName": "state_output"  // ← Should match FSM output name
    }
  ]
}
```

## Common Issues

### Issue 1: No `sourceHandle` in Connection
**Symptom:** Console shows `❌ [CONNECT] No sourceHandle provided!`

**Cause:** FSM output handles not rendering correctly

**Fix:** Check FSMProcessNodeDisplay.tsx - handles should use output names from `fsm.outputs`

### Issue 2: Edge Not Visible But Input Added
**Symptom:** 
- Input count increases on target node
- No edge visible on canvas
- Console shows edge creation log

**Cause:** Handle ID mismatch between:
- What FSM Display renders: `<Handle id={outputName} />`
- What edge creation expects: `sourceHandle: output.name`

**Debug:**
1. Check console for `sourceHandle` value in connection log
2. Check console for `sourceHandle` value in edge create log
3. They must match exactly

### Issue 3: Edge Creation Skipped
**Symptom:** 
- Console shows `🔍 [EDGE CHECK]` but no `➕ [EDGE CREATE]`
- Logs show `isVisible: false`

**Cause:** Target node not in visible nodes set (filtered out by group/tag view)

**Fix:** Make sure you're in "All Nodes" view or correct group view

### Issue 4: Target Input Not Found
**Symptom:** Console shows:
```
⚠️ [EDGE CREATE] No matching input found (inputs: input[from:xxx,out:yyy]), using destinationInputName: input
```

**Cause:** Target node's input `sourceOutputName` doesn't match FSM's output name

**Debug:**
1. Check FSM output name in `outputs[].name`
2. Check target input `sourceOutputName`
3. They must match

**This happens if:**
- Output name changed after connection
- Connection created with wrong sourceHandle
- Input created with wrong sourceOutputName

## Critical Handle ID Rules

### FSM Output Handles
**Rendered in FSMProcessNodeDisplay.tsx:**
```tsx
<Handle 
  id={outputName}  // Direct output name from fsm.outputs
  type="source"
/>
```

**Example:** If `fsm.outputs: ["state_output"]`, handle ID is `"state_output"`

### Edge Creation sourceHandle
**In edge creation (GraphVisualization.tsx):**
```tsx
if (node.type === "FSMProcessNode") {
  sourceHandle = output.name;  // Use output name directly
}
```

**These MUST match!**

### Connection sourceHandle
**From ReactFlow Connection params:**
```tsx
params.sourceHandle  // This is what ReactFlow gives us from the handle that was dragged
```

**When user drags from FSM output handle with `id="state_output"`, `params.sourceHandle` will be `"state_output"`**

## Next Steps If Still Broken

### 1. Share Full Console Output
Copy everything from console when you:
1. Load scenario
2. Try to make connection
3. Check if edge appears

### 2. Share JSON Data
Click "View JSON Data" and share:
- The FSM node
- The target node (Multiplexer or Processor)

### 3. Check FSM Template
In `components/library/NodeLibraryPanel.tsx`, FSM template should have:
```tsx
outputs: [
  {
    name: "state_output",  // ← This name
    ...
  }
],
fsm: {
  ...
  outputs: ["state_output"]  // ← Must match this
}
```

### 4. Hard Refresh Browser
Sometimes browser cache causes issues:
1. Close all tabs with the app
2. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Or use incognito mode

### 5. Check Network Tab
If edges still don't appear:
1. Open Network tab in DevTools
2. Try making connection
3. Check if any requests fail
4. Check if scenario update request succeeds

## Development Server
Your dev server is running on **http://localhost:3002**

If you need to restart:
```bash
cd /Users/gaetano/dev/docusign-unlocked/clean-app
npm run dev
```
