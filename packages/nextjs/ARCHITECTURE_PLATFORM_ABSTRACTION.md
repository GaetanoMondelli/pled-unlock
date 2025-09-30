# Platform Abstraction: Auth + Storage (Provider-Agnostic)

This module introduces a clean set of "ports" (interfaces) for Auth and Storage and wires them to current providers (NextAuth for auth; Firebase Firestore for documents). The goal is to enable swapping providers (Postgres/Prisma, DynamoDB, Supabase, S3/MinIO, Cognito/Auth0) by implementing new adapters without changing product code.

## Files

- `lib/platform/ports.ts`
  - Contracts for `AuthProvider`, `DocumentStore`, optional `BlobStore`, and the `Platform` factory shape.
- `lib/platform/adapters/nextauth/authAdapter.ts`
  - Adapter implementing `AuthProvider` via NextAuth session.
- `lib/platform/adapters/firebase/firestoreAdapter.ts`
  - Adapter implementing `DocumentStore` with Firestore Admin.
- `lib/platform/repositories.ts`
  - Product-focused repositories (Templates, Executions), only depend on `DocumentStore`.
- `lib/platform/index.ts`
  - `getPlatform()` returns the concrete platform (today: NextAuth + Firestore). Future: choose based on env.
- `lib/platform/dataService.ts`
  - Simple facade aggregating repositories; safe entry for UI/API routes.

## Why this shape?

- Small surface area keeps adapters simple and portable.
- Repositories centralize collection paths and timestamp policies.
- All product code imports `dataService` (or specific repositories) and stays decoupled from Firebase.

## How to switch providers later

1. Implement a new `DocumentStore` (e.g., `PrismaDocumentStore`) and/or `AuthProvider`.
2. Update `getPlatform()` to pick adapters based on env vars (e.g., `DATA_BACKEND=postgres`).
3. No changes needed in components/pages that use `dataService` or repositories.

## Next steps (optional)

- Add a `BlobStore` adapter (S3/MinIO) for large artifacts (PDFs, exports) and keep Firestore for metadata.
- Add API routes that use `dataService` so the UI calls server endpoints instead of SDKs directly.
- Extend `ListQuery` as needed (pagination cursors, composite filters) and map in adapters.
