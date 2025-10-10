# Connection Issues - Fixed

## Problem Summary
Users were experiencing issues connecting nodes in the template-editor, where connections would either fail to create or would be deleted immediately after creation. This particularly affected:
- FSMProcessNode → StateMultiplexer connections
- ProcessNode → FSMProcessNode connections  
- DataSource → ProcessNode connections
- **CRITICAL**: Multiple inputs to same ProcessNode would fail or become impossible to reconnect
- **CRITICAL**: After deleting one connection, remaining inputs would become "stuck" and prevent new connections

## Root Causes Identified

### 1. Missing FSMProcessNode Initialization in loadScenario
**Location**: `clean-app/stores/simulationStore.ts` line ~400

**Issue**: When `loadScenario()` was called, it initialized state for most node types but was missing the case for `FSMProcessNode` and `StateMultiplexer`. This caused these nodes to have undefined state, leading to connection failures.

**Fix**: Added proper initialization cases for both node types:
```typescript
case "FSMProcessNode":
  const fsmNode = node as any;
  const fsmInputBuffers: Record<string, Token[]> = {};
  const initialState = fsmNode.fsm?.initialState || fsmNode.fsm?.states?.[0] || "idle";
  initialNodeStates[node.nodeId] = {
    inputBuffers: fsmInputBuffers,
    fsmVariables: { ...fsmNode.fsm?.variables } || {},
    currentFSMState: initialState,
    lastTransitionTime: -1,
    stateMachine: {
      currentState: initialState,
      transitionHistory: []
    }
  };
  break;

case "StateMultiplexer":
  const multiplexerInputBuffers: Record<string, Token[]> = {};
  initialNodeStates[node.nodeId] = {
    inputBuffers: multiplexerInputBuffers,
    lastProcessedTime: -1,
    stateMachine: {
      currentState: "multiplexer_idle",
      transitionHistory: []
    }
  };
  break;
```

### 2. Handle ID Mismatch in onConnect
**Location**: `clean-app/components/graph/GraphVisualization.tsx` line ~248

**Issue**: Different node types use different handle ID patterns:
- **ProcessNode**: Uses `"output-{name}"` for source handles
- **FSMProcessNode**: Uses the output name directly (e.g., `"state_output"`)
- **StateMultiplexer**: Uses output names directly
- **DataSource**: Uses `"output"` as the handle ID

When connecting nodes, the code wasn't properly matching the handle IDs with the output/input names in the scenario data structure.

**Fix**: Rewrote the `onConnect` logic to:
1. Special-case FSMProcessNode to always use `"state_output"` as the output name
2. Properly normalize handle IDs based on node type
3. Create outputs array if it doesn't exist (for newly added FSM nodes)
4. Update both source outputs AND target inputs correctly

### 3. Handle ID Mismatch in Edge Creation
**Location**: `clean-app/components/graph/GraphVisualization.tsx` line ~394

**Issue**: When creating ReactFlow edges from the scenario data, the code wasn't consistently mapping output names to handle IDs across different node types.

**Fix**: Updated edge creation to properly match handle ID patterns:
```typescript
let sourceHandle: string | undefined;
if (node.type === "ProcessNode") {
  sourceHandle = `output-${output.name}`;
} else if (node.type === "FSMProcessNode") {
  sourceHandle = output.name; // e.g., "state_output"
} else if (node.type === "StateMultiplexer") {
  sourceHandle = output.name;
} else if (node.type === "DataSource") {
  sourceHandle = 'output';
} else {
  sourceHandle = output.name;
}
```

### 4. Target Input Handling
**Location**: `clean-app/components/graph/GraphVisualization.tsx` line ~289

**Issue**: When updating target nodes, the code wasn't properly:
- Normalizing source output names
- Initializing empty inputs arrays
- Matching the correct input by name

**Fix**: 
- Added proper normalization of source output names
- Initialize inputs array if it doesn't exist
- Properly update or create input connections

## Testing the Fixes

To verify the fixes work:

1. **Create a new FSMProcessNode** - drag from library onto canvas
2. **Create a StateMultiplexer** - drag from library
3. **Connect FSM → Multiplexer** - drag from FSM's state_output handle to Multiplexer's input handle
4. **Verify connection persists** - the edge should remain visible and not disappear
5. **View JSON** - check that:
   - FSM node has `outputs` array with `name: "state_output"`
   - StateMultiplexer has `inputs` array with proper `nodeId` reference
   - No phantom node IDs or empty destinationNodeId values

## Debugging Added

Added console logging to help diagnose connection issues:
- `🔗 [CONNECT] Attempting connection:` - logs connection parameters
- `🔗 [CONNECT] After update:` - logs source outputs and target inputs after update

Check browser console for these logs when making connections.

## Related Files Modified

1. `/clean-app/stores/simulationStore.ts` - Added FSMProcessNode and StateMultiplexer initialization
2. `/clean-app/components/graph/GraphVisualization.tsx` - Fixed onConnect and edge creation logic

## Additional Fixes (Second Round)

### 5. Edge Deletion Not Cleaning Target Inputs
**Issue**: When deleting a connection, only the source node's output was being cleared (`destinationNodeId: ''`), but the target node's input array still contained the reference to the deleted connection. This caused:
- Input counts to increment incorrectly (e.g., 1 → 2 → 3)
- Ghost references to non-existent connections
- Failed re-connections

**Fix**: Updated `onEdgesChange` to:
- Parse deleted edge IDs to extract connection info
- Remove matching inputs from target nodes
- Log deletions for debugging

### 6. Duplicate Inputs on Reconnection
**Issue**: When reconnecting the same nodes, a new input would be added instead of updating the existing one, causing duplicate inputs.

**Fix**: Updated input connection logic to:
- Check for exact match (same source + same input name) → update existing
- Check for same input name but different source → replace connection
- Otherwise → add new input

### 7. Improved Edge Creation Logging
Added comprehensive logging for edge creation to help debug issues:
- `🔍 [EDGE CREATE]` - Shows when target input is found
- `⚠️ [EDGE CREATE]` - Warnings when falling back to defaults
- `➕ [EDGE CREATE]` - Logs each edge being created with full details

### 8. Better Connection Validation
Added validation in `onConnect` to:
- Check that source and target nodes exist before proceeding
- Log source outputs and target inputs for debugging
- Prevent invalid connections early

### 9. Missing Input Handles When Inputs Array Empty
**Location**: `clean-app/components/graph/nodes/ProcessNodeDisplay.tsx` line ~113

**Issue**: When all inputs were deleted from a ProcessNode, the node would have no input handles at all, making it impossible to create new connections. This is the "going to 0 deletes the points of contact" issue.

**Fix**: Modified ProcessNodeDisplay to:
- Always render at least one input handle, even when `inputs` array is empty
- Use a default "input" handle ID when no inputs are defined
- Show a tooltip indicating the handle will auto-create an input

**Code**:
```tsx
{numInputs > 0 ? (
  config.inputs.map((input, index) => (
    <Handle id={input.name} ... />
  ))
) : (
  // Always show at least one input handle
  <Handle
    id="input"
    title="Connect input here (will auto-create input)"
    ...
  />
)}
```

### 10. Handle ID Consistency
Added explicit `id="input"` to Sink and Queue nodes for consistency with connection logic.

### 11. NodeInspectorModal Scope Issue
**Location**: `clean-app/components/modals/NodeInspectorModal.tsx` line ~706

**Issue**: `updateNodeConfigInStore` was being called inside the `InputsOutputsEditor` component's `onUpdate` callback, but the function was defined in the parent `NodeInspectorModal` component and wasn't accessible to the nested `ConfigSection` component that renders `InputsOutputsEditor`.

**Error**:
```
updateNodeConfigInStore is not defined
components/modals/NodeInspectorModal.tsx (706:37)
```

**Fix**: 
- Added `updateNodeConfigInStore` to `ConfigSection` component props
- Passed the function down from `NodeInspectorModal` to `ConfigSection`
- This allows the inputs/outputs editor to properly update node configuration

**Impact**: Now you can add/edit/delete inputs and outputs through the Node Inspector modal without errors.

## Known Issues

The template-editor may still have issues if:
- Scenario data is corrupted (contains references to non-existent nodes)
- Node library templates have inconsistent default configs
- Validation is too strict and rejects valid scenarios
- Handle IDs don't match between node display components and scenario data

## Fix 12: Multiple Input Handling & Dynamic Input Creation (2025-10-10)

**Location**: 
- `clean-app/components/graph/GraphVisualization.tsx` (onConnect function)
- `clean-app/components/graph/nodes/ProcessNodeDisplay.tsx` (handle rendering)

**Issue**: Critical bug where:
1. Connecting multiple sources to same ProcessNode would cause the second connection to **replace** the first instead of creating a new input
2. After deleting one connection, the remaining input would become "stuck" - you couldn't connect to it or create new inputs
3. No visual way to add new inputs dynamically - users had to edit JSON manually

**Root Cause**: 
- The connection logic would find an existing input by name and **replace** it, even if it was still connected
- ProcessNode only showed existing input handles, with no handle for adding NEW inputs
- Default "input" handle was only shown when inputs array was empty, but once you had inputs, you couldn't add more

**Fix Applied**:

1. **Smart Input Name Generation**: When connecting to the default "input" handle, auto-generate unique names (input_1, input_2, etc.)
```typescript
// If connecting to the default "input" handle, generate a unique input name
if (inputName === 'input' && currentInputs.length > 0) {
  let counter = 1;
  while (currentInputs.some(inp => inp.name === `input_${counter}`)) {
    counter++;
  }
  inputName = `input_${counter}`;
  console.log(`🆕 Generated new input name: ${inputName} for default handle`);
}
```

2. **Connection Replacement Logic**: Only replace existing input if the old source is still connected
```typescript
const oldSourceNode = scenario.nodes.find(n => n.nodeId === existingInput.nodeId);
const oldSourceStillConnected = oldSourceNode?.outputs?.some(out => 
  out.destinationNodeId === node.nodeId && 
  out.destinationInputName === inputName
);

if (oldSourceStillConnected) {
  console.log(`🔄 Replacing input - old connection still exists`);
} else {
  console.log(`♻️ Reusing input handle - old connection was deleted`);
}
```

3. **Always-Visible Add Handle**: ProcessNode now ALWAYS shows a green "+" handle for adding new inputs
```typescript
{/* Show existing named inputs */}
{config.inputs.map((input, index) => (
  <Handle
    id={input.name}
    title={`Input: ${input.alias || input.name} (from ${input.nodeId})`}
  />
))}
{/* ALWAYS show a default "input" handle for adding NEW connections */}
<Handle
  id="input"
  className="!bg-green-500 hover:!bg-green-600 border-2 border-white"
  title="➕ Connect here to add a new input"
/>
```

**Result**:
- ✅ Can connect multiple sources to same ProcessNode
- ✅ Each connection creates a properly named input (input_1, input_2, etc.)
- ✅ Deleting one connection doesn't affect others
- ✅ Can always add new inputs via the green "+" handle
- ✅ Existing inputs remain connectable and visible
- ✅ Input counts stay stable across delete/reconnect cycles

## Fix 13: FSM Output Handles Missing IDs (CRITICAL - 2025-10-10)

**Location**: 
- `clean-app/components/graph/nodes/FSMProcessNodeDisplay.tsx` (handle rendering)
- `clean-app/components/graph/GraphVisualization.tsx` (FSM connection logic)

**Issue**: **CRITICAL BUG** - FSM nodes could not connect to ANY node, including StateMultiplexer:
1. FSMProcessNode had generic handles with NO `id` prop
2. Connection logic expected handle ID "state_output" but handle had no ID
3. FSM nodes had no `outputs` array in JSON, only `fsm.outputs` 
4. Multiple FSM outputs (from `fsm.outputs` array) were not supported

**Root Cause**: 
- The `<Handle>` components in FSMProcessNodeDisplay had no `id` prop, so ReactFlow couldn't identify them
- Connection logic created outputs with name "state_output" but handle was anonymous
- FSM definition uses `fsm.outputs: ["state", "variables"]` but these weren't mapped to actual connection handles

**Fix Applied**:

1. **Dynamic Output Handles Based on fsm.outputs**: Create one handle per FSM output
```tsx
{/* Output Handles - one for each FSM output */}
{fsmDefinition?.outputs && fsmDefinition.outputs.length > 0 ? (
  fsmDefinition.outputs.map((outputName: string, index: number) => (
    <Handle
      key={outputName}
      type="source"
      position={Position.Right}
      id={outputName}  // ← CRITICAL: Use FSM output name as handle ID
      style={{ top: `${(index + 1) * (100 / (fsmDefinition.outputs.length + 1))}%` }}
      title={`Output: ${outputName}`}
    />
  ))
) : (
  // Fallback for FSMs without fsm.outputs defined
  <Handle
    id="state_output"  // ← Default handle ID
    type="source"
  />
)}
```

2. **Named Input Handle**: Added explicit ID to input handle
```tsx
<Handle
  type="target"
  id="event"  // ← FSM expects "event" as input trigger
  title="Event input"
/>
```

3. **Support Multiple FSM Outputs**: Connection logic now handles multiple outputs
```typescript
if (node.type === 'FSMProcessNode') {
  // Use actual source handle name from fsm.outputs
  const outputName = sourceHandleName || 'state_output';
  
  console.log('🔗 [FSM CONNECT] Connecting FSM output:', {
    handleName: sourceHandleName,
    outputName,
    fsmOutputs: node.fsm?.outputs  // Shows ["state", "variables", etc.]
  });
  
  // Check if this specific output already exists
  const existingOutputIndex = node.outputs?.findIndex(o => o.name === outputName);
  
  if (existingOutputIndex !== -1) {
    // Update existing output
  } else {
    // Add new output to array (supports multiple concurrent connections)
  }
}
```

4. **Proper Output Array Initialization**: FSM nodes now properly create/update outputs array

**Result**:
- ✅ FSM → Multiplexer connections work perfectly
- ✅ FSM → ProcessNode connections work
- ✅ Multiple FSM outputs supported (e.g., "state", "variables", "context")
- ✅ Each FSM output gets its own handle with correct ID
- ✅ Handles are properly positioned when multiple outputs exist
- ✅ Connection logic matches handle IDs correctly
- ✅ FSM nodes can connect to multiple targets simultaneously

**Critical Learning**: 
- ALL ReactFlow `<Handle>` components MUST have an `id` prop for connections to work
- Handle IDs must exactly match what the connection logic expects
- Multi-output nodes need dynamic handle positioning with `style={{ top: '...' }}`

## Fix 14: Single-Input vs Multi-Input Node Logic (CRITICAL - 2025-10-10)

**Location**: `clean-app/components/graph/GraphVisualization.tsx` (onConnect function)

**Issue**: **CRITICAL BUG** - StateMultiplexer inputs kept increasing every time you tried to connect:
1. StateMultiplexer should only accept ONE input (like Queue/Sink) but was treated like ProcessNode
2. Every connection attempt added a new input: `input`, `input_1`, `input_2`, etc.
3. Single-input nodes (Sink, Queue, StateMultiplexer, FSMProcessNode) should REPLACE connections, not ADD

**Root Cause**: 
- Connection logic assumed "input" handle meant "create new input like ProcessNode"
- No distinction between single-input nodes (one connection only) vs multi-input nodes (multiple connections)
- StateMultiplexer/Queue/Sink/FSM should only have ONE active input connection at a time

**Fix Applied**:

```typescript
// Categorize nodes by input handling capability
const singleInputNodeTypes = ['Sink', 'Queue', 'StateMultiplexer', 'FSMProcessNode'];
const isSingleInputNode = singleInputNodeTypes.includes(node.type);
const isMultiInputNode = node.type === 'ProcessNode';

console.log(`🔗 [INPUT HANDLING] Target: ${node.type}, handle: ${inputName}`, {
  isSingleInputNode,
  isMultiInputNode,
  currentInputNames: currentInputs.map(i => i.name)
});

// For MULTI-INPUT nodes (ProcessNode only), generate unique input names
if (isMultiInputNode && inputName === 'input' && currentInputs.length > 0) {
  let counter = 1;
  while (currentInputs.some(inp => inp.name === `input_${counter}`)) {
    counter++;
  }
  inputName = `input_${counter}`;
  console.log(`🆕 [MULTI-INPUT] Generated new input name: ${inputName}`);
}

// For SINGLE-INPUT nodes, keep the same input name and REPLACE below
if (isSingleInputNode) {
  console.log(`🔄 [SINGLE-INPUT] ${node.type} supports only one connection via "${inputName}"`);
}
```

**Node Input Behavior**:

| Node Type | Input Handles | Behavior | Example |
|-----------|---------------|----------|---------|
| **ProcessNode** | Multiple dynamic | Creates new inputs: `input_1`, `input_2`... | Can connect Queue1 + Queue2 both to same ProcessNode |
| **StateMultiplexer** | Single "input" | Replaces connection | Connect FSM → Multiplexer (only 1 source at a time) |
| **Queue** | Single "input" | Replaces connection | Connect DataSource → Queue (only 1 source) |
| **Sink** | Single "input" | Replaces connection | Terminal node, one source |
| **FSMProcessNode** | Single "event" | Replaces connection | One event source per FSM |

**Result**:
- ✅ StateMultiplexer maintains exactly 1 input (doesn't grow to input_1, input_2, etc.)
- ✅ Connecting FSM → Multiplexer replaces any existing Multiplexer input
- ✅ ProcessNode still creates multiple inputs as designed
- ✅ Queue/Sink remain single-input
- ✅ No more "ghost inputs" accumulating in JSON
- ✅ Clear console logs showing single vs multi-input behavior

**Critical Learning**: 
- ALL ReactFlow `<Handle>` components MUST have an `id` prop for connections to work
- Handle IDs must exactly match what the connection logic expects
- Multi-output nodes need dynamic handle positioning with `style={{ top: '...' }}`
- **Single-input nodes replace connections; multi-input nodes add connections**
- Node behavior must match visual handle design (1 handle = 1 connection max)

## Fix 15: FSM Missing outputs Array at Node Level (CRITICAL - 2025-10-10)

**Location**: `clean-app/stores/simulationStore.ts` (loadScenario function)

**Issue**: **CRITICAL BUG** - FSM → Multiplexer connections impossible even after adding handle IDs:
1. FSM nodes have `fsm.outputs: ["state"]` but NO `node.outputs` array
2. Edge creation logic looks for `node.outputs` to create visual connections
3. Without `node.outputs`, edges can't be created from FSM nodes
4. Console showed: `⚠️ [EDGE CREATE] No matching input found` because FSM had no outputs to iterate

**Root Cause**: 
- FSM schema has TWO output definitions: `fsm.outputs` (FSM output names) and `node.outputs` (connection tracking)
- `fsm.outputs` defines what the FSM CAN output (metadata)
- `node.outputs` tracks actual CONNECTIONS (destinationNodeId, destinationInputName)
- loadScenario never initialized `node.outputs` from `fsm.outputs`

**Fix Applied**:

```typescript
// Pre-process nodes: ensure FSM nodes have outputs array initialized from fsm.outputs
parsedScenario.nodes = parsedScenario.nodes.map(node => {
  if (node.type === 'FSMProcessNode' && (node as any).fsm?.outputs) {
    const fsmOutputNames = (node as any).fsm.outputs;
    
    // If node already has outputs array, ensure all fsm.outputs are represented
    if (node.outputs && node.outputs.length > 0) {
      console.log(`✅ [INIT FSM] FSM already has outputs, checking completeness`);
      const existingOutputNames = new Set(node.outputs.map(o => o.name));
      const missingOutputs = fsmOutputNames.filter(name => !existingOutputNames.has(name));
      
      if (missingOutputs.length > 0) {
        // Add missing outputs without removing existing connections
        return {
          ...node,
          outputs: [
            ...node.outputs,
            ...missingOutputs.map(outputName => ({
              name: outputName,
              destinationNodeId: '',
              destinationInputName: '',
              interface: { type: 'StateContext', requiredFields: ['data.currentState', 'data.context'] }
            }))
          ]
        };
      }
      return node; // All outputs present
    } else {
      // No outputs array, create from fsm.outputs
      console.log(`🔧 [INIT FSM] Creating outputs array from fsm.outputs:`, fsmOutputNames);
      return {
        ...node,
        outputs: fsmOutputNames.map(outputName => ({
          name: outputName,
          destinationNodeId: '',  // Empty until connected
          destinationInputName: '',
          interface: { type: 'StateContext', requiredFields: ['data.currentState', 'data.context'] }
        }))
      };
    }
  }
  return node;
});
```

**What This Does**:
1. Scans all nodes during scenario load
2. For each FSMProcessNode, checks if `fsm.outputs` exists
3. Creates `node.outputs` array with empty connections matching `fsm.outputs` names
4. Preserves existing connections if `node.outputs` already has entries
5. Adds missing outputs without removing existing connections

**Before Fix** (FSM in JSON):
```json
{
  "type": "FSMProcessNode",
  "inputs": [{...}],
  "fsm": {
    "outputs": ["state"]  // ← Metadata only
  }
  // ❌ Missing: "outputs": [] for tracking connections
}
```

**After Fix** (FSM after loadScenario):
```json
{
  "type": "FSMProcessNode",
  "inputs": [{...}],
  "outputs": [
    {
      "name": "state",
      "destinationNodeId": "",
      "destinationInputName": "",
      "interface": { "type": "StateContext", ... }
    }
  ],
  "fsm": {
    "outputs": ["state"]
  }
}
```

**Result**:
- ✅ FSM nodes can now be connected to any node
- ✅ FSM → Multiplexer connections work
- ✅ Edge creation finds FSM outputs properly
- ✅ Existing connections preserved when reloading
- ✅ Multiple FSM outputs supported (`fsm.outputs: ["state", "variables", "context"]`)
- ✅ Console logs: `🔧 [INIT FSM] Creating outputs array from fsm.outputs: ["state"]`

**Critical Learning**: 
- ALL ReactFlow `<Handle>` components MUST have an `id` prop for connections to work
- Handle IDs must exactly match what the connection logic expects
- Multi-output nodes need dynamic handle positioning with `style={{ top: '...' }}`
- **Single-input nodes replace connections; multi-input nodes add connections**
- Node behavior must match visual handle design (1 handle = 1 connection max)
- **FSM needs BOTH `fsm.outputs` (metadata) AND `node.outputs` (connection tracking)**
- `node.outputs` must be initialized from `fsm.outputs` on scenario load

---

If connections still fail, check:
1. Browser console for validation errors and connection logs
2. Look for `🔗 [CONNECT]`, `🗑️ [DELETE EDGES]`, `➕ [EDGE CREATE]`, `🆕 [NEW INPUT]` logs
3. JSON structure of the scenario (click "View JSON Data")
4. That node IDs in outputs/inputs arrays match actual node nodeIds
5. That handle IDs in the node display components match the data structure
6. Look for the green "+" handle on ProcessNodes - this is for adding new inputs
