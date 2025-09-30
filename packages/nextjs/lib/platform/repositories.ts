import type { DocumentStore } from '@/lib/platform/ports';
import type { TemplateDocument, ExecutionDocument } from '@/lib/firestore-types';

// Centralize collection paths so a future migration only changes them here
const COLLECTIONS = {
  templates: 'admin/templates/items',
  executions: 'admin/executions/items',
};

export class TemplatesRepository {
  constructor(private docs: DocumentStore) {}

  async create(data: Omit<TemplateDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    return this.docs.create<TemplateDocument>(COLLECTIONS.templates, {
      ...data,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  get(id: string) {
    return this.docs.get<TemplateDocument>(COLLECTIONS.templates, id);
  }

  list() {
    return this.docs.list<TemplateDocument>(COLLECTIONS.templates);
  }

  async update(id: string, updates: Partial<TemplateDocument>) {
    return this.docs.update<TemplateDocument>(COLLECTIONS.templates, id, {
      ...updates,
      updatedAt: Date.now(),
    });
  }

  delete(id: string) {
    return this.docs.delete(COLLECTIONS.templates, id);
  }
}

export class ExecutionsRepository {
  constructor(private docs: DocumentStore) {}

  async create(data: Omit<ExecutionDocument, 'id' | 'startedAt' | 'lastSavedAt'>): Promise<string> {
    const now = Date.now();
    return this.docs.create<ExecutionDocument>(COLLECTIONS.executions, {
      ...data,
      id: undefined,
      startedAt: (data as any).startedAt ?? now,
      lastSavedAt: now,
    } as any);
  }

  get(id: string) {
    return this.docs.get<ExecutionDocument>(COLLECTIONS.executions, id);
  }

  listByTemplate(templateId?: string) {
    if (!templateId) return this.docs.list<ExecutionDocument>(COLLECTIONS.executions);
    return this.docs.list<ExecutionDocument>(COLLECTIONS.executions, {
      where: [{ field: 'templateId', op: '==', value: templateId }],
    });
  }

  update(id: string, updates: Partial<ExecutionDocument>) {
    return this.docs.update<ExecutionDocument>(COLLECTIONS.executions, id, {
      ...updates,
      lastSavedAt: Date.now(),
    });
  }

  delete(id: string) {
    return this.docs.delete(COLLECTIONS.executions, id);
  }
}
