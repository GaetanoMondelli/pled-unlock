import { getFirestore } from '@/lib/firebase-simple';
import type { DocumentStore, ListQuery, WhereClause } from '@/lib/platform/ports';

function applyQuery(ref: FirebaseFirestore.Query, query?: ListQuery) {
  let q = ref;
  if (query?.where) {
    for (const w of query.where) {
      // Firestore supports specific ops; map directly where possible
      q = q.where(w.field, w.op as any, w.value);
    }
  }
  if (query?.orderBy) {
    q = q.orderBy(query.orderBy.field, query.orderBy.direction);
  }
  if (query?.limit) {
    q = q.limit(query.limit);
  }
  return q;
}

export class FirestoreDocumentStore implements DocumentStore {
  private db = getFirestore();

  async get<T>(collectionPath: string, id: string): Promise<T | null> {
    const docRef = this.db.collection(collectionPath).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return null;
    return snap.data() as T;
  }

  async list<T>(collectionPath: string, query?: ListQuery): Promise<T[]> {
    const ref = this.db.collection(collectionPath);
    const q = applyQuery(ref, query);
    const snap = await q.get();
    return snap.docs.map(d => d.data() as T);
  }

  async create<T extends { id?: string }>(collectionPath: string, data: T): Promise<string> {
    const docRef = this.db.collection(collectionPath).doc();
    const toWrite = { ...data, id: data.id ?? docRef.id } as any;
    await docRef.set(toWrite);
    return docRef.id;
  }

  async update<T>(collectionPath: string, id: string, updates: Partial<T>): Promise<void> {
    const docRef = this.db.collection(collectionPath).doc(id);
    await docRef.update(updates as any);
  }

  async delete(collectionPath: string, id: string): Promise<void> {
    const docRef = this.db.collection(collectionPath).doc(id);
    await docRef.delete();
  }
}
