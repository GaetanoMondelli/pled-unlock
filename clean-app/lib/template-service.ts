import type { TemplateDocument, ExecutionDocument } from './firestore-types';
import type { Scenario } from '@/lib/simulation/types';

class TemplateService {
  private baseUrl = '/api/admin';

  // Template operations
  async getTemplates(): Promise<TemplateDocument[]> {
    const response = await fetch(`${this.baseUrl}/templates`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || 'Failed to fetch templates');
    }
    const data = await response.json();

    // Handle warning case (Firebase not configured)
    if (data.warning) {
      console.warn(data.warning);
    }

    return data.templates || [];
  }

  async getTemplate(templateId: string): Promise<TemplateDocument> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    const data = await response.json();
    return data.template;
  }

  async createTemplate(params: {
    name: string;
    description?: string;
    scenario?: Scenario;
    fromDefault?: boolean;
  }): Promise<TemplateDocument> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to create template');
    }

    const data = await response.json();
    return data.template;
  }

  async updateTemplate(templateId: string, updates: {
    name?: string;
    description?: string;
    scenario?: Scenario;
  }): Promise<TemplateDocument> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to update template');
    }

    const data = await response.json();
    return data.template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to delete template');
    }
  }

  // Execution operations
  async getExecutions(templateId?: string): Promise<ExecutionDocument[]> {
    const url = templateId
      ? `${this.baseUrl}/executions?templateId=${templateId}`
      : `${this.baseUrl}/executions`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch executions');
    }
    const data = await response.json();
    return data.executions;
  }

  async getExecution(executionId: string): Promise<ExecutionDocument> {
    const response = await fetch(`${this.baseUrl}/executions/${executionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution');
    }
    const data = await response.json();
    return data.execution;
  }

  async saveExecution(params: {
    templateId: string;
    name: string;
    description?: string;
    scenario: Scenario;
    nodeStates: Record<string, any>;
    currentTime: number;
    eventCounter: number;
    globalActivityLog: any[];
    nodeActivityLogs: Record<string, any[]>;
    isCompleted?: boolean;
  }): Promise<ExecutionDocument> {
    const response = await fetch(`${this.baseUrl}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to save execution');
    }

    const data = await response.json();
    return data.execution;
  }

  async updateExecution(executionId: string, updates: {
    name?: string;
    description?: string;
    nodeStates?: Record<string, any>;
    currentTime?: number;
    eventCounter?: number;
    globalActivityLog?: any[];
    nodeActivityLogs?: Record<string, any[]>;
    isCompleted?: boolean;
  }): Promise<ExecutionDocument> {
    const response = await fetch(`${this.baseUrl}/executions/${executionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to update execution');
    }

    const data = await response.json();
    return data.execution;
  }

  async deleteExecution(executionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/executions/${executionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to delete execution');
    }
  }

  async initializeAdminStructure(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/init`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to initialize admin structure');
    }
  }
}

export const templateService = new TemplateService();