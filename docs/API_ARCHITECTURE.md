# API Architecture (MVP → Future)

This document proposes the backend/API for PLED to complement the current frontend-only simulation.

## High-level design
- Service style: Modular monolith (Node.js/TypeScript) to start; internal modules for Templates, Executions, Events, Rules/Messages, Actions, Tokens, Snapshots.
- Data: PostgreSQL (primary), Redis (caching/queues), S3-compatible object storage (artifacts). Prisma ORM.
- Messaging: BullMQ/Redis for async action execution and rule pipelines.
- AuthN/Z: OAuth/OIDC + PATs. Org/user/role scopes. Row-level security patterns where needed.
- Real-time: WebSocket/SSE for execution updates and ledger streams.

## Data model (relational)
- organizations(id, name, ...)
- users(id, org_id, ...)
- templates(id, org_id, name, description, version, model_json, components_json, created_at, updated_at)
- executions(id, org_id, template_id, name, description, status, current_state, cursor, created_at, updated_at)
- events(id, org_id, execution_id, type, payload_json, source, timestamp, seq, hash)
- messages(id, org_id, execution_id, type, payload_json, derived_from_event_ids[], timestamp, rule_id)
- rules(id, org_id, template_id, type, definition_json, deterministic, ai_model, status)
- snapshots(id, org_id, execution_id, time, state_json, metadata_json)
- actions(id, org_id, execution_id, type, input_json, status, result_json, error_json, attempt, scheduled_for, created_at, updated_at)
- tokens(id, org_id, execution_id, type, quantity, unit, metadata_json, produced_by_node_id, consumed_by_node_id, created_at)
- ledgers(id, org_id, execution_id, sequence, entry_json, entry_hash, created_at)
- commitments(id, org_id, execution_id, block_chain, tx_hash, merkle_root, range_start_seq, range_end_seq, created_at)

Notes:
- messages are derived from events via rules; both are retained for replay.
- snapshots capture periodic state to avoid full replay.
- ledger is the canonical append-only activity feed (state transitions, actions, token movements).

## REST Endpoints (MVP)
- Templates
  - GET /v1/templates
  - POST /v1/templates
  - GET /v1/templates/:id
  - PUT /v1/templates/:id
  - POST /v1/templates/:id/versions
  - GET /v1/templates/:id/compile → returns compiled FSM + validation report

- Executions
  - POST /v1/executions { templateId, name }
  - GET /v1/executions/:id
  - GET /v1/executions/:id/state (current state, variables)
  - GET /v1/executions/:id/ledger?afterSeq=...
  - POST /v1/executions/:id/replay { upToSeq? , fromSnapshotId? }
  - POST /v1/executions/:id/snapshot { description? }
  - POST /v1/executions/:id/actions { type, input }

- Events & Rules
  - POST /v1/executions/:id/events { type, payload, source, timestamp? }
  - GET /v1/executions/:id/events?afterSeq=...
  - GET /v1/executions/:id/messages?afterSeq=...
  - POST /v1/templates/:id/rules { type, definition }
  - POST /v1/rules/:id/test { event }

- Tokenization (Phase 2 gated)
  - POST /v1/executions/:id/tokens/mint { type, quantity, sinkNodeId }
  - GET /v1/executions/:id/tokens

- Real-time
  - GET /v1/executions/:id/stream (SSE) ← ledger+state deltas

## Processing pipeline
1) Ingest event → persist to DB → enqueue rule derivation job.
2) Rule engine produces messages → enqueue state transition job.
3) FSM engine computes new state, fires actions → append ledger entries.
4) Action runner performs side-effects (idempotent), emits resulting events.
5) Periodic snapshots; maintain replay cursor; push deltas to clients.

## Idempotency and ordering
- Per-execution monotonic sequence numbers; submit with idempotency keys.
- Exactly-once append to ledger by guarded transaction; dedupe by idempotency key.

## Error handling
- Rule errors stored on message with error context; do not block pipeline.
- Action retries with backoff; poison queue parking; manual re-run support.

## Security model
- Org-scoped resources with RBAC: admin, editor, operator, viewer.
- Signed webhooks for inbound events.
- Audit trails for admin changes (template/rule edits, replay, force transitions).

## SDK (TypeScript, initial)
- Client for all endpoints with typed models.
- Helpers: submitEvent, awaitState(predicate), getLedgerStream, createExecution.
- Simulation mode: local deterministic runner for tests.

## Blockchain integration (Phase 2)
- Minimal PLEDRegistry contract per org:
  - commitLedgerRoot(executionId, rangeStart, rangeEnd, merkleRoot)
- Off-chain service builds Merkle tree of ledger entries; publishes root on interval.
- Optional: ERC20/1155 token minter; mints against verified sink ledger entries.

## ZK roadmap (Phase 3)
- Circuits for: valid transition under rules, token conservation, bounded invariants.
- Prover service generates proofs for selected checkpoints; publishes to chain.

## Non-functional targets
- p95 read < 200ms; p95 write < 300ms.
- Replay 100k events < 30s with snapshotting.
- Horizontally scalable action runners and rule workers.
