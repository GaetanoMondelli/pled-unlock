# FSM Engine Integration Architecture

## Current State Analysis

The existing PLED implementation has:
- **Frontend FSM Engine**: Browser-based FSM using FSL (Finite State Language) and jssm library
- **Event Sourcing System**: Sophisticated event capture and replay system
- **Token Flow Simulation**: Complex token lineage and transformation tracking
- **Template System**: Reusable FSM templates with visual editor

## Integration Challenges

### 1. **FSM Execution Context Gap**
- Current: Browser-only FSM execution with local state
- Needed: Server-side FSM execution with distributed state management
- Challenge: Maintaining deterministic replay across client/server boundary

### 2. **State Persistence Strategy**
- Current: In-memory state with periodic snapshots
- Needed: Persistent FSM state with transaction guarantees
- Challenge: Handling concurrent execution and state conflicts

### 3. **Action Execution Coordination**
- Current: Actions executed in browser context
- Needed: Server-side action execution with side effects
- Challenge: Coordinating FSM transitions with external system calls

## Proposed Architecture

### Core FSM Engine Service

```typescript
interface FSMExecutionEngine {
  // Core FSM operations
  executeTransition(executionId: string, message: Message): Promise<TransitionResult>;
  getCurrentState(executionId: string): Promise<FSMState>;
  evaluateGuards(executionId: string, transition: string): Promise<boolean>;

  // Action coordination
  triggerActions(executionId: string, state: string, trigger: string): Promise<ActionResult[]>;

  // State management
  createSnapshot(executionId: string): Promise<FSMSnapshot>;
  restoreFromSnapshot(executionId: string, snapshotId: string): Promise<void>;
}
```

### 1. **FSM State Management Layer**

```typescript
interface FSMState {
  executionId: string;
  templateId: string;
  currentState: string;
  variables: Record<string, any>;

  // FSM Definition Context
  states: string[];
  transitions: FSMTransition[];
  guards: Record<string, string>; // state -> guard condition
  actions: Record<string, FSMStateAction[]>; // state -> actions

  // Execution Context
  lastTransitionTime: number;
  messageQueue: Message[];
  pendingActions: ActionExecution[];

  // Event Sourcing
  sequenceNumber: number;
  lastEventId: string;
  snapshotVersion: number;
}
```

### 2. **Message Processing Pipeline**

```
External Event → Rule Engine → Message → FSM Engine → State Transition → Actions
```

**Pipeline Implementation:**
```typescript
class MessageProcessingPipeline {
  async processEvent(executionId: string, event: ExternalEvent): Promise<ProcessingResult> {
    // 1. Apply rules to derive messages
    const messages = await this.ruleEngine.deriveMessages(event);

    // 2. Process each message through FSM
    const results = [];
    for (const message of messages) {
      const result = await this.fsmEngine.processMessage(executionId, message);
      results.push(result);

      // 3. Execute triggered actions
      if (result.actions.length > 0) {
        await this.actionRunner.executeActions(result.actions);
      }
    }

    // 4. Append to ledger
    await this.ledgerService.appendEntries(executionId, results);

    return { messages, transitions: results };
  }
}
```

### 3. **FSM Compilation and Runtime**

**Template Compilation:**
```typescript
interface CompiledFSM {
  templateId: string;
  version: string;

  // Compiled FSM Structure
  states: FSMStateDefinition[];
  transitions: FSMTransitionDefinition[];
  variables: FSMVariableDefinition[];

  // Runtime Optimization
  transitionMatrix: Map<string, Map<string, FSMTransitionDefinition>>;
  stateActions: Map<string, FSMAction[]>;
  guardEvaluators: Map<string, Function>;

  // Validation Rules
  safenessChecks: SafenessRule[];
  livenessChecks: LivenessRule[];
}

class FSMCompiler {
  compile(template: TemplateDocument): CompiledFSM {
    // Parse FSL or template JSON
    // Generate optimized runtime structures
    // Validate FSM properties (safety, liveness)
    // Create guard evaluation functions
  }
}
```

### 4. **Deterministic Replay Integration**

```typescript
class FSMReplayEngine extends ReplayEngine {
  async replayExecution(
    executionId: string,
    fromSnapshot?: string,
    toSequence?: number
  ): Promise<ReplayResult> {

    // 1. Load FSM template and compilation
    const template = await this.getExecutionTemplate(executionId);
    const compiledFSM = this.compiler.compile(template);

    // 2. Initialize or restore state
    let fsmState = fromSnapshot
      ? await this.restoreSnapshot(fromSnapshot)
      : this.initializeFSMState(compiledFSM);

    // 3. Replay events through message pipeline
    const events = await this.loadEventsForReplay(executionId, fromSnapshot, toSequence);

    for (const event of events) {
      const result = await this.pipeline.processEvent(executionId, event);
      fsmState = result.newFSMState;

      // Validate determinism
      await this.validateReplayDeterminism(result);
    }

    return {
      finalState: fsmState,
      replayLog: this.replayLog,
      determinismViolations: this.violations
    };
  }
}
```

## API Enhancements

### Enhanced Execution Endpoints

```yaml
# Extended execution state endpoint
/v1/executions/{executionId}/state:
  get:
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                currentState: { type: string }
                variables: { type: object }
                stateDefinition:
                  type: object
                  properties:
                    actions: { type: array }
                    guards: { type: object }
                    transitions: { type: array }
                messageQueue:
                  type: array
                  items:
                    $ref: '#/components/schemas/QueuedMessage'
                lastTransition:
                  type: object
                  properties:
                    from: { type: string }
                    to: { type: string }
                    trigger: { type: string }
                    timestamp: { type: string }

# FSM-specific operations
/v1/executions/{executionId}/fsm/transition:
  post:
    summary: Force a manual FSM transition (admin operation)
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              targetState: { type: string }
              reason: { type: string }
              bypassGuards: { type: boolean }
    responses:
      200:
        description: Transition successful
      400:
        description: Invalid transition or guards failed

/v1/executions/{executionId}/fsm/guards:
  get:
    summary: Evaluate current guard conditions
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                guards:
                  type: array
                  items:
                    type: object
                    properties:
                      condition: { type: string }
                      result: { type: boolean }
                      variables: { type: object }
```

### FSM Template Validation

```yaml
/v1/templates/{templateId}/validate:
  post:
    summary: Comprehensive FSM validation
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                isValid: { type: boolean }
                compilationResult:
                  type: object
                  properties:
                    states: { type: array }
                    transitions: { type: array }
                    unreachableStates: { type: array }
                safenessAnalysis:
                  type: object
                  properties:
                    hasDeadlocks: { type: boolean }
                    deadlockStates: { type: array }
                livenessAnalysis:
                  type: object
                  properties:
                    hasLivelocks: { type: boolean }
                    livelockPaths: { type: array }
                actionValidation:
                  type: object
                  properties:
                    unreferencedActions: { type: array }
                    invalidActionReferences: { type: array }
```

## Implementation Phases

### Phase 1: Core FSM Engine (2 weeks)
- [ ] FSM compilation service
- [ ] Basic state transition engine
- [ ] State persistence with Postgres
- [ ] Simple guard evaluation

### Phase 2: Message Integration (1 week)
- [ ] Message processing pipeline
- [ ] Event → Message → FSM flow
- [ ] Action triggering coordination
- [ ] Enhanced API endpoints

### Phase 3: Replay Enhancement (1 week)
- [ ] FSM-aware replay engine
- [ ] Determinism validation
- [ ] Snapshot optimization
- [ ] Replay debugging tools

### Phase 4: Advanced Features (2 weeks)
- [ ] FSM property validation (safety/liveness)
- [ ] Guard condition DSL
- [ ] Advanced action coordination
- [ ] Performance optimization

## Success Metrics

1. **Functional Correctness**
   - 100% deterministic replay for FSM executions
   - Zero state corruption under concurrent access
   - All FSM properties validated at compile time

2. **Performance Targets**
   - < 100ms FSM state transition latency (p95)
   - Support 1000+ concurrent FSM executions
   - < 5s full replay time for 10k events

3. **Developer Experience**
   - Clear error messages for invalid FSM definitions
   - Rich debugging tools for FSM execution
   - Comprehensive test coverage for FSM behavior

This architecture bridges the gap between the sophisticated frontend FSM simulation and the robust backend execution environment while maintaining the event sourcing foundation and enabling the tokenization roadmap.