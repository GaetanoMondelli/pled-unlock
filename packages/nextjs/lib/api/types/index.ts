/**
 * PLED API Types
 *
 * Comprehensive type definitions for the PLED API that support
 * the evolved node-based workflow architecture.
 */

// Re-export simulation types for consistency
export type {
  Scenario,
  AnyNode,
  DataSourceNode,
  QueueNode,
  ProcessNode,
  FSMProcessNode,
  SinkNode,
  ModuleNode,
  GroupNode,
  Token,
  HistoryEntry,
  AnyNodeState,
  DataSourceState,
  QueueState,
  ProcessNodeState,
  FSMProcessNodeState,
  SinkState,
  ModuleState,
  FSMDefinition,
  FSMTransition,
  FSMStateActions
} from '@/lib/simulation/types';

// =============================================================================
// Core API Types
// =============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// Scenario Management
// =============================================================================

export interface ScenarioDocument {
  id: string;
  name: string;
  description?: string;
  scenario: Scenario;
  version: string;
  organizationId: string;
  createdBy: string;
  isTemplate: boolean;
  isDefault?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioCreateRequest {
  name: string;
  description?: string;
  scenario: Scenario;
  isTemplate?: boolean;
  isDefault?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ScenarioUpdateRequest {
  name?: string;
  description?: string;
  scenario?: Scenario;
  tags?: string[];
  metadata?: Record<string, any>;
}

// =============================================================================
// Execution Management
// =============================================================================

export interface ExecutionDocument {
  id: string;
  scenarioId: string;
  name: string;
  description?: string;
  status: ExecutionStatus;

  // Runtime State
  nodeStates: Record<string, AnyNodeState>;
  currentTime: number;
  globalActivityLog: HistoryEntry[];

  // Execution Config
  organizationId: string;
  createdBy: string;
  initialVariables?: Record<string, any>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
}

export type ExecutionStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'terminated';

export interface ExecutionCreateRequest {
  scenarioId: string;
  name: string;
  description?: string;
  initialVariables?: Record<string, any>;
}

export interface ExecutionUpdateRequest {
  name?: string;
  description?: string;
  status?: ExecutionStatus;
}

export interface ExecutionState {
  executionId: string;
  status: ExecutionStatus;
  currentTime: number;

  // Global state aggregation
  globalState: {
    totalNodes: number;
    activeNodes: number;
    totalTokens: number;
    totalEvents: number;
  };

  // Individual node states
  nodeStates: Record<string, AnyNodeState>;

  // Recent activity
  recentActivity: HistoryEntry[];

  // FSM-specific aggregations
  fsmStates?: Record<string, {
    nodeId: string;
    currentState: string;
    variables: Record<string, any>;
    lastTransition?: {
      from: string;
      to: string;
      trigger: string;
      timestamp: number;
    };
  }>;
}

// =============================================================================
// Event Processing
// =============================================================================

export interface Event {
  id: string;
  executionId: string;
  type: string;
  payload: any;
  source?: string;
  timestamp: string;
  sequence: number;

  // Processing metadata
  processedAt?: string;
  processingDuration?: number;
  messagesGenerated?: number;

  // Tracing
  traceId?: string;
  parentEventId?: string;
}

export interface EventCreateRequest {
  type: string;
  payload: any;
  source?: string;
  timestamp?: string; // If not provided, uses current time

  // Optional routing
  targetNodeIds?: string[];

  // Idempotency
  idempotencyKey?: string;
}

export interface EventProcessingResult {
  eventId: string;
  success: boolean;
  processingTime: number;

  // Processing outcomes
  messagesGenerated: Message[];
  stateChanges: StateChange[];
  tokensCreated: Token[];
  actionsTriggered: ActionExecution[];

  // Errors (if any)
  errors?: ProcessingError[];
  warnings?: string[];
}

export interface Message {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  derivedFromEventIds: string[];
  ruleId?: string;

  // Processing metadata
  processingConfidence?: number;
  aiGenerated?: boolean;
}

export interface StateChange {
  nodeId: string;
  nodeType: string;
  field: string;
  previousValue: any;
  newValue: any;
  timestamp: string;
}

export interface ProcessingError {
  nodeId?: string;
  type: string;
  message: string;
  details?: any;
  retryable: boolean;
}

// =============================================================================
// Node Operations
// =============================================================================

export interface NodeStateResponse {
  nodeId: string;
  nodeType: string;
  state: AnyNodeState;

  // Node-specific details
  details: {
    displayName: string;
    position: { x: number; y: number };
    isActive: boolean;
    lastProcessedTime?: number;
    errorState?: string;
  };

  // Input/Output status
  inputs?: {
    name: string;
    connectedFrom?: string;
    tokenCount: number;
    lastTokenTime?: number;
  }[];
  outputs?: {
    name: string;
    connectedTo?: string;
    tokenCount: number;
    lastTokenTime?: number;
  }[];
}

export interface TokenInjectionRequest {
  value: any;
  inputName?: string; // For nodes with multiple inputs
  source?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// FSM-Specific Operations
// =============================================================================

export interface FSMStateResponse {
  nodeId: string;
  fsmDefinition: FSMDefinition;

  // Current runtime state
  currentState: string;
  variables: Record<string, any>;
  inputBuffers: Record<string, Token[]>;

  // Transition history
  transitionHistory: FSMTransitionEvent[];

  // Available transitions
  availableTransitions: {
    trigger: string;
    targetState: string;
    condition?: string;
    conditionMet?: boolean;
  }[];

  // Pending actions
  pendingActions: {
    actionType: string;
    stateTrigger: string;
    input: any;
    createdAt: string;
  }[];
}

export interface FSMTransitionEvent {
  id: string;
  from: string;
  to: string;
  trigger: string;
  timestamp: string;
  messageId?: string;
  variables?: Record<string, any>;
  duration?: number;
}

export interface FSMTransitionRequest {
  targetState?: string;          // For manual transitions
  message?: {                    // For event-driven transitions
    type: string;
    payload: any;
  };
  reason?: string;               // For audit trail
  bypassGuards?: boolean;        // Admin override
}

// =============================================================================
// Token Management
// =============================================================================

export interface TokenFlowResponse {
  executionId: string;

  // Token counts by node
  tokensByNode: Record<string, {
    nodeId: string;
    nodeType: string;
    inputTokens: number;
    outputTokens: number;
    processingTokens: number;
  }>;

  // Recent token flows
  recentFlows: {
    tokenId: string;
    fromNodeId: string;
    toNodeId: string;
    value: any;
    timestamp: string;
  }[];

  // Active tokens
  activeTokens: Token[];
}

export interface TokenLineageResponse {
  tokenId: string;
  token: Token;

  // Complete lineage chain
  lineage: {
    tokenId: string;
    originNodeId: string;
    parentTokenIds: string[];
    childTokenIds: string[];
    transformations: {
      nodeId: string;
      nodeType: string;
      operation: string;
      timestamp: string;
      details?: any;
    }[];
  };

  // Graphical representation
  lineageGraph: {
    nodes: { id: string; label: string; type: string }[];
    edges: { from: string; to: string; label?: string }[];
  };
}

// =============================================================================
// Real-time Streaming
// =============================================================================

export interface StreamEvent {
  type: StreamEventType;
  timestamp: string;
  executionId: string;
  data: any;
}

export type StreamEventType =
  | 'execution_status_changed'
  | 'node_state_changed'
  | 'token_created'
  | 'token_moved'
  | 'token_consumed'
  | 'fsm_transition'
  | 'event_processed'
  | 'action_executed'
  | 'error_occurred';

// =============================================================================
// Action Execution
// =============================================================================

export interface ActionExecution {
  id: string;
  executionId: string;
  nodeId: string;
  actionType: string;
  input: any;

  // Execution details
  status: ActionExecutionStatus;
  result?: any;
  error?: string;

  // Timing
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;

  // Context
  triggerState: string;
  triggerMessage?: string;
  attempt: number;
  maxAttempts: number;
}

export type ActionExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled';

// =============================================================================
// Snapshots & History
// =============================================================================

export interface ExecutionSnapshot {
  id: string;
  executionId: string;
  name?: string;
  description?: string;

  // Captured state
  nodeStates: Record<string, AnyNodeState>;
  currentTime: number;
  globalActivityLog: HistoryEntry[];

  // Metadata
  createdAt: string;
  createdBy: string;
  sequenceNumber: number;
  totalEvents: number;
}

export interface SnapshotCreateRequest {
  name?: string;
  description?: string;
}

// =============================================================================
// Query Parameters
// =============================================================================

export interface ListQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface ExecutionListQuery extends ListQuery {
  status?: ExecutionStatus;
  scenarioId?: string;
  createdBy?: string;
  since?: string;
  until?: string;
}

export interface EventListQuery extends ListQuery {
  type?: string;
  source?: string;
  nodeId?: string;
  since?: string;
  until?: string;
  afterSequence?: number;
}

// =============================================================================
// Error Types
// =============================================================================

export interface APIError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
  timestamp: string;
}

export const ErrorCodes = {
  // Validation errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE: 'INVALID_FIELD_VALUE',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Execution errors
  EXECUTION_NOT_RUNNING: 'EXECUTION_NOT_RUNNING',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  FSM_TRANSITION_FAILED: 'FSM_TRANSITION_FAILED',

  // Processing errors
  EVENT_PROCESSING_FAILED: 'EVENT_PROCESSING_FAILED',
  TOKEN_INJECTION_FAILED: 'TOKEN_INJECTION_FAILED',
  ACTION_EXECUTION_FAILED: 'ACTION_EXECUTION_FAILED',

  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];