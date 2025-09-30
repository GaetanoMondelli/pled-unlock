# Comprehensive Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for PLED, covering all aspects of the FSM-based workflow system from unit tests to end-to-end validation, with special emphasis on deterministic behavior, event sourcing replay, and distributed system reliability.

## Testing Philosophy

### Core Principles

1. **Determinism First**: FSM behavior must be predictable and repeatable
2. **Event Sourcing Validation**: Replay must produce identical results
3. **Property-Based Testing**: Verify FSM mathematical properties
4. **Chaos Engineering**: Test system resilience under failure conditions
5. **Performance Assurance**: Maintain SLA compliance under load
6. **Security by Testing**: Comprehensive security validation

### Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │ 5%
                    │   (Slow, Expensive)
                ┌───┴─────────────────┴───┐
                │   Integration Tests     │ 15%
                │   (Medium Speed/Cost)
            ┌───┴─────────────────────────┴───┐
            │      Component Tests            │ 25%
            │    (Focused, Fast)
        ┌───┴─────────────────────────────────┴───┐
        │            Unit Tests                   │ 55%
        │         (Fast, Isolated)
        └─────────────────────────────────────────┘
```

## Testing Levels

### 1. Unit Testing

**FSM Engine Unit Tests**
```typescript
describe('FSMEngine', () => {
  let engine: FSMEngine;
  let mockStorage: jest.Mocked<FSMStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    engine = new FSMEngine(mockStorage);
  });

  describe('State Transitions', () => {
    it('should transition between valid states', async () => {
      // Given: A compiled FSM with valid transition
      const fsm = createTestFSM({
        states: ['idle', 'processing', 'complete'],
        transitions: [
          { from: 'idle', to: 'processing', trigger: 'start' },
          { from: 'processing', to: 'complete', trigger: 'finish' }
        ]
      });

      const execution = await engine.createExecution(fsm);

      // When: Valid transition is triggered
      const result = await engine.processMessage(execution.id, {
        type: 'start',
        payload: { data: 'test' },
        timestamp: Date.now()
      });

      // Then: State should change correctly
      expect(result.success).toBe(true);
      expect(result.newState).toBe('processing');
      expect(result.previousState).toBe('idle');
    });

    it('should reject invalid transitions', async () => {
      const fsm = createTestFSM({
        states: ['idle', 'processing'],
        transitions: [
          { from: 'idle', to: 'processing', trigger: 'start' }
        ]
      });

      const execution = await engine.createExecution(fsm);

      // When: Invalid transition is attempted
      const result = await engine.processMessage(execution.id, {
        type: 'invalid_trigger',
        payload: {},
        timestamp: Date.now()
      });

      // Then: Transition should be rejected
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('invalid_transition');
      expect(result.newState).toBe('idle'); // State unchanged
    });

    it('should evaluate guards correctly', async () => {
      const fsm = createTestFSM({
        states: ['idle', 'approved', 'rejected'],
        transitions: [
          {
            from: 'idle',
            to: 'approved',
            trigger: 'review',
            guard: 'payload.score >= 80'
          },
          {
            from: 'idle',
            to: 'rejected',
            trigger: 'review',
            guard: 'payload.score < 80'
          }
        ]
      });

      const execution = await engine.createExecution(fsm);

      // Test approval path
      const approvalResult = await engine.processMessage(execution.id, {
        type: 'review',
        payload: { score: 85 },
        timestamp: Date.now()
      });

      expect(approvalResult.newState).toBe('approved');

      // Reset and test rejection path
      await engine.resetExecution(execution.id);
      const rejectionResult = await engine.processMessage(execution.id, {
        type: 'review',
        payload: { score: 65 },
        timestamp: Date.now()
      });

      expect(rejectionResult.newState).toBe('rejected');
    });
  });

  describe('Action Execution', () => {
    it('should trigger actions on state entry', async () => {
      const mockActionRunner = jest.fn();
      engine.setActionRunner(mockActionRunner);

      const fsm = createTestFSM({
        states: ['idle', 'notifying'],
        transitions: [{ from: 'idle', to: 'notifying', trigger: 'notify' }],
        stateActions: {
          notifying: {
            onEntry: {
              'send_email': 'payload.email'
            }
          }
        }
      });

      const execution = await engine.createExecution(fsm);

      await engine.processMessage(execution.id, {
        type: 'notify',
        payload: { email: 'test@example.com' },
        timestamp: Date.now()
      });

      expect(mockActionRunner).toHaveBeenCalledWith({
        actionType: 'send_email',
        input: 'test@example.com',
        executionId: execution.id,
        state: 'notifying',
        trigger: 'notify'
      });
    });
  });
});
```

**Rule Engine Unit Tests**
```typescript
describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let mockAIService: jest.Mocked<AIService>;

  beforeEach(() => {
    mockAIService = createMockAIService();
    ruleEngine = new RuleEngine({ aiService: mockAIService });
  });

  describe('Deterministic Rules', () => {
    it('should evaluate JSONLogic rules correctly', async () => {
      const rule: DeterministicRule = {
        ruleId: 'test_rule',
        type: 'deterministic',
        implementation: {
          type: 'jsonlogic',
          logic: {
            'and': [
              { '==': [{ 'var': 'payload.type' }, 'email'] },
              { 'in': ['urgent', { 'var': 'payload.subject' }] }
            ]
          }
        },
        messageOutput: {
          type: 'urgent_email_received',
          payload: { urgency: 'high' }
        }
      };

      const testEvent = {
        type: 'email',
        payload: {
          type: 'email',
          subject: 'URGENT: System Down',
          body: 'System is experiencing issues'
        }
      };

      const result = await ruleEngine.evaluateRule(rule, testEvent);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe('urgent_email_received');
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const rule: DeterministicRule = {
        ruleId: 'broken_rule',
        type: 'deterministic',
        implementation: {
          type: 'jsonlogic',
          logic: { 'invalid_operator': true } // Invalid JSONLogic
        },
        messageOutput: { type: 'test', payload: {} }
      };

      const result = await ruleEngine.evaluateRule(rule, createTestEvent());

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('rule_evaluation_error');
    });
  });

  describe('AI Rules', () => {
    it('should cache AI rule results for deterministic replay', async () => {
      const aiRule: AIRule = {
        ruleId: 'ai_classification',
        type: 'ai_classification',
        implementation: {
          type: 'classification',
          model: 'gpt-4o-mini',
          prompt: 'Classify this email: {{payload.subject}}',
          outputSchema: {
            intent: { type: 'string' },
            confidence: { type: 'number' }
          },
          cacheable: true
        },
        messageOutput: {
          type: '{{aiOutput.intent}}_detected',
          payload: { confidence: '{{aiOutput.confidence}}' }
        }
      };

      const testEvent = createTestEvent({
        payload: { subject: 'Cancel my subscription' }
      });

      // Mock AI response
      mockAIService.call.mockResolvedValue({
        intent: 'cancellation',
        confidence: 0.95
      });

      // First call - should hit AI service
      const result1 = await ruleEngine.evaluateRule(aiRule, testEvent);
      expect(mockAIService.call).toHaveBeenCalledTimes(1);

      // Second call with same event - should use cache
      const result2 = await ruleEngine.evaluateRule(aiRule, testEvent);
      expect(mockAIService.call).toHaveBeenCalledTimes(1); // No additional call

      // Results should be identical
      expect(result1).toEqual(result2);
    });
  });
});
```

### 2. Property-Based Testing

**FSM Property Tests**
```typescript
import fc from 'fast-check';

describe('FSM Properties', () => {
  // Property: FSM should always be in a valid state
  it('should maintain valid state invariant', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        type: fc.string(),
        payload: fc.anything(),
        timestamp: fc.integer()
      })),
      async (messages) => {
        const fsm = createTestFSM(generateValidFSMDefinition());
        const execution = await engine.createExecution(fsm);

        for (const message of messages) {
          await engine.processMessage(execution.id, message);
          const state = await engine.getCurrentState(execution.id);

          // Property: Current state must be in the defined states
          expect(fsm.states).toContain(state.currentState);
        }
      }
    ));
  });

  // Property: Deterministic replay should produce identical results
  it('should produce identical results on replay', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        type: fc.constantFrom('start', 'process', 'complete', 'reset'),
        payload: fc.object(),
        timestamp: fc.integer()
      }), { minLength: 1, maxLength: 20 }),
      async (events) => {
        const fsm = createTestFSM(generateValidFSMDefinition());

        // First execution
        const execution1 = await engine.createExecution(fsm);
        const results1: any[] = [];

        for (const event of events) {
          const result = await engine.processMessage(execution1.id, event);
          results1.push({
            state: result.newState,
            success: result.success,
            actions: result.actions
          });
        }

        // Second execution with same events (replay)
        const execution2 = await engine.createExecution(fsm);
        const results2: any[] = [];

        for (const event of events) {
          const result = await engine.processMessage(execution2.id, event);
          results2.push({
            state: result.newState,
            success: result.success,
            actions: result.actions
          });
        }

        // Property: Both executions should produce identical results
        expect(results1).toEqual(results2);
      }
    ));
  });

  // Property: Actions should only be executed once per trigger
  it('should execute actions exactly once per trigger', async () => {
    const actionTracker = new Map<string, number>();
    const mockActionRunner = jest.fn().mockImplementation((action) => {
      const key = `${action.executionId}:${action.state}:${action.trigger}:${action.actionType}`;
      actionTracker.set(key, (actionTracker.get(key) || 0) + 1);
    });

    engine.setActionRunner(mockActionRunner);

    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        type: fc.constantFrom('approve', 'reject', 'notify'),
        payload: fc.object()
      }), { minLength: 5, maxLength: 15 }),
      async (events) => {
        actionTracker.clear();
        const fsm = createTestFSM(generateFSMWithActions());
        const execution = await engine.createExecution(fsm);

        for (const event of events) {
          await engine.processMessage(execution.id, event);
        }

        // Property: Each unique action should be executed at most once
        for (const [key, count] of actionTracker.entries()) {
          expect(count).toBeLessThanOrEqual(1);
        }
      }
    ));
  });
});
```

### 3. Integration Testing

**End-to-End Workflow Tests**
```typescript
describe('End-to-End Workflow Integration', () => {
  let testEnvironment: TestEnvironment;

  beforeAll(async () => {
    testEnvironment = await setupTestEnvironment({
      database: 'test_postgres',
      redis: 'test_redis',
      messageQueue: 'test_rabbitmq'
    });
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  it('should process complete workflow from event to action', async () => {
    // Setup: Create template and execution
    const template = await testEnvironment.api.createTemplate({
      name: 'Approval Workflow',
      scenario: createApprovalWorkflowTemplate()
    });

    const execution = await testEnvironment.api.createExecution({
      templateId: template.id,
      name: 'Test Approval'
    });

    // Test: Send initial event
    await testEnvironment.api.sendEvent(execution.id, {
      type: 'application_submitted',
      payload: {
        applicantId: 'user123',
        applicationData: { score: 85 }
      }
    });

    // Verify: FSM should transition to 'under_review'
    await testEnvironment.waitForState(execution.id, 'under_review', 5000);

    // Test: Send approval event
    await testEnvironment.api.sendEvent(execution.id, {
      type: 'review_completed',
      payload: {
        decision: 'approve',
        reviewerId: 'reviewer456'
      }
    });

    // Verify: Should transition to 'approved' and trigger notification action
    await testEnvironment.waitForState(execution.id, 'approved', 5000);

    const actions = await testEnvironment.api.getActions(execution.id);
    expect(actions.filter(a => a.type === 'send_notification')).toHaveLength(1);

    // Verify: Action should complete successfully
    await testEnvironment.waitForActionCompletion(actions[0].id, 10000);

    const completedAction = await testEnvironment.api.getAction(actions[0].id);
    expect(completedAction.status).toBe('completed');
  });

  it('should handle concurrent executions correctly', async () => {
    const template = await testEnvironment.api.createTemplate({
      name: 'Concurrent Test',
      scenario: createSimpleWorkflowTemplate()
    });

    // Create multiple executions concurrently
    const executionPromises = Array.from({ length: 10 }, (_, i) =>
      testEnvironment.api.createExecution({
        templateId: template.id,
        name: `Concurrent Execution ${i}`
      })
    );

    const executions = await Promise.all(executionPromises);

    // Send events to all executions simultaneously
    const eventPromises = executions.map(execution =>
      testEnvironment.api.sendEvent(execution.id, {
        type: 'start_process',
        payload: { executionIndex: executions.indexOf(execution) }
      })
    );

    await Promise.all(eventPromises);

    // Verify all executions processed correctly
    for (const execution of executions) {
      await testEnvironment.waitForState(execution.id, 'processing', 10000);

      const state = await testEnvironment.api.getExecutionState(execution.id);
      expect(state.currentState).toBe('processing');
    }
  });
});
```

### 4. Replay Testing

**Deterministic Replay Validation**
```typescript
describe('Replay Engine', () => {
  let replayEngine: ReplayEngine;
  let executionStore: ExecutionStore;

  beforeEach(() => {
    replayEngine = new ReplayEngine();
    executionStore = new ExecutionStore();
  });

  it('should replay execution to identical state', async () => {
    // Setup: Create execution with events
    const template = createTestTemplate();
    const execution = await executionStore.createExecution(template);

    const events = [
      { type: 'start', payload: { value: 100 }, timestamp: 1000 },
      { type: 'process', payload: { multiplier: 2 }, timestamp: 2000 },
      { type: 'complete', payload: {}, timestamp: 3000 }
    ];

    // Process events normally
    for (const event of events) {
      await executionStore.addEvent(execution.id, event);
    }

    const originalState = await executionStore.getExecutionState(execution.id);
    const originalLedger = await executionStore.getLedger(execution.id);

    // Replay the execution
    const replayResult = await replayEngine.replayExecution(execution.id);

    expect(replayResult.success).toBe(true);
    expect(replayResult.finalState).toEqual(originalState);
    expect(replayResult.ledger).toEqual(originalLedger);
  });

  it('should handle partial replay from snapshot', async () => {
    const execution = await createExecutionWithManyEvents(1000);

    // Create snapshot at event 500
    const snapshot = await executionStore.createSnapshot(execution.id, 500);

    // Replay from snapshot to end
    const replayResult = await replayEngine.replayExecution(
      execution.id,
      { fromSnapshot: snapshot.id }
    );

    // Verify replay started from correct point
    expect(replayResult.startedFromSnapshot).toBe(snapshot.id);
    expect(replayResult.eventsProcessed).toBe(500); // Events 501-1000

    // Verify final state matches
    const currentState = await executionStore.getExecutionState(execution.id);
    expect(replayResult.finalState).toEqual(currentState);
  });

  it('should detect replay inconsistencies', async () => {
    const execution = await createTestExecution();

    // Modify rule after some events
    const rule = await ruleStore.getRule('test_rule');
    await ruleStore.updateRule(rule.id, {
      implementation: { /* modified logic */ }
    });

    const replayResult = await replayEngine.replayExecution(execution.id);

    expect(replayResult.success).toBe(false);
    expect(replayResult.inconsistencies).toHaveLength(1);
    expect(replayResult.inconsistencies[0].type).toBe('rule_output_mismatch');
  });
});
```

### 5. Performance Testing

**Load Testing**
```typescript
describe('Performance Tests', () => {
  let loadTester: LoadTester;

  beforeAll(async () => {
    loadTester = new LoadTester({
      apiBaseUrl: process.env.TEST_API_URL,
      concurrency: 100,
      duration: 60000 // 1 minute
    });
  });

  it('should handle high event ingestion rate', async () => {
    const scenario = loadTester.createScenario({
      name: 'Event Ingestion Load Test',
      target: {
        eventsPerSecond: 1000,
        duration: 60000
      }
    });

    scenario.addAction('send_event', {
      weight: 100,
      template: {
        type: 'random_event',
        payload: () => generateRandomEventPayload()
      }
    });

    const results = await scenario.run();

    expect(results.eventIngestionRate.p95).toBeLessThan(100); // 95th percentile < 100ms
    expect(results.errorRate).toBeLessThan(0.01); // < 1% errors
    expect(results.throughput).toBeGreaterThan(950); // > 95% of target rate
  });

  it('should maintain FSM processing performance under load', async () => {
    const template = await createComplexFSMTemplate();

    const scenario = loadTester.createScenario({
      name: 'FSM Processing Load Test',
      target: {
        transitionsPerSecond: 500,
        concurrentExecutions: 1000
      }
    });

    // Create multiple executions
    scenario.addSetup(async () => {
      const executions = await Promise.all(
        Array.from({ length: 1000 }, () =>
          api.createExecution({ templateId: template.id })
        )
      );
      return { executions };
    });

    scenario.addAction('trigger_transition', {
      weight: 100,
      template: (context) => ({
        executionId: randomChoice(context.executions).id,
        message: generateRandomTransitionMessage()
      })
    });

    const results = await scenario.run();

    expect(results.fsmTransitionLatency.p95).toBeLessThan(200); // < 200ms
    expect(results.fsmTransitionLatency.p99).toBeLessThan(1000); // < 1s
    expect(results.errorRate).toBeLessThan(0.005); // < 0.5% errors
  });

  it('should scale action execution under load', async () => {
    const scenario = loadTester.createScenario({
      name: 'Action Execution Load Test',
      target: {
        actionsPerSecond: 100,
        duration: 300000 // 5 minutes
      }
    });

    scenario.addAction('queue_action', {
      weight: 100,
      template: () => ({
        type: randomChoice(['email', 'webhook', 'api_call']),
        payload: generateActionPayload()
      })
    });

    const results = await scenario.run();

    expect(results.actionExecutionLatency.p95).toBeLessThan(5000); // < 5s
    expect(results.actionSuccessRate).toBeGreaterThan(0.99); // > 99%
    expect(results.queueBacklog.max).toBeLessThan(1000); // Queue doesn't grow unbounded
  });
});
```

### 6. Chaos Engineering

**Fault Injection Tests**
```typescript
describe('Chaos Engineering', () => {
  let chaosEngine: ChaosEngine;

  beforeAll(() => {
    chaosEngine = new ChaosEngine({
      environment: 'test',
      safetyChecks: true
    });
  });

  it('should handle database connection failures gracefully', async () => {
    const execution = await createTestExecution();

    // Inject database failure during event processing
    const faultInjection = chaosEngine.createFault({
      type: 'database_connection_failure',
      duration: 30000, // 30 seconds
      probability: 0.3 // 30% of requests fail
    });

    await faultInjection.start();

    try {
      // Continue sending events during the failure
      const events = generateEventSequence(100);
      const results = [];

      for (const event of events) {
        try {
          const result = await api.sendEvent(execution.id, event);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error });
        }
      }

      // Verify system behavior during fault
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.5); // At least 50% should succeed due to retries

      // Verify no data corruption
      await faultInjection.stop();

      const finalState = await api.getExecutionState(execution.id);
      expect(finalState.isConsistent).toBe(true);

    } finally {
      await faultInjection.stop();
    }
  });

  it('should recover from message queue failures', async () => {
    const queueFault = chaosEngine.createFault({
      type: 'message_queue_failure',
      component: 'action_queue',
      duration: 60000
    });

    await queueFault.start();

    try {
      // Send actions that require queueing
      const execution = await createTestExecution();
      await api.sendEvent(execution.id, {
        type: 'trigger_actions',
        payload: { actionCount: 10 }
      });

      // Actions should be queued in fallback storage
      const queueStatus = await api.getQueueStatus();
      expect(queueStatus.fallbackQueue.length).toBeGreaterThan(0);

      await queueFault.stop();

      // Verify actions are processed after recovery
      await waitFor(() => api.getQueueStatus().then(s => s.fallbackQueue.length === 0), 30000);

      const actions = await api.getActions(execution.id);
      expect(actions.filter(a => a.status === 'completed')).toHaveLength(10);

    } finally {
      await queueFault.stop();
    }
  });
});
```

### 7. Security Testing

**Security Validation Tests**
```typescript
describe('Security Tests', () => {
  let securityTester: SecurityTester;

  beforeAll(() => {
    securityTester = new SecurityTester({
      apiBaseUrl: process.env.TEST_API_URL
    });
  });

  it('should prevent unauthorized access to executions', async () => {
    const user1 = await securityTester.createTestUser();
    const user2 = await securityTester.createTestUser();

    // User 1 creates execution
    const execution = await securityTester.authenticatedRequest(user1, 'POST', '/executions', {
      templateId: 'test_template',
      name: 'User 1 Execution'
    });

    // User 2 should not be able to access User 1's execution
    const unauthorizedResponse = await securityTester.authenticatedRequest(
      user2, 'GET', `/executions/${execution.id}`
    );

    expect(unauthorizedResponse.status).toBe(403);
  });

  it('should validate API key permissions', async () => {
    const apiKey = await securityTester.createAPIKey({
      scopes: ['templates:read'],
      organizationId: 'test_org'
    });

    // Should allow read access
    const readResponse = await securityTester.apiKeyRequest(apiKey, 'GET', '/templates');
    expect(readResponse.status).toBe(200);

    // Should deny write access
    const writeResponse = await securityTester.apiKeyRequest(apiKey, 'POST', '/templates', {
      name: 'Test Template'
    });
    expect(writeResponse.status).toBe(403);
  });

  it('should sanitize input data', async () => {
    const maliciousPayloads = [
      { payload: { script: '<script>alert("xss")</script>' } },
      { payload: { sql: "'; DROP TABLE executions; --" } },
      { payload: { code: 'process.exit(1)' } }
    ];

    for (const maliciousPayload of maliciousPayloads) {
      const response = await securityTester.sendEvent('test_execution', maliciousPayload);

      // Should accept the request but sanitize the payload
      expect(response.status).toBe(202);

      // Verify the malicious content was sanitized
      const storedEvent = await securityTester.getStoredEvent(response.body.eventId);
      expect(storedEvent.payload).not.toEqual(maliciousPayload.payload);
    }
  });
});
```

## Test Automation & CI/CD

### Test Pipeline Configuration

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  property-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:property
        env:
          PROPERTY_TEST_ITERATIONS: 1000

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: npm run test:e2e
      - run: docker-compose -f docker-compose.test.yml down

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:performance
      - uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test-results/performance/

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:security
      - run: npm audit --audit-level high
```

### Test Data Management

```typescript
class TestDataManager {
  private snapshots: Map<string, any> = new Map();

  async createTestTemplate(overrides?: Partial<TemplateDocument>): Promise<TemplateDocument> {
    const baseTemplate = {
      name: 'Test Template',
      description: 'Generated for testing',
      scenario: {
        version: '3.0',
        nodes: [
          {
            nodeId: 'start',
            type: 'DataSource',
            displayName: 'Start',
            position: { x: 0, y: 0 },
            interval: 1000,
            generation: { type: 'constant', value: 1 }
          }
        ]
      },
      version: '1.0',
      isDefault: false,
      organizationId: 'test_org',
      ...overrides
    };

    return this.storage.storeTemplate(baseTemplate);
  }

  async createTestExecution(
    templateId: string,
    overrides?: Partial<ExecutionDocument>
  ): Promise<ExecutionDocument> {
    const baseExecution = {
      templateId,
      name: 'Test Execution',
      description: 'Generated for testing',
      status: 'running' as const,
      currentState: 'idle',
      variables: {},
      organizationId: 'test_org',
      ...overrides
    };

    return this.storage.storeExecution(baseExecution);
  }

  async snapshotTestData(key: string): Promise<void> {
    const data = await this.exportAllTestData();
    this.snapshots.set(key, data);
  }

  async restoreTestData(key: string): Promise<void> {
    const data = this.snapshots.get(key);
    if (data) {
      await this.importTestData(data);
    }
  }

  async cleanupTestData(): Promise<void> {
    await this.storage.deleteTestOrganizationData('test_org');
  }
}
```

This comprehensive testing strategy ensures PLED maintains reliability, performance, and security while supporting the complex requirements of FSM-based workflow systems with event sourcing and deterministic replay capabilities.