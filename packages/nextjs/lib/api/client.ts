/**
 * API Client for PLED Execution Service
 *
 * Provides a clean interface for communicating with the PLED API,
 * respecting the API simulation toggle configuration.
 */

import { getAPIConfig, isAPISimulationEnabled, getAPIEndpoint } from '@/lib/config/api';
import type {
  ExecutionDocument,
  CreateExecutionRequest,
  UpdateExecutionRequest,
  ProcessEventRequest,
  InjectTokenRequest
} from '@/lib/api/types';

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class APIClient {
  private config = getAPIConfig();

  async createExecution(scenarioId: string, options?: { description?: string }): Promise<APIResponse<ExecutionDocument>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    const request: CreateExecutionRequest = {
      scenarioId,
      description: options?.description
    };

    return this.fetch('/executions', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async getExecution(executionId: string): Promise<APIResponse<ExecutionDocument>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}`);
  }

  async updateExecution(executionId: string, updates: UpdateExecutionRequest): Promise<APIResponse<ExecutionDocument>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async processEvent(executionId: string, event: ProcessEventRequest): Promise<APIResponse<ExecutionDocument>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}/events`, {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  async injectToken(executionId: string, injection: InjectTokenRequest): Promise<APIResponse<ExecutionDocument>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}/tokens`, {
      method: 'POST',
      body: JSON.stringify(injection)
    });
  }

  async getLedger(executionId: string): Promise<APIResponse<any[]>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}/ledger`);
  }

  async getFSMState(executionId: string, nodeId: string): Promise<APIResponse<any>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}/nodes/${nodeId}/fsm`);
  }

  async updateFSMState(executionId: string, nodeId: string, fsmState: any): Promise<APIResponse<any>> {
    if (!isAPISimulationEnabled()) {
      return {
        error: 'API simulation is disabled',
        status: 400
      };
    }

    return this.fetch(`/executions/${executionId}/nodes/${nodeId}/fsm`, {
      method: 'PATCH',
      body: JSON.stringify(fsmState)
    });
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<APIResponse> {
    const url = getAPIEndpoint(endpoint);

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}`,
          status: response.status
        };
      }

      return {
        data,
        status: response.status
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        error: errorMessage,
        status: 500
      };
    }
  }
}

export const apiClient = new APIClient();