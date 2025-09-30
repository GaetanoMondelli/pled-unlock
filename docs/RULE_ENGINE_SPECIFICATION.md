# Rule Engine Specification

## Overview

The Rule Engine is a critical component that transforms raw external events into meaningful messages that drive FSM state transitions. It supports both deterministic rule evaluation and AI-assisted interpretation while maintaining auditability and replay determinism.

## Architecture

```
External Event → Rule Evaluation → Message(s) → FSM Engine
```

### Core Components

1. **Rule Definitions**: Template-scoped rules for event interpretation
2. **Rule Evaluation Engine**: Executes rules against events
3. **Message Generator**: Creates structured messages from rule outputs
4. **Caching Layer**: Ensures deterministic replay for AI-based rules
5. **Audit Trail**: Tracks rule execution for transparency

## Rule Types

### 1. Deterministic Rules

**JSONLogic-based Rules**
```json
{
  "ruleId": "email_termination_notice",
  "templateId": "rent_agreement_v1",
  "eventType": "email",
  "conditions": {
    "and": [
      {"==": [{"var": "payload.type"}, "email"]},
      {"in": ["terminate", {"var": "payload.subject"}]},
      {"in": ["agreement", {"var": "payload.body"}]}
    ]
  },
  "messageOutput": {
    "type": "termination_notice_received",
    "payload": {
      "noticeDate": {"var": "payload.timestamp"},
      "senderEmail": {"var": "payload.from"},
      "extractedIntent": "terminate_agreement"
    }
  },
  "priority": 100
}
```

**Field Extraction Rules**
```json
{
  "ruleId": "extract_payment_amount",
  "templateId": "invoice_processing",
  "eventType": "document_upload",
  "extractor": {
    "type": "regex",
    "patterns": {
      "amount": "\\$([0-9,]+\\.?[0-9]*)",
      "dueDate": "due\\s+(?:by\\s+)?([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})",
      "invoiceNumber": "invoice\\s+#?([A-Z0-9-]+)"
    }
  },
  "messageOutput": {
    "type": "payment_details_extracted",
    "payload": {
      "amount": {"extracted": "amount"},
      "dueDate": {"extracted": "dueDate"},
      "invoiceNumber": {"extracted": "invoiceNumber"}
    }
  }
}
```

### 2. AI-Assisted Rules

**Intent Classification Rules**
```json
{
  "ruleId": "classify_email_intent",
  "templateId": "customer_support",
  "eventType": "email",
  "aiRule": {
    "type": "classification",
    "model": "gpt-4o-mini",
    "prompt": "Classify the intent of this email into one of: complaint, question, cancellation, compliment, other. Email: {{payload.subject}} - {{payload.body}}",
    "outputSchema": {
      "intent": {"type": "string", "enum": ["complaint", "question", "cancellation", "compliment", "other"]},
      "confidence": {"type": "number", "minimum": 0, "maximum": 1},
      "reasoning": {"type": "string"}
    }
  },
  "messageMapping": {
    "complaint": {"type": "complaint_received", "priority": "high"},
    "question": {"type": "question_received", "priority": "medium"},
    "cancellation": {"type": "cancellation_request", "priority": "high"},
    "compliment": {"type": "positive_feedback", "priority": "low"},
    "other": {"type": "unclassified_email", "priority": "medium"}
  }
}
```

**Information Extraction Rules**
```json
{
  "ruleId": "extract_contract_terms",
  "templateId": "contract_analysis",
  "eventType": "document_upload",
  "aiRule": {
    "type": "extraction",
    "model": "gpt-4",
    "prompt": "Extract key contract terms from this document. Focus on: payment terms, termination clauses, renewal options, and key dates.",
    "outputSchema": {
      "paymentTerms": {"type": "string"},
      "terminationClause": {"type": "string"},
      "renewalOptions": {"type": "string"},
      "keyDates": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "date": {"type": "string", "format": "date"},
            "description": {"type": "string"}
          }
        }
      },
      "confidence": {"type": "number"}
    }
  },
  "messageOutput": {
    "type": "contract_terms_extracted",
    "payload": "{{aiOutput}}"
  }
}
```

## Rule Engine Implementation

### Core Rule Evaluation Service

```typescript
interface RuleEngine {
  // Rule Management
  createRule(templateId: string, rule: RuleDefinition): Promise<string>;
  updateRule(ruleId: string, updates: Partial<RuleDefinition>): Promise<void>;
  deleteRule(ruleId: string): Promise<void>;

  // Rule Evaluation
  evaluateRules(executionId: string, event: ExternalEvent): Promise<Message[]>;
  testRule(ruleId: string, event: ExternalEvent): Promise<RuleTestResult>;

  // Determinism & Caching
  getCachedResult(ruleId: string, eventHash: string): Promise<RuleResult | null>;
  cacheResult(ruleId: string, eventHash: string, result: RuleResult): Promise<void>;
}

interface RuleDefinition {
  ruleId: string;
  templateId: string;
  name: string;
  description?: string;

  // Rule Triggers
  eventType?: string;
  eventFilter?: JSONLogicCondition;

  // Rule Implementation
  type: 'deterministic' | 'ai_classification' | 'ai_extraction' | 'composite';
  implementation: DeterministicRule | AIRule | CompositeRule;

  // Output Configuration
  messageOutput: MessageTemplate;
  priority: number; // Higher = evaluated first
  enabled: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface DeterministicRule {
  type: 'jsonlogic' | 'regex' | 'javascript';
  logic: JSONLogicCondition | RegexPattern[] | string; // JS function body
  timeout?: number; // Max execution time (ms)
}

interface AIRule {
  type: 'classification' | 'extraction' | 'generation';
  model: string; // 'gpt-4', 'gpt-4o-mini', 'claude-3-sonnet', etc.
  prompt: string; // Template with {{variable}} substitution
  outputSchema: JSONSchema; // Validates AI output
  temperature?: number;
  maxTokens?: number;
  timeout?: number;

  // Determinism Configuration
  cacheable: boolean; // Cache results for replay
  cacheExpiry?: number; // Cache TTL in seconds
}

interface CompositeRule {
  type: 'sequence' | 'parallel' | 'conditional';
  rules: RuleReference[];
  combineStrategy: 'first_match' | 'all_results' | 'majority_vote';
}
```

### Rule Evaluation Pipeline

```typescript
class RuleEvaluationPipeline {
  async evaluateEvent(executionId: string, event: ExternalEvent): Promise<Message[]> {
    const execution = await this.getExecution(executionId);
    const template = await this.getTemplate(execution.templateId);

    // 1. Find applicable rules
    const applicableRules = await this.findApplicableRules(template, event);

    // 2. Sort by priority
    applicableRules.sort((a, b) => b.priority - a.priority);

    // 3. Evaluate rules
    const messages: Message[] = [];
    for (const rule of applicableRules) {
      try {
        const result = await this.evaluateRule(rule, event, execution);
        if (result.messages.length > 0) {
          messages.push(...result.messages);
        }
      } catch (error) {
        // Log error but continue processing other rules
        await this.logRuleError(rule.ruleId, event.id, error);
      }
    }

    // 4. Deduplicate and validate messages
    return this.deduplicateMessages(messages);
  }

  private async evaluateRule(
    rule: RuleDefinition,
    event: ExternalEvent,
    execution: ExecutionDocument
  ): Promise<RuleResult> {

    // Check cache for determinism
    if (rule.implementation.cacheable) {
      const eventHash = this.hashEvent(event);
      const cached = await this.ruleCache.get(rule.ruleId, eventHash);
      if (cached) {
        return cached;
      }
    }

    let result: RuleResult;

    switch (rule.type) {
      case 'deterministic':
        result = await this.evaluateDeterministicRule(rule, event, execution);
        break;
      case 'ai_classification':
      case 'ai_extraction':
        result = await this.evaluateAIRule(rule, event, execution);
        break;
      case 'composite':
        result = await this.evaluateCompositeRule(rule, event, execution);
        break;
      default:
        throw new Error(`Unknown rule type: ${rule.type}`);
    }

    // Cache result if configured
    if (rule.implementation.cacheable) {
      const eventHash = this.hashEvent(event);
      await this.ruleCache.set(rule.ruleId, eventHash, result);
    }

    return result;
  }
}
```

### AI Rule Evaluation with Caching

```typescript
class AIRuleEvaluator {
  async evaluateAIRule(
    rule: RuleDefinition,
    event: ExternalEvent,
    execution: ExecutionDocument
  ): Promise<RuleResult> {

    const aiRule = rule.implementation as AIRule;

    // 1. Prepare prompt with variable substitution
    const prompt = this.substituteVariables(aiRule.prompt, {
      event,
      execution,
      payload: event.payload
    });

    // 2. Call AI model
    const aiResponse = await this.callAIModel({
      model: aiRule.model,
      prompt,
      temperature: aiRule.temperature || 0,
      maxTokens: aiRule.maxTokens || 1000,
      timeout: aiRule.timeout || 30000
    });

    // 3. Validate against output schema
    const validatedOutput = this.validateAIOutput(aiResponse, aiRule.outputSchema);

    // 4. Generate messages from AI output
    const messages = this.generateMessages(rule.messageOutput, validatedOutput, event);

    return {
      ruleId: rule.ruleId,
      success: true,
      messages,
      metadata: {
        model: aiRule.model,
        promptTokens: aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        totalCost: this.calculateCost(aiResponse.usage, aiRule.model),
        cached: false
      }
    };
  }

  private async callAIModel(request: AIRequest): Promise<AIResponse> {
    // Implementation for various AI providers
    switch (request.model) {
      case 'gpt-4':
      case 'gpt-4o-mini':
        return this.openAIClient.call(request);
      case 'claude-3-sonnet':
        return this.anthropicClient.call(request);
      default:
        throw new Error(`Unsupported AI model: ${request.model}`);
    }
  }
}
```

## Message Generation

### Message Templates

```typescript
interface MessageTemplate {
  type: string; // Message type for FSM transition
  payload: PayloadTemplate;
  metadata?: MetadataTemplate;
}

interface PayloadTemplate {
  [key: string]: any; // Supports {{variable}} substitution and JSONLogic
}

// Example message template
const messageTemplate: MessageTemplate = {
  type: "payment_received",
  payload: {
    amount: "{{extracted.amount}}",
    currency: "USD",
    paidAt: "{{event.timestamp}}",
    reference: "{{extracted.reference || event.id}}",
    confidence: "{{aiOutput.confidence}}"
  },
  metadata: {
    derivedFrom: "{{event.id}}",
    ruleId: "{{rule.ruleId}}",
    processingTime: "{{performance.duration}}"
  }
};
```

## API Endpoints

### Rule Management

```yaml
/v1/templates/{templateId}/rules:
  get:
    summary: List rules for template
    parameters:
      - name: enabled
        in: query
        schema: { type: boolean }
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                rules:
                  type: array
                  items:
                    $ref: '#/components/schemas/RuleDefinition'

  post:
    summary: Create new rule
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RuleCreateRequest'
    responses:
      201:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RuleDefinition'

/v1/rules/{ruleId}:
  get:
    summary: Get rule details
  put:
    summary: Update rule
  delete:
    summary: Delete rule

/v1/rules/{ruleId}/test:
  post:
    summary: Test rule with sample event
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              event:
                $ref: '#/components/schemas/ExternalEvent'
              execution:
                $ref: '#/components/schemas/ExecutionContext'
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                success: { type: boolean }
                messages:
                  type: array
                  items:
                    $ref: '#/components/schemas/Message'
                processingTime: { type: number }
                cost: { type: number }
                errors:
                  type: array
                  items: { type: string }

/v1/rules/{ruleId}/performance:
  get:
    summary: Get rule performance metrics
    parameters:
      - name: timeWindow
        in: query
        schema: { type: string, enum: [24h, 7d, 30d] }
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                totalEvaluations: { type: number }
                averageLatency: { type: number }
                successRate: { type: number }
                totalCost: { type: number }
                cacheHitRate: { type: number }
```

## Determinism & Replay Guarantees

### Cache Management

```typescript
interface RuleCacheManager {
  // Cache Operations
  get(ruleId: string, eventHash: string): Promise<RuleResult | null>;
  set(ruleId: string, eventHash: string, result: RuleResult, ttl?: number): Promise<void>;
  invalidate(ruleId: string): Promise<void>;

  // Cache Analytics
  getHitRate(ruleId: string, timeWindow: string): Promise<number>;
  getCostSavings(ruleId: string, timeWindow: string): Promise<number>;
}

class RedisRuleCache implements RuleCacheManager {
  private redis: Redis;

  async get(ruleId: string, eventHash: string): Promise<RuleResult | null> {
    const key = `rule:${ruleId}:${eventHash}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(ruleId: string, eventHash: string, result: RuleResult, ttl = 86400): Promise<void> {
    const key = `rule:${ruleId}:${eventHash}`;
    await this.redis.setex(key, ttl, JSON.stringify(result));
  }
}
```

### Event Hashing for Determinism

```typescript
function hashEvent(event: ExternalEvent): string {
  // Create deterministic hash of event for caching
  const hashContent = {
    type: event.type,
    payload: event.payload,
    source: event.source,
    // Exclude timestamp and id for deterministic hashing
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hashContent, Object.keys(hashContent).sort()))
    .digest('hex');
}
```

## Performance Considerations

### Rule Optimization

1. **Rule Ordering**: High-priority, fast rules evaluated first
2. **Early Termination**: Stop evaluation when sufficient messages generated
3. **Parallel Evaluation**: Run independent rules concurrently
4. **Caching Strategy**: Aggressive caching for AI rules, TTL-based invalidation

### Monitoring & Alerting

```typescript
interface RuleMetrics {
  ruleId: string;
  evaluations: number;
  successRate: number;
  averageLatency: number;
  totalCost: number;
  cacheHitRate: number;
  errorRate: number;
}

// Alert conditions
const alertRules = [
  { condition: 'errorRate > 0.05', severity: 'warning' },
  { condition: 'averageLatency > 5000', severity: 'warning' },
  { condition: 'successRate < 0.95', severity: 'critical' },
  { condition: 'totalCost > monthlyBudget * 0.8', severity: 'warning' }
];
```

## Testing Strategy

### Rule Unit Testing

```typescript
describe('Email Classification Rule', () => {
  it('should classify termination email correctly', async () => {
    const rule = await ruleEngine.getRule('email_termination_notice');
    const testEvent = {
      type: 'email',
      payload: {
        subject: 'Terminating our agreement',
        body: 'I wish to terminate the rental agreement...',
        from: 'tenant@example.com'
      }
    };

    const result = await ruleEngine.testRule(rule.ruleId, testEvent);

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].type).toBe('termination_notice_received');
  });
});
```

### Integration Testing

```typescript
describe('Rule Engine Pipeline', () => {
  it('should process multiple rules and deduplicate messages', async () => {
    const event = createTestEvent();
    const messages = await ruleEngine.evaluateRules('exec_123', event);

    // Verify deduplication
    const messageTypes = messages.map(m => m.type);
    expect(messageTypes).toEqual([...new Set(messageTypes)]);
  });
});
```

This comprehensive rule engine specification provides the foundation for robust, deterministic event-to-message transformation while supporting both rule-based and AI-assisted approaches with proper caching and replay guarantees.