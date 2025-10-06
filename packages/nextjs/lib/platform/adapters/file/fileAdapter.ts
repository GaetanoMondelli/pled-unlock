import fs from 'fs';
import path from 'path';
import type { DocumentStore, ListQuery } from '@/lib/platform/ports';
import type { TemplateDocument, ExecutionDocument } from '@/lib/firestore-types';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const TEMPLATE_COLLECTION = 'admin/templates/items';
const EXECUTION_COLLECTION = 'admin/executions/items';

function pledBaseDir() {
  const user = process.env.PLED_STORAGE_USER || 'admin';
  const dir = path.join(process.cwd(), 'data', 'pled', user);
  ensureDir(dir);
  return dir;
}

function templateDirPath(templateId: string) {
  return path.join(pledBaseDir(), templateId);
}

function ensureTemplateDir(templateId: string) {
  const dir = templateDirPath(templateId);
  ensureDir(dir);
  return dir;
}

function templateFile(templateId: string) {
  return path.join(templateDirPath(templateId), 'template.json');
}

function executionsDir(templateId: string) {
  const dir = path.join(ensureTemplateDir(templateId), 'executions');
  ensureDir(dir);
  return dir;
}

function executionFile(templateId: string, executionId: string) {
  return path.join(executionsDir(templateId), `${executionId}.json`);
}

function listDirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

function readJSON<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch (err) {
    console.warn(`Failed to read JSON from ${file}:`, err);
    return null;
  }
}

function applyQuery<T extends Record<string, any>>(items: T[], query?: ListQuery): T[] {
  let res = items;
  if (query?.where) {
    for (const w of query.where) {
      res = res.filter((it) => {
        const v = it[w.field];
        switch (w.op) {
          case '==': return v === w.value;
          case '!=': return v !== w.value;
          case 'in': return Array.isArray(w.value) && w.value.includes(v);
          case 'not-in': return Array.isArray(w.value) && !w.value.includes(v);
          case 'array-contains': return Array.isArray(v) && v.includes(w.value);
          default: return true;
        }
      });
    }
  }
  if (query?.orderBy) {
    const { field, direction = 'asc' } = query.orderBy;
    res = res.slice().sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return direction === 'asc' ? cmp : -cmp;
    });
  }
  if (query?.limit) {
    res = res.slice(0, query.limit);
  }
  return res;
}

function findExecutionFile(executionId: string): { path: string; data: ExecutionDocument } | null {
  for (const templateId of listDirectories(pledBaseDir())) {
    const execDir = path.join(templateDirPath(templateId), 'executions');
    if (!fs.existsSync(execDir)) continue;
    const file = path.join(execDir, `${executionId}.json`);
    if (!fs.existsSync(file)) continue;
    const data = readJSON<ExecutionDocument>(file);
    if (data) return { path: file, data };
  }
  return null;
}

export class FileDocumentStore implements DocumentStore {
  async get<T>(collectionPath: string, id: string): Promise<T | null> {
    if (collectionPath === TEMPLATE_COLLECTION) {
      const file = templateFile(id);
      return readJSON<TemplateDocument>(file) as unknown as T;
    }

    if (collectionPath === EXECUTION_COLLECTION) {
      const match = findExecutionFile(id);
      return (match?.data ?? null) as unknown as T;
    }

    return null;
  }

  async list<T>(collectionPath: string, query?: ListQuery): Promise<T[]> {
    if (collectionPath === TEMPLATE_COLLECTION) {
      const templates: TemplateDocument[] = [];
      for (const folder of listDirectories(pledBaseDir())) {
        const file = templateFile(folder);
        const doc = readJSON<TemplateDocument>(file);
        if (doc) templates.push(doc);
      }
      return applyQuery(templates as any[], query) as any[];
    }

    if (collectionPath === EXECUTION_COLLECTION) {
      const executions: ExecutionDocument[] = [];
      for (const folder of listDirectories(pledBaseDir())) {
        const execDir = path.join(templateDirPath(folder), 'executions');
        if (!fs.existsSync(execDir)) continue;
        const files = fs.readdirSync(execDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const doc = readJSON<ExecutionDocument>(path.join(execDir, file));
          if (doc) executions.push(doc);
        }
      }
      return applyQuery(executions as any[], query) as any[];
    }

    return [];
  }

  async create<T extends { id?: string }>(collectionPath: string, data: T): Promise<string> {
    if (collectionPath === TEMPLATE_COLLECTION) {
      const now = Date.now();
      const id = (data as any).id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const doc: TemplateDocument = {
        ...(data as any),
        id,
        createdAt: (data as any).createdAt ?? now,
        updatedAt: now,
      };
      ensureTemplateDir(id);
      fs.writeFileSync(templateFile(id), JSON.stringify(doc, null, 2));
      return id;
    }

    if (collectionPath === EXECUTION_COLLECTION) {
      const input = data as unknown as ExecutionDocument;
      const templateId = input.templateId;
      if (!templateId) throw new Error('Execution requires templateId');
      const now = Date.now();
      const id = input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const doc: ExecutionDocument = {
        ...input,
        id,
        startedAt: input.startedAt ?? now,
        lastSavedAt: now,
      };
      fs.writeFileSync(executionFile(templateId, id), JSON.stringify(doc, null, 2));
      return id;
    }

    throw new Error(`Unsupported collection for file adapter: ${collectionPath}`);
  }

  async update<T>(collectionPath: string, id: string, updates: Partial<T>): Promise<void> {
    if (collectionPath === TEMPLATE_COLLECTION) {
      const existing = readJSON<TemplateDocument>(templateFile(id));
      if (!existing) throw new Error('Document not found');
      const updated: TemplateDocument = {
        ...existing,
        ...(updates as any),
        updatedAt: Date.now(),
      };
      ensureTemplateDir(id);
      fs.writeFileSync(templateFile(id), JSON.stringify(updated, null, 2));
      return;
    }

    if (collectionPath === EXECUTION_COLLECTION) {
      const match = findExecutionFile(id);
      if (!match) throw new Error('Document not found');
      const updated: ExecutionDocument = {
        ...match.data,
        ...(updates as any),
        lastSavedAt: Date.now(),
      };
      fs.writeFileSync(match.path, JSON.stringify(updated, null, 2));
      return;
    }

    throw new Error(`Unsupported collection for file adapter: ${collectionPath}`);
  }

  async delete(collectionPath: string, id: string): Promise<void> {
    if (collectionPath === TEMPLATE_COLLECTION) {
      const dir = path.join(pledBaseDir(), id);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return;
    }

    if (collectionPath === EXECUTION_COLLECTION) {
      const match = findExecutionFile(id);
      if (match && fs.existsSync(match.path)) {
        fs.unlinkSync(match.path);
      }
      return;
    }

    throw new Error(`Unsupported collection for file adapter: ${collectionPath}`);
  }
}
