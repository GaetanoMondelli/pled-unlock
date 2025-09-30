/**
 * Executions Controller
 *
 * HTTP request handlers for execution management endpoints.
 * Handles the evolved node-based workflow architecture.
 */

import { BaseController, type ParsedRequest } from '../adapters/base';
import type { ExecutionService } from '../services/execution';
import type {
  APIResponse,
  ExecutionCreateRequest,
  ExecutionUpdateRequest,
  EventCreateRequest,
  TokenInjectionRequest,
  FSMTransitionRequest,
  SnapshotCreateRequest,
  ExecutionListQuery,
  EventListQuery,
  ErrorCodes,
} from '../types';

export class ExecutionsController extends BaseController {
  constructor(private executionService: ExecutionService) {
    super();
  }

  async handle(req: ParsedRequest): Promise<APIResponse> {
    const method = req.method;
    const path = req.path;

    // Route to appropriate handler based on path pattern
    if (path === '/api/v1/executions') {
      switch (method) {
        case 'GET':
          return this.listExecutions(req);
        case 'POST':
          return this.createExecution(req);
        default:
          return this.error('METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+$/)) {
      const executionId = req.params.executionId || this.extractIdFromPath(path);

      switch (method) {
        case 'GET':
          return this.getExecution(req, executionId);
        case 'PUT':
          return this.updateExecution(req, executionId);
        case 'DELETE':
          return this.deleteExecution(req, executionId);
        default:
          return this.error('METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/state$/)) {
      const executionId = req.params.executionId || this.extractIdFromPath(path, -1);

      if (method === 'GET') {
        return this.getExecutionState(req, executionId);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/events$/)) {
      const executionId = req.params.executionId || this.extractIdFromPath(path, -1);

      switch (method) {
        case 'GET':
          return this.getEvents(req, executionId);
        case 'POST':
          return this.processEvent(req, executionId);
        default:
          return this.error('METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/nodes\/[^\/]+\/state$/)) {
      const executionId = req.params.executionId || this.extractExecutionIdFromNodePath(path);
      const nodeId = req.params.nodeId || this.extractNodeIdFromPath(path);

      if (method === 'GET') {
        return this.getNodeState(req, executionId, nodeId);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/nodes\/[^\/]+\/inject-token$/)) {
      const executionId = req.params.executionId || this.extractExecutionIdFromNodePath(path);
      const nodeId = req.params.nodeId || this.extractNodeIdFromPath(path);

      if (method === 'POST') {
        return this.injectToken(req, executionId, nodeId);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/nodes\/[^\/]+\/fsm-state$/)) {
      const executionId = req.params.executionId || this.extractExecutionIdFromNodePath(path);
      const nodeId = req.params.nodeId || this.extractNodeIdFromPath(path);

      if (method === 'GET') {
        return this.getFSMState(req, executionId, nodeId);
      }
    }

    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/nodes\/[^\/]+\/fsm-transition$/)) {
      const executionId = req.params.executionId || this.extractExecutionIdFromNodePath(path);
      const nodeId = req.params.nodeId || this.extractNodeIdFromPath(path);

      if (method === 'POST') {
        return this.triggerFSMTransition(req, executionId, nodeId);
      }
    }

    // Control operations
    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/(play|pause|step|reset)$/)) {
      const executionId = req.params.executionId || this.extractIdFromPath(path, -1);
      const action = path.split('/').pop();

      if (method === 'POST') {
        return this.controlExecution(req, executionId, action!);
      }
    }

    // Snapshots
    if (path.match(/^\/api\/v1\/executions\/[^\/]+\/snapshots$/)) {
      const executionId = req.params.executionId || this.extractIdFromPath(path, -1);

      switch (method) {
        case 'GET':
          return this.getSnapshots(req, executionId);
        case 'POST':
          return this.createSnapshot(req, executionId);
        default:
          return this.error('METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
      }
    }

    return this.error('NOT_FOUND', 'Endpoint not found');
  }

  // ===========================================================================
  // Execution Management
  // ===========================================================================

  private async createExecution(req: ParsedRequest): Promise<APIResponse> {
    try {
      const missing = this.validateRequiredFields(req.body, ['scenarioId', 'name']);
      if (missing.length > 0) {
        return this.error('MISSING_REQUIRED_FIELD', `Missing required fields: ${missing.join(', ')}`);
      }

      const request: ExecutionCreateRequest = {
        scenarioId: req.body.scenarioId,
        name: req.body.name,
        description: req.body.description,
        initialVariables: req.body.initialVariables,
      };

      const organizationId = req.user?.organizationId || req.apiKey?.organizationId;
      if (!organizationId) {
        return this.error('UNAUTHORIZED', 'Organization context required');
      }

      const userId = req.user?.id || 'api_user';

      const execution = await this.executionService.createExecution(request, organizationId, userId);

      return this.success(execution, {
        message: 'Execution created successfully',
      });
    } catch (error) {
      console.error('Error creating execution:', error);
      return this.error('EXECUTION_CREATION_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async listExecutions(req: ParsedRequest): Promise<APIResponse> {
    try {
      // TODO: Implement actual listing with pagination
      // For now, return empty list
      return this.success([]);
    } catch (error) {
      console.error('Error listing executions:', error);
      return this.error('INTERNAL_SERVER_ERROR', 'Failed to list executions');
    }
  }

  private async getExecution(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const execution = await this.executionService.getExecution(executionId);

      if (!execution) {
        return this.error('RESOURCE_NOT_FOUND', `Execution ${executionId} not found`);
      }

      return this.success(execution);
    } catch (error) {
      console.error('Error getting execution:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async updateExecution(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const request: ExecutionUpdateRequest = req.body;
      const execution = await this.executionService.updateExecution(executionId, request);

      return this.success(execution, {
        message: 'Execution updated successfully',
      });
    } catch (error) {
      console.error('Error updating execution:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async deleteExecution(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      await this.executionService.deleteExecution(executionId);

      return this.success({ deleted: true }, {
        message: 'Execution deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting execution:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async getExecutionState(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const state = await this.executionService.getExecutionState(executionId);
      return this.success(state);
    } catch (error) {
      console.error('Error getting execution state:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  private async processEvent(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const missing = this.validateRequiredFields(req.body, ['type', 'payload']);
      if (missing.length > 0) {
        return this.error('MISSING_REQUIRED_FIELD', `Missing required fields: ${missing.join(', ')}`);
      }

      const request: EventCreateRequest = {
        type: req.body.type,
        payload: req.body.payload,
        source: req.body.source,
        timestamp: req.body.timestamp,
        targetNodeIds: req.body.targetNodeIds,
        idempotencyKey: req.body.idempotencyKey || req.headers['idempotency-key'],
      };

      const result = await this.executionService.processEvent(executionId, request);

      return this.success(result, {
        message: 'Event processed successfully',
      });
    } catch (error) {
      console.error('Error processing event:', error);
      return this.error('EVENT_PROCESSING_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async getEvents(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const afterSequence = this.parseIntParam(req.query.afterSequence as string);
      const events = await this.executionService.getEvents(executionId, afterSequence);

      return this.success(events);
    } catch (error) {
      console.error('Error getting events:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  private async getNodeState(req: ParsedRequest, executionId: string, nodeId: string): Promise<APIResponse> {
    try {
      const nodeState = await this.executionService.getNodeState(executionId, nodeId);
      return this.success(nodeState);
    } catch (error) {
      console.error('Error getting node state:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async injectToken(req: ParsedRequest, executionId: string, nodeId: string): Promise<APIResponse> {
    try {
      const missing = this.validateRequiredFields(req.body, ['value']);
      if (missing.length > 0) {
        return this.error('MISSING_REQUIRED_FIELD', `Missing required fields: ${missing.join(', ')}`);
      }

      const request: TokenInjectionRequest = {
        value: req.body.value,
        inputName: req.body.inputName,
        source: req.body.source || 'api',
        metadata: req.body.metadata,
      };

      await this.executionService.injectToken(executionId, nodeId, request);

      return this.success({ injected: true }, {
        message: 'Token injected successfully',
      });
    } catch (error) {
      console.error('Error injecting token:', error);
      return this.error('TOKEN_INJECTION_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // FSM Operations
  // ===========================================================================

  private async getFSMState(req: ParsedRequest, executionId: string, nodeId: string): Promise<APIResponse> {
    try {
      const fsmState = await this.executionService.getFSMState(executionId, nodeId);
      return this.success(fsmState);
    } catch (error) {
      console.error('Error getting FSM state:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async triggerFSMTransition(req: ParsedRequest, executionId: string, nodeId: string): Promise<APIResponse> {
    try {
      const request: FSMTransitionRequest = {
        targetState: req.body.targetState,
        message: req.body.message,
        reason: req.body.reason,
        bypassGuards: req.body.bypassGuards,
      };

      const result = await this.executionService.triggerFSMTransition(executionId, nodeId, request);

      if (result.success) {
        return this.success(result, {
          message: 'FSM transition triggered successfully',
        });
      } else {
        return this.error('FSM_TRANSITION_FAILED', result.error || 'FSM transition failed');
      }
    } catch (error) {
      console.error('Error triggering FSM transition:', error);
      return this.error('FSM_TRANSITION_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // Control Operations
  // ===========================================================================

  private async controlExecution(req: ParsedRequest, executionId: string, action: string): Promise<APIResponse> {
    try {
      switch (action) {
        case 'play':
          await this.executionService.playExecution(executionId);
          break;
        case 'pause':
          await this.executionService.pauseExecution(executionId);
          break;
        case 'step':
          const steps = this.parseIntParam(req.body?.steps, 1);
          await this.executionService.stepExecution(executionId, steps);
          break;
        case 'reset':
          await this.executionService.resetExecution(executionId);
          break;
        default:
          return this.error('INVALID_REQUEST', `Unknown action: ${action}`);
      }

      return this.success({ action, executed: true }, {
        message: `Execution ${action} completed successfully`,
      });
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      return this.error('EXECUTION_CONTROL_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // Snapshots
  // ===========================================================================

  private async createSnapshot(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const request: SnapshotCreateRequest = {
        name: req.body.name,
        description: req.body.description,
      };

      const userId = req.user?.id || 'api_user';
      const snapshot = await this.executionService.createSnapshot(executionId, request, userId);

      return this.success(snapshot, {
        message: 'Snapshot created successfully',
      });
    } catch (error) {
      console.error('Error creating snapshot:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async getSnapshots(req: ParsedRequest, executionId: string): Promise<APIResponse> {
    try {
      const snapshots = await this.executionService.getSnapshots(executionId);
      return this.success(snapshots);
    } catch (error) {
      console.error('Error getting snapshots:', error);
      return this.error('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private extractIdFromPath(path: string, offsetFromEnd = 0): string {
    const parts = path.split('/').filter(Boolean);
    const index = parts.length - 1 + offsetFromEnd;
    return parts[index] || '';
  }

  private extractExecutionIdFromNodePath(path: string): string {
    // Path format: /api/v1/executions/{executionId}/nodes/{nodeId}/...
    const parts = path.split('/');
    const executionIndex = parts.indexOf('executions') + 1;
    return parts[executionIndex] || '';
  }

  private extractNodeIdFromPath(path: string): string {
    // Path format: /api/v1/executions/{executionId}/nodes/{nodeId}/...
    const parts = path.split('/');
    const nodeIndex = parts.indexOf('nodes') + 1;
    return parts[nodeIndex] || '';
  }
}