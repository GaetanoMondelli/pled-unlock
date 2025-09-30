# Action Execution Framework

## Overview

The Action Execution Framework handles side effects triggered by FSM state transitions. It ensures reliable, idempotent execution of actions with comprehensive error handling, retry policies, and audit trails.

## Architecture

```
FSM State Transition → Action Trigger → Action Queue → Action Runner → Result Event
```

### Core Components

1. **Action Definition System**: Template-defined actions with configuration
2. **Action Queue**: Reliable message queue for action execution
3. **Action Runners**: Specialized executors for different action types
4. **Retry Engine**: Configurable retry policies with backoff strategies
5. **Result Processor**: Handles action outcomes and generates result events
6. **Audit System**: Comprehensive logging and traceability

## Action Types

### 1. Notification Actions

**Email Notifications**
```json
{
  "actionId": "send_termination_notice",
  "type": "email",
  "triggerState": "notice_received",
  "config": {
    "provider": "sendgrid",
    "template": "termination_notice_template",
    "to": "{{execution.variables.landlordEmail}}",
    "cc": ["legal@company.com"],
    "variables": {
      "tenantName": "{{execution.variables.tenantName}}",
      "terminationDate": "{{message.payload.terminationDate}}",
      "propertyAddress": "{{execution.variables.propertyAddress}}"
    }
  },
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffStrategy": "exponential",
    "retryableErrors": ["rate_limit", "temporary_failure"]
  },
  "timeout": 30000
}
```

**SMS Notifications**
```json
{
  "actionId": "urgent_sms_alert",
  "type": "sms",
  "triggerState": "payment_overdue",
  "config": {
    "provider": "twilio",
    "to": "{{execution.variables.tenantPhone}}",
    "message": "Payment overdue for {{execution.variables.propertyAddress}}. Please contact us immediately."
  },
  "retryPolicy": {
    "maxAttempts": 2,
    "backoffStrategy": "fixed",
    "backoffDelay": 5000
  }
}
```

### 2. External System Integration

**Webhook Actions**
```json
{
  "actionId": "notify_crm_system",
  "type": "webhook",
  "triggerState": "application_approved",
  "config": {
    "url": "{{execution.variables.crmWebhookUrl}}",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer {{secrets.crm_api_token}}",
      "Content-Type": "application/json"
    },
    "payload": {
      "event": "application_approved",
      "applicantId": "{{execution.variables.applicantId}}",
      "approvalDate": "{{now}}",
      "executionId": "{{execution.id}}"
    },
    "expectedStatusCodes": [200, 201, 202]
  },
  "retryPolicy": {
    "maxAttempts": 5,
    "backoffStrategy": "exponential",
    "baseDelay": 1000,
    "maxDelay": 30000,
    "jitter": true
  }
}
```

**API Calls**
```json
{
  "actionId": "update_external_database",
  "type": "api_call",
  "triggerState": "data_validated",
  "config": {
    "service": "external_db",
    "endpoint": "/api/v1/records/{{execution.variables.recordId}}",
    "method": "PUT",
    "authentication": {
      "type": "oauth2",
      "tokenEndpoint": "{{secrets.external_db_token_url}}",
      "clientId": "{{secrets.external_db_client_id}}",
      "clientSecret": "{{secrets.external_db_client_secret}}"
    },
    "payload": {
      "status": "validated",
      "validatedAt": "{{now}}",
      "validationDetails": "{{message.payload}}"
    }
  }
}
```

### 3. Document Processing

**DocuSign Integration**
```json
{
  "actionId": "send_contract_for_signature",
  "type": "docusign_envelope",
  "triggerState": "contract_ready",
  "config": {
    "templateId": "{{execution.variables.contractTemplateId}}",
    "recipients": [
      {
        "email": "{{execution.variables.signerEmail}}",
        "name": "{{execution.variables.signerName}}",
        "role": "signer"
      }
    ],
    "templateRoles": [
      {
        "roleName": "Tenant",
        "name": "{{execution.variables.tenantName}}",
        "email": "{{execution.variables.tenantEmail}}"
      }
    ],
    "customFields": {
      "executionId": "{{execution.id}}",
      "propertyId": "{{execution.variables.propertyId}}"
    }
  },
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffStrategy": "exponential"
  }
}
```

### 4. Blockchain Operations

**Token Minting**
```json
{
  "actionId": "mint_certificate_nft",
  "type": "blockchain_mint",
  "triggerState": "certification_complete",
  "config": {
    "blockchain": "ethereum",
    "network": "base",
    "contractAddress": "{{secrets.certificate_contract_address}}",
    "function": "mint",
    "parameters": {
      "to": "{{execution.variables.recipientAddress}}",
      "tokenURI": "{{execution.variables.certificateMetadataUri}}",
      "certificateData": "{{message.payload.certificateHash}}"
    },
    "gasLimit": 200000,
    "gasPrice": "auto"
  },
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffStrategy": "exponential",
    "retryableErrors": ["gas_price_too_low", "network_congestion"]
  }
}
```

## Action Execution Engine

### Core Action Runner Interface

```typescript
interface ActionRunner {
  execute(action: ActionDefinition, context: ExecutionContext): Promise<ActionResult>;
  validateConfig(config: ActionConfig): ValidationResult;
  getRequiredPermissions(): Permission[];
}

interface ActionDefinition {
  actionId: string;
  type: ActionType;
  triggerState: string;
  config: ActionConfig;
  retryPolicy: RetryPolicy;
  timeout: number;
  enabled: boolean;

  // Scheduling
  delay?: number; // Delay execution by N milliseconds
  schedule?: CronExpression; // For recurring actions

  // Conditions
  condition?: string; // JSONLogic condition for conditional execution

  // Metadata
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ExecutionContext {
  executionId: string;
  execution: ExecutionDocument;
  message: Message;
  previousState: string;
  currentState: string;
  variables: Record<string, any>;
  secrets: SecretResolver;
  timestamp: number;
}

interface ActionResult {
  actionId: string;
  success: boolean;
  result?: any;
  error?: ActionError;

  // Performance metrics
  startTime: number;
  endTime: number;
  duration: number;

  // Resource usage
  costEstimate?: number;

  // Generated events
  resultEvents: Event[];

  // Metadata
  attempt: number;
  runner: string;
  metadata: Record<string, any>;
}
```

### Action Queue Management

```typescript
interface ActionQueue {
  enqueue(action: QueuedAction): Promise<string>;
  dequeue(runner: string): Promise<QueuedAction | null>;
  retry(actionId: string, reason: string): Promise<void>;
  fail(actionId: string, error: ActionError): Promise<void>;
  complete(actionId: string, result: ActionResult): Promise<void>;

  // Monitoring
  getQueueStatus(): Promise<QueueStatus>;
  getFailedActions(limit?: number): Promise<QueuedAction[]>;
}

interface QueuedAction {
  id: string;
  executionId: string;
  actionDefinition: ActionDefinition;
  context: ExecutionContext;

  // Queue metadata
  enqueuedAt: number;
  scheduledFor: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: ActionError;

  // Priority and routing
  priority: number;
  runner?: string; // Specific runner assignment
  tags: string[];
}

class BullMQActionQueue implements ActionQueue {
  private queue: Queue;

  constructor(redisConnection: Redis) {
    this.queue = new Queue('actions', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 1, // Handled by our retry system
      }
    });
  }

  async enqueue(action: QueuedAction): Promise<string> {
    const job = await this.queue.add(
      'execute_action',
      action,
      {
        delay: action.scheduledFor - Date.now(),
        priority: action.priority,
        jobId: action.id
      }
    );

    return job.id!;
  }
}
```

### Retry Engine

```typescript
interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential' | 'custom';
  baseDelay?: number; // Base delay in milliseconds
  maxDelay?: number; // Maximum delay cap
  multiplier?: number; // For exponential backoff
  jitter?: boolean; // Add randomness to prevent thundering herd
  retryableErrors?: string[]; // Only retry these error types
  nonRetryableErrors?: string[]; // Never retry these errors
}

class RetryEngine {
  calculateDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.backoffStrategy) {
      case 'fixed':
        delay = policy.baseDelay || 1000;
        break;

      case 'linear':
        delay = (policy.baseDelay || 1000) * attempt;
        break;

      case 'exponential':
        const multiplier = policy.multiplier || 2;
        delay = (policy.baseDelay || 1000) * Math.pow(multiplier, attempt - 1);
        break;

      default:
        delay = 1000;
    }

    // Apply maximum delay cap
    if (policy.maxDelay) {
      delay = Math.min(delay, policy.maxDelay);
    }

    // Add jitter if configured
    if (policy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  shouldRetry(error: ActionError, attempt: number, policy: RetryPolicy): boolean {
    // Check attempt limit
    if (attempt >= policy.maxAttempts) {
      return false;
    }

    // Check non-retryable errors
    if (policy.nonRetryableErrors?.includes(error.type)) {
      return false;
    }

    // Check retryable errors (if specified, only retry these)
    if (policy.retryableErrors && policy.retryableErrors.length > 0) {
      return policy.retryableErrors.includes(error.type);
    }

    // Default: retry most errors except for certain types
    const nonRetryableByDefault = [
      'authentication_failed',
      'authorization_failed',
      'invalid_configuration',
      'malformed_request'
    ];

    return !nonRetryableByDefault.includes(error.type);
  }
}
```

### Specialized Action Runners

```typescript
class EmailActionRunner implements ActionRunner {
  private emailService: EmailService;

  async execute(action: ActionDefinition, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Validate configuration
      const validation = this.validateConfig(action.config);
      if (!validation.isValid) {
        throw new ActionError('invalid_configuration', validation.errors);
      }

      // Resolve template variables
      const resolvedConfig = this.resolveVariables(action.config, context);

      // Send email
      const emailResult = await this.emailService.send({
        to: resolvedConfig.to,
        cc: resolvedConfig.cc,
        subject: resolvedConfig.subject,
        template: resolvedConfig.template,
        variables: resolvedConfig.variables
      });

      // Generate result event
      const resultEvent: Event = {
        type: 'email_sent',
        payload: {
          messageId: emailResult.messageId,
          recipients: resolvedConfig.to,
          template: resolvedConfig.template,
          actionId: action.actionId
        },
        source: 'action_runner',
        timestamp: new Date().toISOString()
      };

      return {
        actionId: action.actionId,
        success: true,
        result: emailResult,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        resultEvents: [resultEvent],
        attempt: context.attempt || 1,
        runner: 'email',
        metadata: {
          provider: resolvedConfig.provider,
          templateUsed: resolvedConfig.template
        }
      };

    } catch (error) {
      return {
        actionId: action.actionId,
        success: false,
        error: this.mapError(error),
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        resultEvents: [],
        attempt: context.attempt || 1,
        runner: 'email',
        metadata: {}
      };
    }
  }

  private mapError(error: any): ActionError {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return { type: 'rate_limit', message: error.message, retryable: true };
    }
    if (error.code === 'INVALID_EMAIL') {
      return { type: 'invalid_configuration', message: error.message, retryable: false };
    }
    return { type: 'unknown_error', message: error.message, retryable: true };
  }
}

class WebhookActionRunner implements ActionRunner {
  private httpClient: AxiosInstance;

  async execute(action: ActionDefinition, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      const config = action.config as WebhookConfig;
      const resolvedPayload = this.resolveVariables(config.payload, context);

      const response = await this.httpClient.request({
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: resolvedPayload,
        timeout: action.timeout,
        validateStatus: (status) =>
          config.expectedStatusCodes?.includes(status) || status < 400
      });

      const resultEvent: Event = {
        type: 'webhook_called',
        payload: {
          url: config.url,
          method: config.method,
          statusCode: response.status,
          responseTime: Date.now() - startTime,
          actionId: action.actionId
        },
        source: 'action_runner',
        timestamp: new Date().toISOString()
      };

      return {
        actionId: action.actionId,
        success: true,
        result: {
          statusCode: response.status,
          headers: response.headers,
          data: response.data
        },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        resultEvents: [resultEvent],
        attempt: context.attempt || 1,
        runner: 'webhook',
        metadata: {
          url: config.url,
          statusCode: response.status
        }
      };

    } catch (error) {
      return this.handleError(action, error, startTime);
    }
  }
}
```

## Error Handling & Recovery

### Error Classification

```typescript
interface ActionError {
  type: ErrorType;
  message: string;
  retryable: boolean;
  code?: string;
  details?: Record<string, any>;
}

type ErrorType =
  | 'timeout'
  | 'rate_limit'
  | 'authentication_failed'
  | 'authorization_failed'
  | 'invalid_configuration'
  | 'malformed_request'
  | 'network_error'
  | 'service_unavailable'
  | 'unknown_error';

class ErrorClassifier {
  classify(error: any, actionType: string): ActionError {
    // HTTP errors
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        return { type: 'authentication_failed', message: 'Authentication failed', retryable: false };
      }
      if (status === 403) {
        return { type: 'authorization_failed', message: 'Insufficient permissions', retryable: false };
      }
      if (status === 429) {
        return { type: 'rate_limit', message: 'Rate limit exceeded', retryable: true };
      }
      if (status >= 500) {
        return { type: 'service_unavailable', message: 'Service temporarily unavailable', retryable: true };
      }
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return { type: 'timeout', message: 'Request timed out', retryable: true };
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return { type: 'network_error', message: 'Network connection failed', retryable: true };
    }

    return { type: 'unknown_error', message: error.message, retryable: true };
  }
}
```

### Dead Letter Queue

```typescript
interface DeadLetterQueue {
  add(failedAction: FailedAction): Promise<void>;
  list(filters?: DLQFilters): Promise<FailedAction[]>;
  retry(actionId: string): Promise<void>;
  retryAll(filters?: DLQFilters): Promise<number>;
  archive(actionId: string): Promise<void>;
}

interface FailedAction {
  id: string;
  originalAction: QueuedAction;
  failureReason: ActionError;
  failedAt: number;
  totalAttempts: number;
  lastAttemptAt: number;

  // Recovery metadata
  recoverable: boolean;
  manualReviewRequired: boolean;
  suggestedFix?: string;
}

class DeadLetterQueueManager implements DeadLetterQueue {
  async add(failedAction: FailedAction): Promise<void> {
    await this.storage.store(failedAction);

    // Send alerts for critical failures
    if (this.isCriticalFailure(failedAction)) {
      await this.alertService.sendAlert({
        type: 'action_failed',
        severity: 'high',
        details: failedAction
      });
    }
  }

  private isCriticalFailure(action: FailedAction): boolean {
    return action.originalAction.actionDefinition.type === 'blockchain_mint' ||
           action.originalAction.priority > 90;
  }
}
```

## Monitoring & Observability

### Action Metrics

```typescript
interface ActionMetrics {
  actionType: string;
  actionId: string;

  // Execution metrics
  totalExecutions: number;
  successRate: number;
  averageLatency: number;
  p95Latency: number;

  // Retry metrics
  retryRate: number;
  averageRetries: number;

  // Cost metrics
  totalCost: number;
  costPerExecution: number;

  // Error breakdown
  errorTypes: Record<string, number>;
}

class ActionMonitor {
  async recordExecution(result: ActionResult): Promise<void> {
    const metrics = {
      action_id: result.actionId,
      action_type: result.runner,
      success: result.success,
      duration: result.duration,
      attempt: result.attempt,
      timestamp: result.endTime
    };

    await this.metricsCollector.record('action_execution', metrics);

    if (!result.success) {
      await this.metricsCollector.record('action_failure', {
        ...metrics,
        error_type: result.error?.type,
        retryable: result.error?.retryable
      });
    }
  }

  async getActionHealth(actionId: string, timeWindow: string): Promise<ActionHealthReport> {
    const executions = await this.getExecutions(actionId, timeWindow);

    return {
      actionId,
      timeWindow,
      totalExecutions: executions.length,
      successRate: executions.filter(e => e.success).length / executions.length,
      averageLatency: executions.reduce((sum, e) => sum + e.duration, 0) / executions.length,
      failureReasons: this.aggregateFailureReasons(executions),
      recommendations: this.generateRecommendations(executions)
    };
  }
}
```

## Testing Framework

### Action Testing

```typescript
class ActionTestFramework {
  async testAction(
    actionDefinition: ActionDefinition,
    testContext: ExecutionContext,
    mockConfig?: MockConfig
  ): Promise<ActionTestResult> {

    // Set up mocks
    const mocks = this.setupMocks(actionDefinition.type, mockConfig);

    // Execute action
    const runner = this.getRunner(actionDefinition.type);
    const result = await runner.execute(actionDefinition, testContext);

    // Validate result
    const validation = this.validateResult(result, actionDefinition);

    return {
      success: result.success,
      result,
      validation,
      mockInteractions: mocks.getInteractions(),
      recommendations: this.generateTestRecommendations(result)
    };
  }

  generateLoadTest(actionDefinition: ActionDefinition, config: LoadTestConfig): LoadTestPlan {
    return {
      actionId: actionDefinition.actionId,
      concurrency: config.concurrency,
      duration: config.duration,
      rampUpTime: config.rampUpTime,
      scenarios: this.generateTestScenarios(actionDefinition, config)
    };
  }
}
```

This comprehensive action execution framework provides robust, reliable action processing with proper error handling, retry mechanisms, and observability features essential for a production FSM-based workflow system.