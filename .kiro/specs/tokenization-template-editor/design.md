# Design Document

## Overview

This design document outlines the implementation of a visual tokenization template editor that directly copies and extends the proven, working tokenization_demo. The primary goal is to avoid the "Maximum update depth exceeded" React errors that have plagued previous attempts by following the exact patterns that work in the existing demo.

## Architecture

### Core Principle: Copy What Works

The implementation will start by directly copying the working tokenization_demo structure:

1. **Exact Store Structure**: Copy `tokenization_demo/stores/simulationStore.ts` exactly
2. **Exact Component Structure**: Copy all working components from `tokenization_demo/components/`
3. **Exact Simulation Logic**: Use the proven simulation engine without modifications
4. **Exact UI Patterns**: Replicate the working interaction patterns

### Research Findings from Working Demo

After analyzing the working tokenization_demo and the existing simulation library in packages/nextjs/lib/simulation/, these patterns prevent React infinite loops:

#### State Management Patterns That Work
```typescript
// From working simulationStore.ts - these patterns work:
const useSimulationStore = create<SimulationState>((set, get) => ({
  // Direct state updates without derived state
  _updateNodeState: (nodeId, partialState) => {
    set(state => ({
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: { ...state.nodeStates[nodeId], ...partialState },
      }
    }));
  },
  
  // Careful event counter management
  _logNodeActivity: (nodeIdForLog, logCoreDetails, timestamp) => {
    const currentSequence = get().eventCounter;
    set(stateFS => ({ eventCounter: stateFS.eventCounter + 1 }));
    // ... rest of logging logic
  }
}));
```

#### Component Update Patterns That Work
```typescript
// From GraphVisualization.tsx - these useEffect patterns work:
useEffect(() => {
  if (scenario) {
    // Direct state setting without dependencies that cause loops
    const initialNodes = scenario.nodes.map(node => ({ /* ... */ }));
    setRfNodes(initialNodes);
  }
}, [scenario]); // Only scenario dependency

useEffect(() => {
  setRfNodes(prevNodes =>
    prevNodes.map(rfNode => {
      // Direct mapping without state dependencies that cause loops
      const nodeConfig = nodesConfig[rfNode.id];
      const state = nodeStates[rfNode.id];
      // ... update logic
    })
  );
}, [nodeStates, nodesConfig, currentTime]); // Stable dependencies
```

## Components

### 1. Core Architecture (Copy Exactly)

#### File Structure Analysis
```
packages/nextjs/
├── stores/
│   └── simulationStore.ts ✅ (already exists and matches tokenization_demo)
├── lib/simulation/
│   ├── types.ts ✅ (already exists and matches tokenization_demo)
│   ├── validation.ts ✅ (already exists and matches tokenization_demo)
│   └── formulaEngine.ts ✅ (already exists and matches tokenization_demo)
├── components/graph/ ❌ (NEED TO COPY)
│   ├── GraphVisualization.tsx (copy from tokenization_demo)
│   └── nodes/ (copy all node components from tokenization_demo)
└── components/modals/ ❌ (NEED TO COPY)
    ├── NodeInspectorModal.tsx (copy from tokenization_demo)
    ├── TokenInspectorModal.tsx (copy from tokenization_demo)
    └── GlobalLedgerModal.tsx (copy from tokenization_demo)
```

#### Key Working Patterns from tokenization_demo/lib/simulation/

1. **Zod Schema Validation**: The types.ts uses Zod schemas for runtime validation
2. **Union Types**: AnyNodeSchema uses z.union() for type safety
3. **Scenario Validation**: validateScenario() provides comprehensive error checking
4. **Formula Engine**: Uses expr-eval Parser with security restrictions
5. **Token History**: Complete audit trail with HistoryEntry records

#### Dependencies Analysis
Looking at the existing package.json and tokenization_demo:
```json
{
  "reactflow": "^11.x.x", // ❌ NEED TO ADD - For graph visualization
  "expr-eval": "^2.x.x", // ✅ ALREADY EXISTS - Used in formulaEngine.ts
  "react-hot-toast": "^2.x.x" // ✅ ALREADY EXISTS - For notifications
}
```

#### ID Generation Patterns
```typescript
// ✅ ALREADY EXISTS - packages/nextjs/lib/nanoid.ts
import { nanoid } from '@/lib/nanoid';

// Working patterns from simulationStore.ts:
_createToken: (originNodeId, value, timestamp, sourceTokens = []) => {
  const newToken: Token = {
    id: nanoid(8), // 8-character unique ID for tokens
    value,
    createdAt: timestamp,
    originNodeId,
    history: [],
  };
  // ... rest of token creation
}

// For new nodes:
const createNewNode = (type: string, position: Position) => ({
  nodeId: nanoid(12), // 12-character unique ID for nodes
  type,
  displayName: `${type}_${nanoid(4)}`, // Short suffix for display
  position,
  // ... type-specific properties
});
```

#### Critical Working Patterns from tokenization_demo

1. **Store State Management**: 
   - Uses Zustand create() with get/set pattern
   - Avoids derived state in store
   - Uses _updateNodeState() helper for atomic updates

2. **Component Update Cycles**:
   - useEffect with stable dependencies only
   - No computed values in dependency arrays
   - Direct state mapping without complex derivations

3. **ReactFlow Integration**:
   - Separate state for RF nodes/edges
   - Updates RF state based on simulation state
   - No circular dependencies between RF and simulation state

### 2. Template Editor Extensions (Add Carefully)

After copying the working demo exactly, add these extensions:

#### Component Palette
```typescript
import { nanoid } from '@/lib/nanoid';

interface ComponentPalette {
  categories: {
    sources: ComponentType[];
    processors: ComponentType[];
    storage: ComponentType[];
    sinks: ComponentType[];
  };
}

// Helper function for creating new nodes with proper IDs
const createDefaultNode = (type: string, position: Position = { x: 100, y: 100 }): AnyNode => {
  const nodeId = nanoid(12);
  const baseNode = {
    nodeId,
    displayName: `${type}_${nanoid(4)}`,
    position,
  };

  switch (type) {
    case 'DataSource':
      return {
        ...baseNode,
        type: 'DataSource',
        interval: 3,
        valueMin: 1,
        valueMax: 10,
        destinationNodeId: '', // Will be set when connected
      } as DataSourceNode;
    
    case 'Queue':
      return {
        ...baseNode,
        type: 'Queue',
        timeWindow: 10,
        aggregationMethod: 'sum',
        capacity: 10,
        destinationNodeId: '',
      } as QueueNode;
    
    case 'ProcessNode':
      return {
        ...baseNode,
        type: 'ProcessNode',
        inputNodeIds: [],
        outputs: [{
          formula: 'inputs.source.value * 2',
          destinationNodeId: '',
        }],
      } as ProcessNode;
    
    case 'Sink':
      return {
        ...baseNode,
        type: 'Sink',
      } as SinkNode;
    
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
};

// Add to existing page without modifying core simulation logic
const ComponentPalette: React.FC = () => {
  const { scenario, loadScenario } = useSimulationStore();
  
  const addComponent = useCallback((type: string) => {
    // Modify scenario object directly, following working patterns
    const newNode = createDefaultNode(type);
    const updatedScenario = {
      ...scenario,
      nodes: [...scenario.nodes, newNode]
    };
    loadScenario(updatedScenario); // Use existing working method
  }, [scenario, loadScenario]);
  
  return (
    <div className="component-palette">
      {/* Palette UI */}
    </div>
  );
};
```

#### Drag and Drop (Extend ReactFlow)
```typescript
// Extend existing GraphVisualization.tsx carefully
const onDrop = useCallback((event: React.DragEvent) => {
  event.preventDefault();
  const type = event.dataTransfer.getData('application/reactflow');
  const position = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });
  
  // Use existing store methods to avoid state issues
  const newNode = createDefaultNode(type, position);
  const updatedScenario = {
    ...scenario,
    nodes: [...scenario.nodes, newNode]
  };
  loadScenario(updatedScenario);
}, [scenario, loadScenario, screenToFlowPosition]);

// Connection handling with proper ID management
const onConnect = useCallback((params: Connection) => {
  const { source, target, sourceHandle, targetHandle } = params;
  
  // Update the scenario to reflect the new connection
  const updatedScenario = {
    ...scenario,
    nodes: scenario.nodes.map(node => {
      if (node.nodeId === source) {
        // Update source node's destination
        if (node.type === 'DataSource' || node.type === 'Queue') {
          return { ...node, destinationNodeId: target };
        } else if (node.type === 'ProcessNode') {
          // Update specific output destination
          const outputIndex = parseInt(sourceHandle?.replace('output-', '') || '0');
          const updatedOutputs = [...node.outputs];
          updatedOutputs[outputIndex] = { ...updatedOutputs[outputIndex], destinationNodeId: target };
          return { ...node, outputs: updatedOutputs };
        }
      } else if (node.nodeId === target && node.type === 'ProcessNode') {
        // Update target ProcessNode's input list
        return {
          ...node,
          inputNodeIds: [...new Set([...node.inputNodeIds, source])] // Avoid duplicates
        };
      }
      return node;
    })
  };
  
  loadScenario(updatedScenario);
}, [scenario, loadScenario]);
```

### 3. Message Interface System

#### Message Type Definitions
```typescript
interface MessageInterface {
  name: string;
  fields: {
    [fieldName: string]: {
      type: 'number' | 'string' | 'boolean' | 'object';
      description: string;
      required: boolean;
    };
  };
}

interface ComponentWithMessages extends AnyNode {
  inputMessageTypes?: string[];
  outputMessageTypes?: string[];
}
```

#### Formula Validation with Message Fields
```typescript
// Extend existing formulaEngine.ts
export function validateFormulaWithMessageTypes(
  formula: string,
  inputMessageTypes: MessageInterface[]
): { valid: boolean; availableFields: string[]; error?: string } {
  const availableFields = inputMessageTypes.flatMap(msg => 
    Object.keys(msg.fields).map(field => `inputs.${msg.name}.${field}`)
  );
  
  // Use existing expr-eval parser
  try {
    const expr = parser.parse(formula);
    return { valid: true, availableFields };
  } catch (error) {
    return { valid: false, availableFields, error: error.message };
  }
}
```

## Data Models

### Extended Scenario Schema
```typescript
// Extend existing types.ts without breaking compatibility
interface ExtendedScenario extends Scenario {
  messageInterfaces?: MessageInterface[];
  metadata?: {
    name: string;
    description: string;
    version: string;
    author: string;
  };
}

// Maintain backward compatibility
const ExtendedScenarioSchema = ScenarioSchema.extend({
  messageInterfaces: z.array(MessageInterfaceSchema).optional(),
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    author: z.string(),
  }).optional(),
});
```

## Error Handling

### Preventing React Infinite Loops

#### 1. State Update Patterns
```typescript
// DO: Use stable dependencies
useEffect(() => {
  // Update logic here
}, [stableValue1, stableValue2]);

// DON'T: Use derived or computed values as dependencies
useEffect(() => {
  // This can cause loops
}, [computedValue, derivedState]);
```

#### 2. Event Handler Patterns
```typescript
// DO: Use useCallback with stable dependencies
const handleNodeClick = useCallback((nodeId: string) => {
  setSelectedNodeId(nodeId);
}, []); // Empty deps if no external dependencies

// DON'T: Create new functions on every render
const handleNodeClick = (nodeId: string) => {
  setSelectedNodeId(nodeId);
};
```

#### 3. Store Update Patterns
```typescript
// DO: Use the working store patterns exactly
const updateNode = useCallback((nodeId: string, updates: any) => {
  const { scenario, loadScenario } = useSimulationStore.getState();
  const updatedScenario = {
    ...scenario,
    nodes: scenario.nodes.map(node => 
      node.nodeId === nodeId ? { ...node, ...updates } : node
    )
  };
  loadScenario(updatedScenario);
}, []);

// DON'T: Create complex state derivations
```

## Testing Strategy

### 1. Copy Verification
- Verify copied components render without errors
- Verify simulation runs exactly like tokenization_demo
- Test all interaction patterns work identically

### 2. Extension Testing
- Add one feature at a time
- Test after each addition
- Rollback immediately if React errors occur

### 3. Error Prevention
- Use React DevTools Profiler to detect update loops
- Monitor console for warnings
- Test with React StrictMode enabled

## Implementation Plan

### Phase 1: Direct Copy (No Modifications)
1. ✅ Verify simulation library already exists (types.ts, validation.ts, formulaEngine.ts)
2. ✅ Verify simulationStore.ts already exists and matches
3. ❌ Copy missing components from tokenization_demo:
   - components/graph/GraphVisualization.tsx
   - components/graph/nodes/ (all node display components)
   - components/modals/ (NodeInspector, TokenInspector, GlobalLedger)
4. ❌ Add missing dependency: reactflow
5. ❌ Copy scenario.json to public/ directory
6. ❌ Update template-editor page to use copied components
7. Verify everything works exactly like the demo

### Phase 2: Minimal Extensions
1. Add component palette (separate component, no store modifications)
2. Add drag-and-drop (extend existing ReactFlow setup)
3. Test thoroughly after each addition

### Phase 3: Message Interfaces
1. Extend types without breaking existing schemas
2. Add message interface editor
3. Integrate with formula validation

### Phase 4: Template Management
1. Add save/load functionality
2. Integrate with existing PLED template system
3. Add metadata management

## Integration Points

### With Existing PLED System
- Use existing template storage patterns
- Integrate with Firebase Firestore
- Maintain compatibility with existing state machine templates
- Plan for future FSL integration without breaking current functionality

### With State Machine System
- Design extension points for state machine components
- Consider workflow-to-FSL compilation
- Maintain separation of concerns between tokenization and state machine logic

## Risk Mitigation

### React Error Prevention
1. **Start with working code**: Copy tokenization_demo exactly
2. **Incremental changes**: Add one feature at a time
3. **Immediate rollback**: If errors occur, revert to last working state
4. **Pattern adherence**: Follow only the patterns that work in the demo

### Performance Considerations
1. Use the same circular buffer patterns from working demo
2. Implement the same throttling mechanisms
3. Follow the same memory management patterns

### Compatibility Maintenance
1. Keep existing simulation store interface unchanged
2. Extend schemas with optional fields only
3. Maintain backward compatibility with scenario.json format