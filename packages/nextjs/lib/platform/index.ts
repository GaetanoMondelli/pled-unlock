import type { Platform } from '@/lib/platform/ports';
import { FirestoreDocumentStore } from '@/lib/platform/adapters/firebase/firestoreAdapter';
import { FileDocumentStore } from '@/lib/platform/adapters/file/fileAdapter';
import { NextAuthProvider } from '@/lib/platform/adapters/nextauth/authAdapter';

// In the future we can switch based on env (e.g., DATA_BACKEND=postgres)
export function getPlatform(): Platform {
  const auth = new NextAuthProvider();
  const backend = (process.env.DATA_BACKEND ?? 'file').toLowerCase();

  if (backend === 'file') {
    const docs = new FileDocumentStore();
    return { auth, docs };
  }

  if (backend && backend !== 'firestore') {
    console.warn(`Unknown DATA_BACKEND "${backend}". Falling back to file adapter.`);
    const docs = new FileDocumentStore();
    return { auth, docs };
  }

  try {
    const docs = new FirestoreDocumentStore();
    return { auth, docs };
  } catch (e) {
    console.warn('Falling back to FileDocumentStore because Firestore init failed:', e);
    const docs = new FileDocumentStore();
    return { auth, docs };
  }
}
