# PLED API Implementation

## Overview

This API implementation supports the evolved PLED architecture where **FSM machines are nodes within workflow graphs** rather than standalone entities. The API is designed to be deployment-agnostic (Vercel, Firebase Functions, traditional servers) through a clean service layer abstraction.

## Architecture Evolution

### From Simple FSM to Node-Based Workflows

**Original (Hackathon):**
```
Events → Single FSM → Actions
```

**Current:**
```
Events → Scenario (Node Graph) → [DataSource, Queue, FSMProcessNode, Sink] → Token Flow
```

### Key Changes Captured

1. **Scenarios** are the top-level execution units (containing node graphs)
2. **FSMProcessNode** is one of many node types in a workflow
3. **Token-based data flow** between nodes
4. **Multi-node event processing** with complex state management

## API Structure

```
/lib/api/
├── controllers/           # HTTP request handlers (deployment-agnostic)
├── services/             # Business logic (core functionality)
├── repositories/         # Data access layer
├── types/               # Shared type definitions
├── middleware/          # Auth, validation, etc.
└── adapters/           # Deployment-specific adapters
```

## Core Concepts

### Scenarios vs Executions vs Templates

- **Template**: Reusable scenario definition (like a class)
- **Scenario**: A specific node graph configuration (instance of template)
- **Execution**: A running instance of a scenario with live state

### Node Types Supported

- `DataSource`: Token generators
- `Queue`: Token accumulators/processors
- `ProcessNode`: Token transformers
- `FSMProcessNode`: FSM-based processors ⭐
- `Sink`: Token consumers
- `Module`: Nested sub-graphs
- `Group`: Visual organization

### Token Flow Model

Tokens flow between nodes carrying:
- Value data
- Creation timestamp
- Source node ID
- Complete lineage history
- Transformation metadata

## API Endpoints

### Core Resource Management

```
# Scenarios (Template definitions)
GET    /api/v1/scenarios
POST   /api/v1/scenarios
GET    /api/v1/scenarios/{id}
PUT    /api/v1/scenarios/{id}
DELETE /api/v1/scenarios/{id}

# Executions (Running instances)
GET    /api/v1/executions
POST   /api/v1/executions
GET    /api/v1/executions/{id}
PUT    /api/v1/executions/{id}
DELETE /api/v1/executions/{id}

# Execution State & Control
GET    /api/v1/executions/{id}/state
POST   /api/v1/executions/{id}/play
POST   /api/v1/executions/{id}/pause
POST   /api/v1/executions/{id}/step
POST   /api/v1/executions/{id}/reset
```

### Node-Level Operations

```
# Node State Management
GET    /api/v1/executions/{id}/nodes
GET    /api/v1/executions/{id}/nodes/{nodeId}/state
POST   /api/v1/executions/{id}/nodes/{nodeId}/inject-token

# FSM Node Specific Operations
GET    /api/v1/executions/{id}/nodes/{nodeId}/fsm-state
POST   /api/v1/executions/{id}/nodes/{nodeId}/fsm-transition
```

### Event & Token Management

```
# Event Processing
POST   /api/v1/executions/{id}/events
GET    /api/v1/executions/{id}/events
GET    /api/v1/executions/{id}/events/{eventId}

# Token Flow
GET    /api/v1/executions/{id}/tokens
GET    /api/v1/executions/{id}/token-lineage/{tokenId}
GET    /api/v1/executions/{id}/nodes/{nodeId}/tokens
```

### Real-time & Monitoring

```
# Real-time Updates
GET    /api/v1/executions/{id}/stream        # SSE
WebSocket /api/v1/executions/{id}/ws        # WebSocket

# Activity & Audit
GET    /api/v1/executions/{id}/activity-log
GET    /api/v1/executions/{id}/snapshots
POST   /api/v1/executions/{id}/snapshots
```

## Implementation Features

### 1. Deployment Agnostic Design

The API uses adapter pattern to support multiple deployment targets:

```typescript
interface APIAdapter {
  createHandler(controller: Controller): DeploymentHandler;
  parseRequest(req: any): ParsedRequest;
  formatResponse(res: any): FormattedResponse;
}

// Adapters for different platforms
class VercelAdapter implements APIAdapter { ... }
class FirebaseFunctionsAdapter implements APIAdapter { ... }
class ExpressAdapter implements APIAdapter { ... }
```

### 2. Service Layer Abstraction

Core business logic is independent of HTTP concerns:

```typescript
class ScenarioService {
  async createExecution(scenarioId: string, name: string): Promise<Execution>;
  async processEvent(executionId: string, event: Event): Promise<ProcessingResult>;
  async getExecutionState(executionId: string): Promise<ExecutionState>;
}

class NodeService {
  async getNodeState(executionId: string, nodeId: string): Promise<NodeState>;
  async processFSMTransition(nodeId: string, message: Message): Promise<FSMResult>;
  async injectToken(nodeId: string, token: Token): Promise<void>;
}
```

### 3. Type Safety

Comprehensive TypeScript types that match the simulation types:

```typescript
// Re-exports from simulation/types.ts
export type {
  Scenario,
  AnyNode,
  FSMProcessNode,
  Token,
  HistoryEntry,
  ExecutionState
} from '@/lib/simulation/types';

// API-specific types
export interface ExecutionCreateRequest {
  scenarioId: string;
  name: string;
  description?: string;
  initialVariables?: Record<string, any>;
}

export interface ProcessEventRequest {
  type: string;
  payload: any;
  source?: string;
  timestamp?: string;
}
```

## Usage Examples

### Create and Run an Execution

```typescript
// Create execution from scenario
const execution = await api.post('/api/v1/executions', {
  scenarioId: 'sc_approval_workflow',
  name: 'Application #1234'
});

// Send initial event
await api.post(`/api/v1/executions/${execution.id}/events`, {
  type: 'application_submitted',
  payload: {
    applicantId: 'user123',
    applicationData: { score: 85 }
  }
});

// Check current state
const state = await api.get(`/api/v1/executions/${execution.id}/state`);
console.log('Current state:', state.globalState);
console.log('Node states:', state.nodeStates);
```

### Monitor FSM Node Specifically

```typescript
// Get FSM node state
const fsmState = await api.get(
  `/api/v1/executions/${executionId}/nodes/approval_fsm/fsm-state`
);

console.log('FSM current state:', fsmState.currentState);
console.log('FSM variables:', fsmState.variables);

// Force FSM transition (admin operation)
await api.post(`/api/v1/executions/${executionId}/nodes/approval_fsm/fsm-transition`, {
  targetState: 'approved',
  reason: 'Manual override by admin'
});
```

### Real-time Monitoring

```typescript
// SSE stream for real-time updates
const eventSource = new EventSource(
  `/api/v1/executions/${executionId}/stream`
);

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);

  switch (update.type) {
    case 'state_change':
      console.log('State changed:', update.newState);
      break;
    case 'token_flow':
      console.log('Token moved:', update.token);
      break;
    case 'fsm_transition':
      console.log('FSM transition:', update.transition);
      break;
  }
};
```

## Integration with Existing Code

### Simulation Store Bridge

The API integrates with the existing simulation store:

```typescript
class SimulationStoreService {
  async syncExecutionFromStore(executionId: string): Promise<void> {
    const storeState = useSimulationStore.getState();
    await this.updateExecution(executionId, {
      nodeStates: storeState.nodeStates,
      currentTime: storeState.currentTime,
      globalActivityLog: storeState.globalActivityLog
    });
  }

  async loadExecutionToStore(executionId: string): Promise<void> {
    const execution = await this.getExecution(executionId);
    const { loadScenario, setNodeStates } = useSimulationStore.getState();

    await loadScenario(execution.scenario);
    setNodeStates(execution.nodeStates);
  }
}
```

### Template-Editor Integration

The template editor can use the API for persistence:

```typescript
// Save template changes
const handleSaveTemplate = async () => {
  const currentScenario = useSimulationStore.getState().scenario;

  await api.put(`/api/v1/scenarios/${templateId}`, {
    scenario: currentScenario,
    version: '3.0'
  });
};

// Load template for editing
const handleLoadTemplate = async (templateId: string) => {
  const scenario = await api.get(`/api/v1/scenarios/${templateId}`);
  const { loadScenario } = useSimulationStore.getState();
  await loadScenario(scenario);
};
```

This API design maintains backward compatibility while fully supporting the new node-based architecture with FSM machines as workflow components.