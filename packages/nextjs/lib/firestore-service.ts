import { getFirestore } from '@/lib/firebase-simple';
import type { TemplateDocument, ExecutionDocument } from './firestore-types';

// Firestore schema design:
// /admin/templates/{templateId} - individual template documents
// /admin/executions/{executionId} - individual execution state documents

export class FirestoreService {
  private get db() {
    return getFirestore();
  }

  // Template operations
  async createTemplate(template: Omit<TemplateDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = this.db.collection('admin').doc('templates').collection('items').doc();
    const now = Date.now();

    const templateDoc: TemplateDocument = {
      ...template,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      version: template.scenario.version || '3.0',
    };

    await docRef.set(templateDoc);
    return docRef.id;
  }

  async getTemplate(templateId: string): Promise<TemplateDocument | null> {
    const docRef = this.db.collection('admin').doc('templates').collection('items').doc(templateId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as TemplateDocument;
  }

  async getTemplates(): Promise<TemplateDocument[]> {
    const snapshot = await this.db.collection('admin').doc('templates').collection('items').get();
    return snapshot.docs.map(doc => doc.data() as TemplateDocument);
  }

  async updateTemplate(templateId: string, updates: Partial<TemplateDocument>): Promise<void> {
    const docRef = this.db.collection('admin').doc('templates').collection('items').doc(templateId);
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const docRef = this.db.collection('admin').doc('templates').collection('items').doc(templateId);
    await docRef.delete();
  }

  async createTemplateFromDefault(name: string, description?: string): Promise<string> {
    // Get the default template
    const templates = await this.getTemplates();
    const defaultTemplate = templates.find(t => t.isDefault);

    if (!defaultTemplate) {
      throw new Error('No default template found');
    }

    // Create new template based on default
    return this.createTemplate({
      name,
      description,
      scenario: defaultTemplate.scenario,
      version: defaultTemplate.version,
    });
  }

  // Execution operations
  async saveExecution(execution: Omit<ExecutionDocument, 'id' | 'startedAt' | 'lastSavedAt'>): Promise<string> {
    const docRef = this.db.collection('admin').doc('executions').collection('items').doc();
    const now = Date.now();

    const executionDoc: ExecutionDocument = {
      ...execution,
      id: docRef.id,
      startedAt: execution.startedAt || now,
      lastSavedAt: now,
    };

    await docRef.set(executionDoc);
    return docRef.id;
  }

  async updateExecution(executionId: string, updates: Partial<ExecutionDocument>): Promise<void> {
    const docRef = this.db.collection('admin').doc('executions').collection('items').doc(executionId);
    await docRef.update({
      ...updates,
      lastSavedAt: Date.now(),
    });
  }

  async getExecution(executionId: string): Promise<ExecutionDocument | null> {
    const docRef = this.db.collection('admin').doc('executions').collection('items').doc(executionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as ExecutionDocument;
  }

  async getExecutions(templateId?: string): Promise<ExecutionDocument[]> {
    let query = this.db.collection('admin').doc('executions').collection('items');

    if (templateId) {
      query = query.where('templateId', '==', templateId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as ExecutionDocument);
  }

  async deleteExecution(executionId: string): Promise<void> {
    const docRef = this.db.collection('admin').doc('executions').collection('items').doc(executionId);
    await docRef.delete();
  }

  // Initialize default template
  async initializeDefaultTemplate(): Promise<void> {
    const templates = await this.getTemplates();
    const hasDefault = templates.some(t => t.isDefault);

    if (hasDefault) {
      return; // Default already exists
    }

    // Create a minimal default template since we don't need the complex pled.json conversion
    const minimalScenario: Scenario = {
      version: '3.0',
      nodes: [
        {
          nodeId: 'source1',
          type: 'DataSource',
          displayName: 'Token Source',
          position: { x: 100, y: 100 },
          interval: 5,
          generation: {
            type: 'random',
            valueMin: 1,
            valueMax: 10,
          },
          outputs: [{
            destinationNodeId: 'sink1',
          }],
        },
        {
          nodeId: 'sink1',
          type: 'Sink',
          displayName: 'Token Sink',
          position: { x: 400, y: 100 },
          inputs: [{
            nodeId: 'source1',
          }],
        },
      ],
    };

    await this.createTemplate({
      name: 'Default Template',
      description: 'Minimal default template with source and sink',
      scenario: minimalScenario,
      isDefault: true,
      version: '3.0',
    });
  }
}

export const firestoreService = new FirestoreService();