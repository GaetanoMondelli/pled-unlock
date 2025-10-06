/**
 * PLED Firebase Storage Service
 *
 * This service manages PLED (Procedural Legal Entity Documents) templates
 * using Firebase Storage with a proper folder structure inside the "pled/" folder.
 * Templates are stored as JSON files in the storage bucket.
 */

import { bucket } from "@/app/lib/firebase";
import { nanoid } from "@/lib/nanoid";

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

export interface PledManifest {
  version: string;
  lastUpdated: number;
  templates: Array<{
    id: string;
    name: string;
    description?: string;
    version: string;
    isDefault?: boolean;
    createdAt: number;
    updatedAt: number;
    filePath: string;
  }>;
  executions: Array<{
    id: string;
    templateId: string;
    name: string;
    status: string;
    startedAt: number;
    filePath: string;
  }>;
}

export class PledStorageService {
  private readonly PLED_FOLDER = 'pled';
  private readonly TEMPLATES_FOLDER = 'pled/templates';
  private readonly EXECUTIONS_FOLDER = 'pled/executions';
  private readonly MANIFEST_FILE = 'pled/manifest.json';

  constructor() {
    console.log('PledStorageService initialized - using Firebase Storage');
  }

  // ============================================================================
  // Manifest Management
  // ============================================================================

  private async getManifest(): Promise<PledManifest> {
    try {
      const file = bucket.file(this.MANIFEST_FILE);
      const [exists] = await file.exists();

      if (!exists) {
        // Create default manifest
        const defaultManifest: PledManifest = {
          version: '1.0',
          lastUpdated: Date.now(),
          templates: [],
          executions: []
        };
        await this.saveManifest(defaultManifest);
        return defaultManifest;
      }

      const [contents] = await file.download();
      return JSON.parse(contents.toString('utf8'));
    } catch (error) {
      console.error('Error getting PLED manifest:', error);
      throw new Error(`Failed to get manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveManifest(manifest: PledManifest): Promise<void> {
    try {
      const file = bucket.file(this.MANIFEST_FILE);
      await file.save(JSON.stringify(manifest, null, 2), {
        contentType: 'application/json',
        metadata: {
          updated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error saving PLED manifest:', error);
      throw new Error(`Failed to save manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

      // Save template file
      const templatePath = `${this.TEMPLATES_FOLDER}/${id}.json`;
      const templateFile = bucket.file(templatePath);
      await templateFile.save(JSON.stringify(template, null, 2), {
        contentType: 'application/json',
        metadata: {
          templateId: id,
          templateName: template.name,
          created: new Date(now).toISOString()
        }
      });

      // Update manifest
      const manifest = await this.getManifest();
      manifest.templates.push({
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        filePath: templatePath
      });
      manifest.lastUpdated = now;
      await this.saveManifest(manifest);

      console.log(`PLED template created in storage: ${id} at ${templatePath}`);
      return id;
    } catch (error) {
      console.error('Error creating PLED template:', error);
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTemplate(templateId: string): Promise<PledTemplate | null> {
    try {
      const templatePath = `${this.TEMPLATES_FOLDER}/${templateId}.json`;
      const templateFile = bucket.file(templatePath);

      const [exists] = await templateFile.exists();
      if (!exists) {
        return null;
      }

      const [contents] = await templateFile.download();
      return JSON.parse(contents.toString('utf8'));
    } catch (error) {
      console.error('Error getting PLED template:', error);
      throw new Error(`Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listTemplates(): Promise<PledTemplate[]> {
    try {
      const manifest = await this.getManifest();
      const templates: PledTemplate[] = [];

      // Load each template from storage
      for (const templateInfo of manifest.templates) {
        try {
          const template = await this.getTemplate(templateInfo.id);
          if (template) {
            templates.push(template);
          }
        } catch (error) {
          console.warn(`Failed to load template ${templateInfo.id}:`, error);
          // Continue with other templates
        }
      }

      // Sort by creation date (newest first)
      return templates.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error listing PLED templates:', error);
      throw new Error(`Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTemplate(templateId: string, updates: Partial<PledTemplate>): Promise<void> {
    try {
      const existingTemplate = await this.getTemplate(templateId);
      if (!existingTemplate) {
        throw new Error(`Template ${templateId} not found`);
      }

      const updatedTemplate: PledTemplate = {
        ...existingTemplate,
        ...updates,
        id: templateId, // Ensure ID doesn't change
        updatedAt: Date.now(),
      };

      // Save updated template
      const templatePath = `${this.TEMPLATES_FOLDER}/${templateId}.json`;
      const templateFile = bucket.file(templatePath);
      await templateFile.save(JSON.stringify(updatedTemplate, null, 2), {
        contentType: 'application/json',
        metadata: {
          templateId,
          templateName: updatedTemplate.name,
          updated: new Date(updatedTemplate.updatedAt).toISOString()
        }
      });

      // Update manifest
      const manifest = await this.getManifest();
      const templateIndex = manifest.templates.findIndex(t => t.id === templateId);
      if (templateIndex >= 0) {
        manifest.templates[templateIndex] = {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          description: updatedTemplate.description,
          version: updatedTemplate.version,
          isDefault: updatedTemplate.isDefault,
          createdAt: updatedTemplate.createdAt,
          updatedAt: updatedTemplate.updatedAt,
          filePath: templatePath
        };
        manifest.lastUpdated = Date.now();
        await this.saveManifest(manifest);
      }

      console.log(`PLED template updated in storage: ${templateId}`);
    } catch (error) {
      console.error('Error updating PLED template:', error);
      throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      // Delete template file
      const templatePath = `${this.TEMPLATES_FOLDER}/${templateId}.json`;
      const templateFile = bucket.file(templatePath);

      const [exists] = await templateFile.exists();
      if (exists) {
        await templateFile.delete();
      }

      // Update manifest
      const manifest = await this.getManifest();
      manifest.templates = manifest.templates.filter(t => t.id !== templateId);
      manifest.lastUpdated = Date.now();
      await this.saveManifest(manifest);

      console.log(`PLED template deleted from storage: ${templateId}`);
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

      // Save execution file
      const executionPath = `${this.EXECUTIONS_FOLDER}/${id}.json`;
      const executionFile = bucket.file(executionPath);
      await executionFile.save(JSON.stringify(execution, null, 2), {
        contentType: 'application/json',
        metadata: {
          executionId: id,
          templateId: execution.templateId,
          started: new Date(now).toISOString()
        }
      });

      // Update manifest
      const manifest = await this.getManifest();
      manifest.executions.push({
        id: execution.id,
        templateId: execution.templateId,
        name: execution.name,
        status: execution.status,
        startedAt: execution.startedAt,
        filePath: executionPath
      });
      manifest.lastUpdated = now;
      await this.saveManifest(manifest);

      console.log(`PLED execution created in storage: ${id} at ${executionPath}`);
      return id;
    } catch (error) {
      console.error('Error creating PLED execution:', error);
      throw new Error(`Failed to create execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExecution(executionId: string): Promise<PledExecution | null> {
    try {
      const executionPath = `${this.EXECUTIONS_FOLDER}/${executionId}.json`;
      const executionFile = bucket.file(executionPath);

      const [exists] = await executionFile.exists();
      if (!exists) {
        return null;
      }

      const [contents] = await executionFile.download();
      return JSON.parse(contents.toString('utf8'));
    } catch (error) {
      console.error('Error getting PLED execution:', error);
      throw new Error(`Failed to get execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listExecutions(): Promise<PledExecution[]> {
    try {
      const manifest = await this.getManifest();
      const executions: PledExecution[] = [];

      // Load each execution from storage
      for (const executionInfo of manifest.executions) {
        try {
          const execution = await this.getExecution(executionInfo.id);
          if (execution) {
            executions.push(execution);
          }
        } catch (error) {
          console.warn(`Failed to load execution ${executionInfo.id}:`, error);
          // Continue with other executions
        }
      }

      // Sort by start date (newest first)
      return executions.sort((a, b) => b.startedAt - a.startedAt);
    } catch (error) {
      console.error('Error listing PLED executions:', error);
      throw new Error(`Failed to list executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async initializePledStorage(): Promise<void> {
    try {
      console.log('Initializing PLED storage structure...');

      // Ensure manifest exists
      const manifest = await this.getManifest();

      // Create default template if none exists
      if (manifest.templates.length === 0) {
        await this.createDefaultTemplate();
      }

      console.log('PLED storage initialized successfully');
    } catch (error) {
      console.error('Error initializing PLED storage:', error);
      throw error;
    }
  }

  private async createDefaultTemplate(): Promise<void> {
    const defaultTemplate = {
      name: 'Default Procedure Template',
      description: 'A basic procedure template for getting started with PLED',
      scenario: {
        id: 'default-pled',
        name: 'Default PLED Procedure',
        description: 'Basic procedure with event source and sink for PLED system',
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
    console.log('Default PLED template created in storage');
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Try to access the storage bucket
      const [files] = await bucket.getFiles({
        prefix: this.PLED_FOLDER,
        maxResults: 1
      });
      return true;
    } catch (error) {
      console.error('PLED Storage connection check failed:', error);
      return false;
    }
  }

  async getStorageInfo(): Promise<any> {
    try {
      const manifest = await this.getManifest();
      const [files] = await bucket.getFiles({
        prefix: this.PLED_FOLDER
      });

      return {
        manifest,
        totalFiles: files.length,
        folders: {
          templates: this.TEMPLATES_FOLDER,
          executions: this.EXECUTIONS_FOLDER,
          manifest: this.MANIFEST_FILE
        },
        files: files.map(file => ({
          name: file.name,
          size: file.metadata.size,
          updated: file.metadata.updated
        }))
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pledStorageService = new PledStorageService();