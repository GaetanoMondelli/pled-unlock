import fs from 'fs';
import path from 'path';
import type { DocumentStore, ListQuery } from '@/lib/platform/ports';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function baseDir() {
  return path.join(process.cwd(), 'data');
}

function collectionDir(collectionPath: string) {
  const dir = path.join(baseDir(), collectionPath);
  ensureDir(dir);
  return dir;
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

export class FileDocumentStore implements DocumentStore {
  async get<T>(collectionPath: string, id: string): Promise<T | null> {
    const dir = collectionDir(collectionPath);
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content) as T;
  }

  async list<T>(collectionPath: string, query?: ListQuery): Promise<T[]> {
    const dir = collectionDir(collectionPath);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
    const items: T[] = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf-8');
        items.push(JSON.parse(content));
      } catch {
        // skip bad file
      }
    }
    return applyQuery(items as any[], query) as any[];
  }

  async create<T extends { id?: string }>(collectionPath: string, data: T): Promise<string> {
    const dir = collectionDir(collectionPath);
    const id = data.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const file = path.join(dir, `${id}.json`);
    const toWrite = { ...data, id } as any;
    fs.writeFileSync(file, JSON.stringify(toWrite, null, 2));
    return id;
  }

  async update<T>(collectionPath: string, id: string, updates: Partial<T>): Promise<void> {
    const dir = collectionDir(collectionPath);
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) throw new Error('Document not found');
    const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const updated = { ...existing, ...updates };
    fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  }

  async delete(collectionPath: string, id: string): Promise<void> {
    const dir = collectionDir(collectionPath);
    const file = path.join(dir, `${id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}
