import { getPlatform } from '@/lib/platform';
import { TemplatesRepository, ExecutionsRepository } from '@/lib/platform/repositories';
import type { TemplateDocument, ExecutionDocument } from '@/lib/firestore-types';

export class DataService {
  private templates: TemplatesRepository;
  private executions: ExecutionsRepository;

  constructor() {
    const { docs } = getPlatform();
    this.templates = new TemplatesRepository(docs);
    this.executions = new ExecutionsRepository(docs);
  }

  // Templates
  createTemplate(input: Omit<TemplateDocument, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.templates.create(input);
  }
  getTemplate(id: string) {
    return this.templates.get(id);
  }
  listTemplates() {
    return this.templates.list();
  }
  updateTemplate(id: string, updates: Partial<TemplateDocument>) {
    return this.templates.update(id, updates);
  }
  deleteTemplate(id: string) {
    return this.templates.delete(id);
  }

  // Executions
  createExecution(input: Omit<ExecutionDocument, 'id' | 'startedAt' | 'lastSavedAt'>) {
    return this.executions.create(input);
  }
  getExecution(id: string) {
    return this.executions.get(id);
  }
  listExecutions(templateId?: string) {
    return this.executions.listByTemplate(templateId);
  }
  updateExecution(id: string, updates: Partial<ExecutionDocument>) {
    return this.executions.update(id, updates);
  }
  deleteExecution(id: string) {
    return this.executions.delete(id);
  }
}

export const dataService = new DataService();
