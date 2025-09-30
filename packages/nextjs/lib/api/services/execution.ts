/**
 * Execution Service
 *
 * Core business logic for managing scenario executions,
 * integrating with the existing simulation store architecture.
 */

import type {
  ExecutionDocument,
  ExecutionCreateRequest,
  ExecutionUpdateRequest,
  ExecutionState,
  Event,
  EventCreateRequest,
  EventProcessingResult,
  ExecutionStatus,
  NodeStateResponse,
  TokenInjectionRequest,
  FSMStateResponse,
  FSMTransitionRequest,
  ExecutionSnapshot,
  SnapshotCreateRequest,
} from '../types';

import type {
  Scenario,
  AnyNodeState,
  HistoryEntry,
  Token,
  FSMProcessNodeState,
  Message,
} from '@/lib/simulation/types';

import { nanoid } from '@/lib/nanoid';

// =============================================================================
// Service Interface
// =============================================================================

export interface ExecutionRepository {
  // Basic CRUD
  create(execution: Omit<ExecutionDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionDocument>;
  findById(id: string): Promise<ExecutionDocument | null>;
  findByScenario(scenarioId: string): Promise<ExecutionDocument[]>;
  update(id: string, updates: Partial<ExecutionDocument>): Promise<ExecutionDocument>;
  delete(id: string): Promise<void>;

  // State management
  saveState(id: string, nodeStates: Record<string, AnyNodeState>, currentTime: number): Promise<void>;
  loadState(id: string): Promise<{ nodeStates: Record<string, AnyNodeState>; currentTime: number } | null>;

  // Event management
  addEvent(event: Event): Promise<Event>;
  getEvents(executionId: string, afterSequence?: number): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | null>;

  // Activity log
  appendActivity(executionId: string, entries: HistoryEntry[]): Promise<void>;
  getActivity(executionId: string, limit?: number): Promise<HistoryEntry[]>;

  // Snapshots
  createSnapshot(snapshot: Omit<ExecutionSnapshot, 'id' | 'createdAt'>): Promise<ExecutionSnapshot>;
  getSnapshots(executionId: string): Promise<ExecutionSnapshot[]>;
  getSnapshot(snapshotId: string): Promise<ExecutionSnapshot | null>;
}

export interface ScenarioRepository {
  findById(id: string): Promise<{ id: string; scenario: Scenario } | null>;
}

export interface SimulationEngine {
  // Scenario management
  loadScenario(scenario: Scenario): Promise<void>;
  getCurrentState(): Promise<{ nodeStates: Record<string, AnyNodeState>; currentTime: number }>;

  // Event processing
  processEvent(event: Event): Promise<EventProcessingResult>;

  // Node operations
  getNodeState(nodeId: string): Promise<AnyNodeState | null>;
  injectToken(nodeId: string, token: Token): Promise<void>;

  // FSM operations
  getFSMState(nodeId: string): Promise<FSMProcessNodeState | null>;
  triggerFSMTransition(nodeId: string, request: FSMTransitionRequest): Promise<{ success: boolean; newState?: string; error?: string }>;

  // Control
  play(): Promise<void>;
  pause(): Promise<void>;
  step(steps?: number): Promise<void>;
  reset(): Promise<void>;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class ExecutionService {
  constructor(
    private executionRepo: ExecutionRepository,
    private scenarioRepo: ScenarioRepository,
    private simulationEngine: SimulationEngine
  ) {}

  // ===========================================================================
  // Execution Management
  // ===========================================================================

  async createExecution(request: ExecutionCreateRequest, organizationId: string, userId: string): Promise<ExecutionDocument> {
    // Validate scenario exists
    const scenario = await this.scenarioRepo.findById(request.scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${request.scenarioId} not found`);
    }

    // Create execution record
    const execution = await this.executionRepo.create({
      scenarioId: request.scenarioId,
      name: request.name,
      description: request.description,
      status: 'created',
      nodeStates: {},
      currentTime: 0,
      globalActivityLog: [],
      organizationId,
      createdBy: userId,
      initialVariables: request.initialVariables,
      lastActivityAt: new Date().toISOString(),
    });

    // Initialize simulation engine with scenario
    await this.simulationEngine.loadScenario(scenario.scenario);
    const initialState = await this.simulationEngine.getCurrentState();

    // Save initial state
    await this.executionRepo.saveState(execution.id, initialState.nodeStates, initialState.currentTime);

    // Update execution status
    const updatedExecution = await this.executionRepo.update(execution.id, {
      status: 'running',
      nodeStates: initialState.nodeStates,
      currentTime: initialState.currentTime,
      startedAt: new Date().toISOString(),
    });

    return updatedExecution;
  }

  async getExecution(id: string): Promise<ExecutionDocument | null> {
    return this.executionRepo.findById(id);
  }

  async updateExecution(id: string, request: ExecutionUpdateRequest): Promise<ExecutionDocument> {
    const execution = await this.executionRepo.findById(id);
    if (!execution) {
      throw new Error(`Execution ${id} not found`);
    }

    const updates: Partial<ExecutionDocument> = {
      ...request,
      lastActivityAt: new Date().toISOString(),
    };

    // Handle status transitions
    if (request.status && request.status !== execution.status) {
      await this.handleStatusTransition(execution, request.status);

      if (request.status === 'completed') {
        updates.completedAt = new Date().toISOString();
      }
    }

    return this.executionRepo.update(id, updates);
  }

  async deleteExecution(id: string): Promise<void> {
    const execution = await this.executionRepo.findById(id);
    if (!execution) {
      throw new Error(`Execution ${id} not found`);
    }

    // Stop execution if running
    if (execution.status === 'running') {
      await this.simulationEngine.pause();
    }

    await this.executionRepo.delete(id);
  }

  async getExecutionState(id: string): Promise<ExecutionState> {
    const execution = await this.executionRepo.findById(id);
    if (!execution) {
      throw new Error(`Execution ${id} not found`);
    }

    // Get current state from simulation engine
    const currentState = await this.simulationEngine.getCurrentState();

    // Calculate global state aggregations
    const totalNodes = Object.keys(currentState.nodeStates).length;
    const activeNodes = Object.values(currentState.nodeStates).filter(
      state => state.lastProcessedTime && state.lastProcessedTime > currentState.currentTime - 10
    ).length;

    // Count tokens across all nodes
    let totalTokens = 0;
    Object.values(currentState.nodeStates).forEach(nodeState => {
      if ('inputBuffer' in nodeState && Array.isArray(nodeState.inputBuffer)) {
        totalTokens += nodeState.inputBuffer.length;
      }
      if ('outputBuffer' in nodeState && Array.isArray(nodeState.outputBuffer)) {
        totalTokens += nodeState.outputBuffer.length;
      }
      if ('inputBuffers' in nodeState && nodeState.inputBuffers) {
        Object.values(nodeState.inputBuffers).forEach(buffer => {
          if (Array.isArray(buffer)) {
            totalTokens += buffer.length;
          }
        });
      }
    });

    // Get recent activity
    const recentActivity = await this.executionRepo.getActivity(id, 50);

    // Extract FSM states
    const fsmStates: Record<string, any> = {};
    Object.entries(currentState.nodeStates).forEach(([nodeId, nodeState]) => {
      if ('currentFSMState' in nodeState) {
        const fsmState = nodeState as FSMProcessNodeState;
        fsmStates[nodeId] = {
          nodeId,
          currentState: fsmState.currentFSMState,
          variables: fsmState.fsmVariables,
          lastTransition: this.getLastFSMTransition(nodeId, recentActivity),
        };
      }
    });

    return {
      executionId: id,
      status: execution.status,
      currentTime: currentState.currentTime,
      globalState: {
        totalNodes,
        activeNodes,
        totalTokens,
        totalEvents: recentActivity.length,
      },
      nodeStates: currentState.nodeStates,
      recentActivity: recentActivity.slice(0, 10), // Last 10 entries
      fsmStates: Object.keys(fsmStates).length > 0 ? fsmStates : undefined,
    };
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  async processEvent(executionId: string, request: EventCreateRequest): Promise<EventProcessingResult> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Execution ${executionId} is not running (status: ${execution.status})`);
    }

    // Create event record
    const event: Event = {
      id: nanoid(),
      executionId,
      type: request.type,
      payload: request.payload,
      source: request.source,
      timestamp: request.timestamp || new Date().toISOString(),
      sequence: await this.getNextEventSequence(executionId),
    };

    // Save event
    const savedEvent = await this.executionRepo.addEvent(event);

    // Process through simulation engine
    const result = await this.simulationEngine.processEvent(savedEvent);

    // Update execution state
    const currentState = await this.simulationEngine.getCurrentState();
    await this.executionRepo.saveState(executionId, currentState.nodeStates, currentState.currentTime);

    // Update last activity time
    await this.executionRepo.update(executionId, {
      lastActivityAt: new Date().toISOString(),
    });

    return {
      ...result,
      eventId: savedEvent.id,
    };
  }

  async getEvents(executionId: string, afterSequence?: number): Promise<Event[]> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return this.executionRepo.getEvents(executionId, afterSequence);
  }

  async getEvent(eventId: string): Promise<Event | null> {
    return this.executionRepo.getEvent(eventId);
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  async getNodeState(executionId: string, nodeId: string): Promise<NodeStateResponse> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const nodeState = await this.simulationEngine.getNodeState(nodeId);
    if (!nodeState) {
      throw new Error(`Node ${nodeId} not found in execution ${executionId}`);
    }

    // Get scenario to find node configuration
    const scenario = await this.scenarioRepo.findById(execution.scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${execution.scenarioId} not found`);
    }

    const nodeConfig = scenario.scenario.nodes.find(n => n.nodeId === nodeId);
    if (!nodeConfig) {
      throw new Error(`Node ${nodeId} configuration not found`);
    }

    return {
      nodeId,
      nodeType: nodeConfig.type,
      state: nodeState,
      details: {
        displayName: nodeConfig.displayName,
        position: nodeConfig.position,
        isActive: nodeState.lastProcessedTime ? Date.now() - nodeState.lastProcessedTime < 5000 : false,
        lastProcessedTime: nodeState.lastProcessedTime,
      },
      // TODO: Add input/output status
    };
  }

  async injectToken(executionId: string, nodeId: string, request: TokenInjectionRequest): Promise<void> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Execution ${executionId} is not running`);
    }

    const token: Token = {
      id: nanoid(),
      value: request.value,
      createdAt: Date.now(),
      originNodeId: nodeId,
      history: [{
        timestamp: Date.now(),
        epochTimestamp: Date.now(),
        sequence: 0,
        nodeId,
        action: 'token_injected',
        value: request.value,
        details: `Manual injection: ${request.source || 'API'}`,
        state: 'injected',
        bufferSize: 0,
        outputBufferSize: 0,
        eventType: 'external_event',
      }],
    };

    await this.simulationEngine.injectToken(nodeId, token);

    // Update execution state
    const currentState = await this.simulationEngine.getCurrentState();
    await this.executionRepo.saveState(executionId, currentState.nodeStates, currentState.currentTime);
  }

  // ===========================================================================
  // FSM Operations
  // ===========================================================================

  async getFSMState(executionId: string, nodeId: string): Promise<FSMStateResponse> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const fsmState = await this.simulationEngine.getFSMState(nodeId);
    if (!fsmState) {
      throw new Error(`FSM node ${nodeId} not found or not an FSM node`);
    }

    // Get scenario to find FSM definition
    const scenario = await this.scenarioRepo.findById(execution.scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${execution.scenarioId} not found`);
    }

    const nodeConfig = scenario.scenario.nodes.find(n => n.nodeId === nodeId);
    if (!nodeConfig || nodeConfig.type !== 'FSMProcessNode') {
      throw new Error(`Node ${nodeId} is not an FSM process node`);
    }

    const fsmNode = nodeConfig as any; // FSMProcessNode type
    const fsmDefinition = fsmNode.fsm;

    // Get transition history from recent activity
    const recentActivity = await this.executionRepo.getActivity(executionId, 100);
    const transitionHistory = recentActivity
      .filter(entry => entry.nodeId === nodeId && entry.action.includes('transition'))
      .slice(0, 20)
      .map(entry => ({
        id: nanoid(),
        from: entry.details?.from || 'unknown',
        to: entry.details?.to || entry.state,
        trigger: entry.details?.trigger || entry.action,
        timestamp: new Date(entry.epochTimestamp).toISOString(),
        messageId: entry.details?.messageId,
        variables: entry.details?.variables,
        duration: entry.details?.duration,
      }));

    // Calculate available transitions
    const availableTransitions = fsmDefinition.transitions
      ?.filter((t: any) => t.from === fsmState.currentFSMState)
      .map((t: any) => ({
        trigger: t.trigger,
        targetState: t.to,
        condition: t.condition,
        conditionMet: t.condition ? this.evaluateCondition(t.condition, fsmState.fsmVariables) : true,
      })) || [];

    return {
      nodeId,
      fsmDefinition,
      currentState: fsmState.currentFSMState,
      variables: fsmState.fsmVariables,
      inputBuffers: fsmState.inputBuffers,
      transitionHistory,
      availableTransitions,
      pendingActions: [], // TODO: Implement pending actions tracking
    };
  }

  async triggerFSMTransition(executionId: string, nodeId: string, request: FSMTransitionRequest): Promise<{ success: boolean; newState?: string; error?: string }> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Execution ${executionId} is not running`);
    }

    const result = await this.simulationEngine.triggerFSMTransition(nodeId, request);

    if (result.success) {
      // Update execution state
      const currentState = await this.simulationEngine.getCurrentState();
      await this.executionRepo.saveState(executionId, currentState.nodeStates, currentState.currentTime);

      // Log the manual transition
      const logEntry: HistoryEntry = {
        timestamp: Date.now(),
        epochTimestamp: Date.now(),
        sequence: await this.getNextHistorySequence(executionId),
        nodeId,
        action: 'manual_fsm_transition',
        value: result.newState,
        details: {
          reason: request.reason,
          bypassGuards: request.bypassGuards,
          previousState: undefined, // Will be filled by simulation engine
          newState: result.newState,
        },
        state: result.newState || 'unknown',
        bufferSize: 0,
        outputBufferSize: 0,
        eventType: 'execution_event',
      };

      await this.executionRepo.appendActivity(executionId, [logEntry]);
    }

    return result;
  }

  // ===========================================================================
  // Control Operations
  // ===========================================================================

  async playExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    await this.simulationEngine.play();
    await this.executionRepo.update(executionId, {
      status: 'running',
      lastActivityAt: new Date().toISOString(),
    });
  }

  async pauseExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    await this.simulationEngine.pause();
    await this.executionRepo.update(executionId, {
      status: 'paused',
      lastActivityAt: new Date().toISOString(),
    });
  }

  async stepExecution(executionId: string, steps = 1): Promise<void> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    await this.simulationEngine.step(steps);

    // Update execution state
    const currentState = await this.simulationEngine.getCurrentState();
    await this.executionRepo.saveState(executionId, currentState.nodeStates, currentState.currentTime);
    await this.executionRepo.update(executionId, {
      lastActivityAt: new Date().toISOString(),
    });
  }

  async resetExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    await this.simulationEngine.reset();

    // Reset execution state
    const currentState = await this.simulationEngine.getCurrentState();
    await this.executionRepo.saveState(executionId, currentState.nodeStates, currentState.currentTime);
    await this.executionRepo.update(executionId, {
      status: 'running',
      currentTime: 0,
      globalActivityLog: [],
      lastActivityAt: new Date().toISOString(),
    });
  }

  // ===========================================================================
  // Snapshots
  // ===========================================================================

  async createSnapshot(executionId: string, request: SnapshotCreateRequest, userId: string): Promise<ExecutionSnapshot> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const currentState = await this.simulationEngine.getCurrentState();
    const existingSnapshots = await this.executionRepo.getSnapshots(executionId);

    const snapshot = await this.executionRepo.createSnapshot({
      executionId,
      name: request.name || `Snapshot ${existingSnapshots.length + 1}`,
      description: request.description,
      nodeStates: currentState.nodeStates,
      currentTime: currentState.currentTime,
      globalActivityLog: execution.globalActivityLog,
      createdBy: userId,
      sequenceNumber: existingSnapshots.length + 1,
      totalEvents: execution.globalActivityLog.length,
    });

    return snapshot;
  }

  async getSnapshots(executionId: string): Promise<ExecutionSnapshot[]> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return this.executionRepo.getSnapshots(executionId);
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private async handleStatusTransition(execution: ExecutionDocument, newStatus: ExecutionStatus): Promise<void> {
    switch (newStatus) {
      case 'running':
        await this.simulationEngine.play();
        break;
      case 'paused':
        await this.simulationEngine.pause();
        break;
      case 'completed':
      case 'terminated':
        await this.simulationEngine.pause();
        break;
    }
  }

  private async getNextEventSequence(executionId: string): Promise<number> {
    const events = await this.executionRepo.getEvents(executionId);
    return events.length + 1;
  }

  private async getNextHistorySequence(executionId: string): Promise<number> {
    const activity = await this.executionRepo.getActivity(executionId);
    return activity.length + 1;
  }

  private getLastFSMTransition(nodeId: string, activity: HistoryEntry[]) {
    const transition = activity
      .filter(entry => entry.nodeId === nodeId && entry.action.includes('transition'))
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!transition) return undefined;

    return {
      from: transition.details?.from || 'unknown',
      to: transition.details?.to || transition.state,
      trigger: transition.details?.trigger || transition.action,
      timestamp: transition.epochTimestamp,
    };
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // TODO: Implement proper condition evaluation
    // For now, return true for simplicity
    return true;
  }
}