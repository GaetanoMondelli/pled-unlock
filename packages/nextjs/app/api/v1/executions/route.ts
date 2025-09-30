/**
 * Vercel App Router API - Executions Endpoint
 *
 * Example implementation showing how to use the decoupled API architecture
 * with Vercel deployment. This follows the App Router pattern (app/api/v1/...).
 */

import { NextRequest } from 'next/server';
import { createAppRouterHandler } from '@/lib/api/adapters/vercel';
import { ExecutionsController } from '@/lib/api/controllers/executions';

// Mock implementations for demonstration
// In production, these would connect to real databases and services

// =============================================================================
// Mock Repository Implementations
// =============================================================================

class MockExecutionRepository {
  private executions = new Map();
  private events = new Map();
  private activities = new Map();
  private snapshots = new Map();

  async create(execution: any) {
    const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newExecution = {
      ...execution,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.executions.set(id, newExecution);
    return newExecution;
  }

  async findById(id: string) {
    return this.executions.get(id) || null;
  }

  async findByScenario(scenarioId: string) {
    return Array.from(this.executions.values()).filter(e => e.scenarioId === scenarioId);
  }

  async update(id: string, updates: any) {
    const existing = this.executions.get(id);
    if (!existing) throw new Error(`Execution ${id} not found`);

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.executions.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    this.executions.delete(id);
  }

  async saveState(id: string, nodeStates: any, currentTime: number) {
    const execution = this.executions.get(id);
    if (execution) {
      execution.nodeStates = nodeStates;
      execution.currentTime = currentTime;
      execution.updatedAt = new Date().toISOString();
    }
  }

  async loadState(id: string) {
    const execution = this.executions.get(id);
    return execution ? {
      nodeStates: execution.nodeStates || {},
      currentTime: execution.currentTime || 0
    } : null;
  }

  async addEvent(event: any) {
    this.events.set(event.id, event);
    return event;
  }

  async getEvents(executionId: string, afterSequence?: number) {
    return Array.from(this.events.values())
      .filter(e => e.executionId === executionId)
      .filter(e => !afterSequence || e.sequence > afterSequence)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getEvent(eventId: string) {
    return this.events.get(eventId) || null;
  }

  async appendActivity(executionId: string, entries: any[]) {
    if (!this.activities.has(executionId)) {
      this.activities.set(executionId, []);
    }
    this.activities.get(executionId).push(...entries);
  }

  async getActivity(executionId: string, limit?: number) {
    const activity = this.activities.get(executionId) || [];
    return limit ? activity.slice(-limit) : activity;
  }

  async createSnapshot(snapshot: any) {
    const id = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSnapshot = {
      ...snapshot,
      id,
      createdAt: new Date().toISOString(),
    };
    this.snapshots.set(id, newSnapshot);
    return newSnapshot;
  }

  async getSnapshots(executionId: string) {
    return Array.from(this.snapshots.values()).filter(s => s.executionId === executionId);
  }

  async getSnapshot(snapshotId: string) {
    return this.snapshots.get(snapshotId) || null;
  }
}

class MockScenarioRepository {
  private scenarios = new Map([
    ['scenario_1', {
      id: 'scenario_1',
      scenario: {
        version: '3.0',
        nodes: [
          {
            nodeId: 'source1',
            type: 'DataSource',
            displayName: 'Token Source',
            position: { x: 100, y: 100 },
            interval: 5,
            generation: { type: 'random', valueMin: 1, valueMax: 10 },
            outputs: [{ name: 'output', destinationNodeId: 'fsm1', destinationInputName: 'input' }],
          },
          {
            nodeId: 'fsm1',
            type: 'FSMProcessNode',
            displayName: 'Approval FSM',
            position: { x: 300, y: 100 },
            inputs: [{ name: 'input', nodeId: 'source1', interface: { type: 'any' }, required: true }],
            fsm: {
              states: ['idle', 'processing', 'approved', 'rejected'],
              initialState: 'idle',
              transitions: [
                { from: 'idle', to: 'processing', trigger: 'token_received' },
                { from: 'processing', to: 'approved', trigger: 'approve', condition: 'input.data.score >= 80' },
                { from: 'processing', to: 'rejected', trigger: 'approve', condition: 'input.data.score < 80' },
              ],
              stateActions: {
                approved: { onEntry: { 'approval_token': 'input.data' } },
                rejected: { onEntry: { 'rejection_token': 'input.data' } },
              },
            },
          },
          {
            nodeId: 'sink1',
            type: 'Sink',
            displayName: 'Result Sink',
            position: { x: 500, y: 100 },
            inputs: [{ name: 'input', nodeId: 'fsm1', interface: { type: 'any' }, required: true }],
          },
        ],
      },
    }],
  ]);

  async findById(id: string) {
    return this.scenarios.get(id) || null;
  }
}

class MockSimulationEngine {
  private currentNodeStates: any = {};
  private currentTime = 0;

  async loadScenario(scenario: any) {
    // Initialize node states based on scenario
    this.currentNodeStates = {};
    scenario.nodes.forEach((node: any) => {
      switch (node.type) {
        case 'DataSource':
          this.currentNodeStates[node.nodeId] = {
            lastEmissionTime: 0,
            stateMachine: { currentState: 'source_idle' },
          };
          break;
        case 'FSMProcessNode':
          this.currentNodeStates[node.nodeId] = {
            inputBuffers: { input: [] },
            fsmVariables: {},
            currentFSMState: node.fsm.initialState,
            lastTransitionTime: Date.now(),
            stateMachine: { currentState: 'process_idle' },
          };
          break;
        case 'Sink':
          this.currentNodeStates[node.nodeId] = {
            consumedTokenCount: 0,
            consumedTokens: [],
            stateMachine: { currentState: 'sink_idle' },
          };
          break;
      }
    });
    this.currentTime = 0;
  }

  async getCurrentState() {
    return {
      nodeStates: this.currentNodeStates,
      currentTime: this.currentTime,
    };
  }

  async processEvent(event: any) {
    // Mock event processing
    const messagesGenerated = [{
      id: `msg_${Date.now()}`,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
      derivedFromEventIds: [event.id],
    }];

    return {
      success: true,
      processingTime: 50,
      messagesGenerated,
      stateChanges: [],
      tokensCreated: [],
      actionsTriggered: [],
    };
  }

  async getNodeState(nodeId: string) {
    return this.currentNodeStates[nodeId] || null;
  }

  async injectToken(nodeId: string, token: any) {
    const nodeState = this.currentNodeStates[nodeId];
    if (nodeState && nodeState.inputBuffers) {
      nodeState.inputBuffers.input = nodeState.inputBuffers.input || [];
      nodeState.inputBuffers.input.push(token);
    }
  }

  async getFSMState(nodeId: string) {
    const nodeState = this.currentNodeStates[nodeId];
    if (nodeState && 'currentFSMState' in nodeState) {
      return nodeState;
    }
    return null;
  }

  async triggerFSMTransition(nodeId: string, request: any) {
    const nodeState = this.currentNodeStates[nodeId];
    if (nodeState && 'currentFSMState' in nodeState) {
      if (request.targetState) {
        nodeState.currentFSMState = request.targetState;
        return { success: true, newState: request.targetState };
      }
    }
    return { success: false, error: 'FSM node not found or invalid transition' };
  }

  async play() {
    // Mock play implementation
  }

  async pause() {
    // Mock pause implementation
  }

  async step(steps = 1) {
    this.currentTime += steps;
  }

  async reset() {
    this.currentTime = 0;
  }
}

// =============================================================================
// Service Initialization
// =============================================================================

import { ExecutionService } from '@/lib/api/services/execution';

// Create singleton instances (in production, use proper DI container)
const executionRepo = new MockExecutionRepository();
const scenarioRepo = new MockScenarioRepository();
const simulationEngine = new MockSimulationEngine();

const executionService = new ExecutionService(
  executionRepo as any,
  scenarioRepo as any,
  simulationEngine as any
);

// Create controller
const controller = new ExecutionsController(executionService);

// Create Vercel handler
const handler = createAppRouterHandler(controller);

// =============================================================================
// Export handlers for all HTTP methods
// =============================================================================

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;