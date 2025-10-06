/**
 * PLED Firebase Service
 *
 * This service manages the PLED (Procedural Legal Entity Documents) collection
 * in Firestore, providing proper document management within the "pled" folder structure.
 */

import { getFirestore } from '@/lib/firebase-simple';
import { nanoid } from '@/lib/nanoid';

export interface PledTemplate {
  id: string;
  name: string;
  description?: string;
  scenario: any;
  version: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PledExecution {
  id: string;
  templateId: string;
  name: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  currentState: any;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  events: any[];
  messages: any[];
  metadata?: Record<string, any>;
}

export class PledFirebaseService {
  private db = getFirestore();
  private readonly PLED_COLLECTION = 'pled';
  private readonly TEMPLATES_SUBCOLLECTION = 'templates';
  private readonly EXECUTIONS_SUBCOLLECTION = 'executions';

  constructor() {
    console.log('PledFirebaseService initialized');
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  async createTemplate(templateData: Omit<PledTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = nanoid();
      const now = Date.now();

      const template: PledTemplate = {
        ...templateData,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const templateRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.TEMPLATES_SUBCOLLECTION)
        .doc(id);

      await templateRef.set(template);

      console.log(`PLED template created: ${id}`);
      return id;
    } catch (error) {
      console.error('Error creating PLED template:', error);
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTemplate(templateId: string): Promise<PledTemplate | null> {
    try {
      const templateRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.TEMPLATES_SUBCOLLECTION)
        .doc(templateId);

      const doc = await templateRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as PledTemplate;
    } catch (error) {
      console.error('Error getting PLED template:', error);
      throw new Error(`Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listTemplates(): Promise<PledTemplate[]> {
    try {
      const templatesRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.TEMPLATES_SUBCOLLECTION)
        .orderBy('createdAt', 'desc');

      const snapshot = await templatesRef.get();

      return snapshot.docs.map(doc => doc.data() as PledTemplate);
    } catch (error) {
      console.error('Error listing PLED templates:', error);
      throw new Error(`Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTemplate(templateId: string, updates: Partial<PledTemplate>): Promise<void> {
    try {
      const templateRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.TEMPLATES_SUBCOLLECTION)
        .doc(templateId);

      const updateData = {
        ...updates,
        updatedAt: Date.now(),
      };

      await templateRef.update(updateData);

      console.log(`PLED template updated: ${templateId}`);
    } catch (error) {
      console.error('Error updating PLED template:', error);
      throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.TEMPLATES_SUBCOLLECTION)
        .doc(templateId);

      await templateRef.delete();

      console.log(`PLED template deleted: ${templateId}`);
    } catch (error) {
      console.error('Error deleting PLED template:', error);
      throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Execution Management
  // ============================================================================

  async createExecution(executionData: Omit<PledExecution, 'id' | 'startedAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = nanoid();
      const now = Date.now();

      const execution: PledExecution = {
        ...executionData,
        id,
        startedAt: now,
        updatedAt: now,
      };

      const executionRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.EXECUTIONS_SUBCOLLECTION)
        .doc(id);

      await executionRef.set(execution);

      console.log(`PLED execution created: ${id}`);
      return id;
    } catch (error) {
      console.error('Error creating PLED execution:', error);
      throw new Error(`Failed to create execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExecution(executionId: string): Promise<PledExecution | null> {
    try {
      const executionRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.EXECUTIONS_SUBCOLLECTION)
        .doc(executionId);

      const doc = await executionRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as PledExecution;
    } catch (error) {
      console.error('Error getting PLED execution:', error);
      throw new Error(`Failed to get execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listExecutions(): Promise<PledExecution[]> {
    try {
      const executionsRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.EXECUTIONS_SUBCOLLECTION)
        .orderBy('startedAt', 'desc');

      const snapshot = await executionsRef.get();

      return snapshot.docs.map(doc => doc.data() as PledExecution);
    } catch (error) {
      console.error('Error listing PLED executions:', error);
      throw new Error(`Failed to list executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateExecution(executionId: string, updates: Partial<PledExecution>): Promise<void> {
    try {
      const executionRef = this.db
        .collection(this.PLED_COLLECTION)
        .doc('documents')
        .collection(this.EXECUTIONS_SUBCOLLECTION)
        .doc(executionId);

      const updateData = {
        ...updates,
        updatedAt: Date.now(),
      };

      await executionRef.update(updateData);

      console.log(`PLED execution updated: ${executionId}`);
    } catch (error) {
      console.error('Error updating PLED execution:', error);
      throw new Error(`Failed to update execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async initializePledCollection(): Promise<void> {
    try {
      // Create the main PLED document if it doesn't exist
      const pledDocRef = this.db.collection(this.PLED_COLLECTION).doc('documents');

      const doc = await pledDocRef.get();
      if (!doc.exists) {
        await pledDocRef.set({
          initialized: true,
          createdAt: Date.now(),
          description: 'PLED (Procedural Legal Entity Documents) collection for managing procedures and templates',
        });

        console.log('PLED collection initialized');
      }

      // Create a default template if none exists
      const templates = await this.listTemplates();
      if (templates.length === 0) {
        await this.createDefaultTemplate();
      }
    } catch (error) {
      console.error('Error initializing PLED collection:', error);
      throw error;
    }
  }

  private async createDefaultTemplate(): Promise<void> {
    const defaultTemplate = {
      name: 'Default Procedure Template',
      description: 'A basic procedure template for getting started',
      scenario: {
        id: 'default',
        name: 'Default Procedure',
        description: 'Basic procedure with source and sink',
        nodes: [
          {
            nodeId: 'source1',
            type: 'DataSource',
            displayName: 'Event Source',
            x: 100,
            y: 100,
            emissionRate: 1,
            emissionValues: [1, 2, 3],
            outputs: [{ destinationNodeId: 'sink1' }]
          },
          {
            nodeId: 'sink1',
            type: 'Sink',
            displayName: 'Event Sink',
            x: 300,
            y: 100
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'source1',
            target: 'sink1'
          }
        ]
      },
      version: '1.0',
      isDefault: true,
    };

    await this.createTemplate(defaultTemplate);
    console.log('Default PLED template created');
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Try to read the PLED collection
      const pledDocRef = this.db.collection(this.PLED_COLLECTION).doc('documents');
      await pledDocRef.get();
      return true;
    } catch (error) {
      console.error('PLED Firebase connection check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pledService = new PledFirebaseService();