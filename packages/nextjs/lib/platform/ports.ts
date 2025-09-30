// Generic, provider-agnostic interfaces (ports) for storage and auth
// Keep this file small and stable; adapters will implement these contracts.

export type ISODateString = string; // e.g., new Date().toISOString()

export interface UserIdentity {
  id: string;
  email?: string | null;
  name?: string | null;
  roles?: string[];
  orgId?: string;
}

// Minimal auth surface: can be implemented by NextAuth, Cognito, Auth0, etc.
export interface AuthProvider {
  // Server-side: return current user or null
  getCurrentUser(): Promise<UserIdentity | null>;
  // Throw if not authenticated; returns the user otherwise
  requireUser(): Promise<UserIdentity>;
}

// Simple query model: start with equality filters only to keep adapters portable
export type WhereOp = '==' | '!=' | 'in' | 'not-in' | 'array-contains';

export interface WhereClause {
  field: string;
  op: WhereOp;
  value: unknown;
}

export interface ListQuery {
  where?: WhereClause[];
  limit?: number;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
}

export interface DocumentStore {
  // collectionPath can be nested, e.g. 'admin/templates/items'
  get<T>(collectionPath: string, id: string): Promise<T | null>;
  list<T>(collectionPath: string, query?: ListQuery): Promise<T[]>;
  create<T extends { id?: string }>(collectionPath: string, data: T): Promise<string>;
  update<T>(collectionPath: string, id: string, updates: Partial<T>): Promise<void>;
  delete(collectionPath: string, id: string): Promise<void>;
}

// Optional: binary/blob storage for large artifacts (PDFs, images, exports)
export interface PutObjectOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface BlobStore {
  putObject(key: string, data: Buffer | ArrayBuffer | Uint8Array, opts?: PutObjectOptions): Promise<{ key: string; etag?: string }>;
  getObject(key: string): Promise<{ body: Buffer; contentType?: string; metadata?: Record<string, string> } | null>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl?(key: string, expiresInSeconds?: number): Promise<string>;
}

// Platform factory lets us swap providers via env/config
export interface Platform {
  auth: AuthProvider;
  docs: DocumentStore;
  blobs?: BlobStore;
}
