# Architecture Evolution: From Simple FSM to Node-Based Workflows

## Overview

This document captures the critical architectural evolution of PLED from its hackathon origins to the current sophisticated node-based workflow system.

## Evolution Timeline

### Phase 1: Hackathon - Simple FSM Workflows (Original)
```
External Events → Single Input Queue → FSM Engine → Actions
```

**Characteristics:**
- Single FSM per workflow
- One global input queue
- Direct event-to-FSM mapping
- Simple state transitions

### Phase 2: Current - FSM as Workflow Nodes
```
External Events → Node Graph → [DataSource, Queue, ProcessNode, FSMProcessNode, Sink] → Token Flow
```

**Characteristics:**
- **FSM is now a node type** (`FSMProcessNode`) within a larger workflow graph
- Multiple node types: `DataSource`, `Queue`, `ProcessNode`, `FSMProcessNode`, `Sink`, `Module`, `Group`
- Token-based data flow between nodes
- Complex scenarios with interconnected processing components

## Current Architecture Analysis

### Node-Based Workflow Structure

```typescript
// Current Scenario Structure (from types.ts)
interface Scenario {
  version: "3.0";
  nodes: AnyNode[]; // Array of different node types
  groups?: GroupConfiguration;
}

// FSM is now just ONE type of node
type AnyNode =
  | DataSourceNode    // Generates tokens
  | QueueNode        // Accumulates and processes tokens
  | ProcessNode      // Transforms tokens
  | FSMProcessNode   // FSM-based processing node ⭐
  | SinkNode         // Consumes tokens
  | ModuleNode       // Nested sub-graphs
  | GroupNode;       // Visual organization
```

### FSMProcessNode Deep Dive

```typescript
interface FSMProcessNode {
  type: "FSMProcessNode";
  inputs: InputV3[];           // Receives tokens from other nodes
  fsm: FSMDefinition;          // Internal FSM logic
  fsl?: string;               // Optional FSL representation

  // FSM Definition Structure:
  fsm: {
    states: string[];                    // ["idle", "processing", "emitting"]
    initialState: string;                // "idle"
    transitions: FSMTransition[];        // State transition rules
    variables?: Record<string, any>;     // FSM state variables
    stateActions?: Record<string, FSMStateActions>; // Actions per state
    outputs?: string[];                  // Output channels
  }
}
```

### Key Architectural Implications

## 1. **Multi-Level State Management**

**OLD (Hackathon):**
```
Global FSM State = Current Workflow State
```

**NEW (Current):**
```
Scenario State = {
  nodeStates: {
    "node1": DataSourceState,
    "node2": QueueState,
    "fsm_node": FSMProcessNodeState {  // FSM is embedded here
      currentFSMState: "processing",
      fsmVariables: {...},
      inputBuffers: {...}
    }
  },
  tokenFlow: TokenGraph,
  simulationTime: number
}
```

## 2. **Event Processing Pipeline**

**OLD:**
```
External Event → FSM Engine → State Transition → Actions
```

**NEW:**
```
External Event → Node Graph Evaluation → Token Propagation →
  FSM Node Processing (if tokens reach FSM) → Token Output →
  Downstream Node Processing
```

## 3. **Data Flow Model**

**OLD:**
- Messages drive FSM transitions directly
- Single processing path

**NEW:**
- **Tokens** flow between nodes
- FSM nodes process tokens to trigger state transitions
- Multiple parallel processing paths
- Complex token transformations and lineage

## API Architecture Implications

### Endpoint Structure Evolution

**OLD API (Implied):**
```
POST /fsm/transition
GET  /fsm/state
POST /fsm/events
```

**NEW API (Required):**
```
# Scenario Management
POST /v1/scenarios
GET  /v1/scenarios/{id}
PUT  /v1/scenarios/{id}

# Execution Management (scenario instances)
POST /v1/executions
GET  /v1/executions/{id}
GET  /v1/executions/{id}/state

# Node-Level Operations
GET  /v1/executions/{id}/nodes/{nodeId}/state
POST /v1/executions/{id}/nodes/{nodeId}/inject-token

# FSM Node Specific
GET  /v1/executions/{id}/nodes/{fsmNodeId}/fsm-state
POST /v1/executions/{id}/nodes/{fsmNodeId}/fsm-transition

# Token Flow
GET  /v1/executions/{id}/tokens
GET  /v1/executions/{id}/token-lineage/{tokenId}

# Events (now at scenario level, not FSM level)
POST /v1/executions/{id}/events
GET  /v1/executions/{id}/events
```

## Implementation Strategy

### 1. **Preserve Existing FSM Logic**

```typescript
// Keep existing FSM engine but embed it within node processing
class FSMProcessNodeRunner {
  private fsmEngine: FSMEngine; // Reuse existing FSM logic

  async processTokens(
    node: FSMProcessNode,
    inputTokens: Token[]
  ): Promise<NodeProcessingResult> {

    // Convert tokens to FSM messages
    const messages = this.tokensToMessages(inputTokens);

    // Process through embedded FSM
    for (const message of messages) {
      const result = await this.fsmEngine.processMessage(
        node.nodeId,
        message
      );

      if (result.success) {
        // Convert FSM actions to token outputs
        const outputTokens = this.actionsToTokens(result.actions);
        return { outputTokens, newFSMState: result.newState };
      }
    }
  }
}
```

### 2. **Token-Message Bridge**

```typescript
interface TokenToMessageMapper {
  // Convert incoming tokens to FSM messages
  tokenToMessage(token: Token, fsmNode: FSMProcessNode): Message;

  // Convert FSM actions to output tokens
  actionsToTokens(actions: FSMAction[], fsmNode: FSMProcessNode): Token[];
}

class DefaultTokenMessageMapper implements TokenToMessageMapper {
  tokenToMessage(token: Token, fsmNode: FSMProcessNode): Message {
    return {
      id: generateId(),
      type: token.value?.messageType || 'token_received',
      payload: token.value,
      timestamp: token.createdAt,
      fromToken: token.id
    };
  }

  actionsToTokens(actions: FSMAction[], fsmNode: FSMProcessNode): Token[] {
    return actions.map(action => ({
      id: generateId(),
      value: action.output,
      createdAt: Date.now(),
      originNodeId: fsmNode.nodeId,
      history: [{
        timestamp: Date.now(),
        epochTimestamp: Date.now(),
        sequence: 0,
        nodeId: fsmNode.nodeId,
        action: 'fsm_action_executed',
        value: action.output,
        state: action.fromState
      }]
    }));
  }
}
```

### 3. **Unified Execution Engine**

```typescript
class ScenarioExecutionEngine {
  async processEvent(
    executionId: string,
    event: ExternalEvent
  ): Promise<ExecutionResult> {

    const execution = await this.getExecution(executionId);
    const scenario = execution.scenario;

    // 1. Determine which nodes should receive this event
    const targetNodes = this.findEventTargets(scenario, event);

    // 2. Process event through each target node
    const nodeResults = await Promise.all(
      targetNodes.map(node => this.processNodeEvent(node, event, execution))
    );

    // 3. Propagate any generated tokens through the graph
    const tokenPropagationResult = await this.propagateTokens(
      scenario,
      nodeResults.flatMap(r => r.outputTokens)
    );

    return {
      nodeResults,
      tokenPropagationResult,
      newExecutionState: await this.getExecutionState(executionId)
    };
  }

  private async processNodeEvent(
    node: AnyNode,
    event: ExternalEvent,
    execution: ExecutionDocument
  ): Promise<NodeProcessingResult> {

    switch (node.type) {
      case 'DataSource':
        return this.dataSourceRunner.processEvent(node, event);
      case 'Queue':
        return this.queueRunner.processEvent(node, event);
      case 'FSMProcessNode':
        return this.fsmNodeRunner.processEvent(node, event); // ⭐ FSM processing
      case 'ProcessNode':
        return this.processNodeRunner.processEvent(node, event);
      case 'Sink':
        return this.sinkRunner.processEvent(node, event);
      default:
        return { outputTokens: [] };
    }
  }
}
```

## Updated Documentation Requirements

All existing documentation needs updates to reflect:

1. **FSM is a node type**, not the entire workflow
2. **Token-based data flow** between nodes
3. **Scenario-level execution** management
4. **Node-specific state** management
5. **Multi-node event processing** pipelines

## Next Steps

1. ✅ Update architecture documentation (this document)
2. 🔄 Analyze current template-editor implementation
3. 🔄 Create decoupled API that supports both paradigms
4. 🔄 Build node-aware execution engine
5. 🔄 Implement token-message bridge layer

This evolution maintains backward compatibility while enabling the much more powerful node-based workflow capabilities that the template-editor provides.