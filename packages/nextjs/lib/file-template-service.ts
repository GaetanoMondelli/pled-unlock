import fs from 'fs';
import path from 'path';
import type { TemplateDocument } from './firestore-types';
import type { Scenario } from '@/lib/simulation/types';

const TEMPLATES_DIR = path.join(process.cwd(), 'data/templates');
const EXECUTIONS_DIR = path.join(process.cwd(), 'data/executions');

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(path.dirname(TEMPLATES_DIR))) {
    fs.mkdirSync(path.dirname(TEMPLATES_DIR), { recursive: true });
  }
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
  if (!fs.existsSync(EXECUTIONS_DIR)) {
    fs.mkdirSync(EXECUTIONS_DIR, { recursive: true });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
    .trim();
}

export class FileTemplateService {
  constructor() {
    ensureDirectories();
    this.initializeDefaultTemplate();
  }

  private async initializeDefaultTemplate() {
    try {
      const templates = await this.getTemplates();
      if (templates.length === 0) {
        // Create default template from scenario.json
        const scenarioPath = path.join(process.cwd(), 'public/scenario.json');
        let defaultScenario: Scenario;

        try {
          const scenarioData = fs.readFileSync(scenarioPath, 'utf-8');
          defaultScenario = JSON.parse(scenarioData);
        } catch {
          // Fallback scenario if scenario.json doesn't exist
          defaultScenario = {
            version: '3.0',
            nodes: [
              {
                nodeId: 'source1',
                type: 'DataSource',
                displayName: 'Token Source',
                position: { x: 100, y: 100 },
                interval: 5,
                generation: { type: 'random', valueMin: 1, valueMax: 10 },
                outputs: [{ destinationNodeId: 'sink1' }],
              },
              {
                nodeId: 'sink1',
                type: 'Sink',
                displayName: 'Token Sink',
                position: { x: 400, y: 100 },
                inputs: [{ nodeId: 'source1' }],
              },
            ],
          };
        }

        await this.createTemplate({
          name: 'Default Template',
          description: 'Default simulation template',
          scenario: defaultScenario,
          isDefault: true,
          version: '3.0',
        });
      }
    } catch (error) {
      console.warn('Could not initialize default template:', error);
    }
  }

  async getTemplates(): Promise<TemplateDocument[]> {
    try {
      ensureDirectories();
      const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
      const templates: TemplateDocument[] = [];

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8');
          const template = JSON.parse(content);
          templates.push(template);
        } catch (error) {
          console.warn(`Could not read template file ${file}:`, error);
        }
      }

      // Sort by creation date, default first
      return templates.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return b.createdAt - a.createdAt;
      });
    } catch (error) {
      console.error('Error reading templates:', error);
      return [];
    }
  }

  async getTemplate(templateId: string): Promise<TemplateDocument | null> {
    try {
      const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
      if (!fs.existsSync(templatePath)) {
        return null;
      }
      const content = fs.readFileSync(templatePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading template:', error);
      return null;
    }
  }

  async getTemplateBySlug(slug: string): Promise<TemplateDocument | null> {
    try {
      const templates = await this.getTemplates();
      return templates.find(t => slugify(t.name) === slug) || null;
    } catch (error) {
      console.error('Error finding template by slug:', error);
      return null;
    }
  }

  async createTemplate(template: Omit<TemplateDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    const templateId = slugify(template.name);

    const templateDoc: TemplateDocument = {
      ...template,
      id: templateId,
      createdAt: now,
      updatedAt: now,
    };

    const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(templateDoc, null, 2));

    return templateId;
  }

  async updateTemplate(templateId: string, updates: Partial<TemplateDocument>): Promise<void> {
    const existing = await this.getTemplate(templateId);
    if (!existing) {
      throw new Error('Template not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(updated, null, 2));
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }
  }

  async createTemplateFromDefault(name: string, description?: string): Promise<string> {
    const templates = await this.getTemplates();
    const defaultTemplate = templates.find(t => t.isDefault);

    if (!defaultTemplate) {
      throw new Error('No default template found');
    }

    return this.createTemplate({
      name,
      description,
      scenario: defaultTemplate.scenario,
      version: defaultTemplate.version,
    });
  }

  getTemplateSlug(templateName: string): string {
    return slugify(templateName);
  }
}

export const fileTemplateService = new FileTemplateService();