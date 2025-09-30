# PRD: Backend + API for Template Editor and Executions

## Problem
Today, the template editor simulates FSMs, tokens, and the activity ledger entirely in the browser. We need a persistent, multi-tenant backend that can store templates, instantiate executions, ingest events, apply rules, compute state, execute actions, and provide auditability and replay. Later, we want blockchain commitments and tokenization.

## Goals
- Persist and version templates and components
- Create and manage executions from templates
- Ingest external/internal events and derive messages
- Compute FSM state and maintain an append-only ledger
- Support deterministic replay with snapshots
- Execute actions idempotently and log results
- Provide real-time streams and an SDK
- Enable future blockchain commitments and token minting

## Non-Goals (MVP)
- Full multi-chain tokenization; start with off-chain accounting
- ZK proofs; plan design but ship later
- Multi-region active-active; start single region with backups

## Users & Personas
- Template Designers: build reusable templates/components
- Operators: run executions, monitor state, remediate issues
- Integrators: send events, consume streams, build apps with SDK
- Compliance/Audit: review ledger, validate actions, export evidence

## User Stories
1) As a designer, I can save/version templates and validate them.
2) As an operator, I can create an execution from a template and see its live state.
3) As an integrator, I can POST events to an execution and see the ledger update.
4) As an operator, I can replay an execution to a past point with a snapshot baseline.
5) As an operator, I can force-execute a transition or action with an audit trail.
6) As a designer, I can compare model versions on the same event stream.
7) As a platform owner, I can stream state/ledger updates to UI and subscribers.

## Functional Requirements
- Template CRUD, validation, compilation to a canonical FSM
- Execution CRUD; status lifecycle (created, running, paused, completed)
- Event ingestion with idempotency and ordering; rule evaluation to messages
- FSM engine: transitions from messages/timers/conditions; variables; actions
- Action runner: idempotent side effects; retries; result events
- Ledger: append-only entries with sequence numbers and hashes
- Snapshots: periodic state capture; support fast replay
- Real-time: SSE/WebSocket streams per execution
- Auth: OIDC/OAuth, PATs, roles; org scoping

## Data Model
See API_ARCHITECTURE.md for ERD. Key entities: Template, Execution, Event, Message, Rule, Action, Token, Snapshot, LedgerEntry.

## API
See API_ARCHITECTURE.md for endpoints. All endpoints are versioned: /v1.

## UX Notes for Frontend Integration
- Replace local template store with API-backed template service
- Editor keeps local simulation for fast UX; "Save" persists compiled model
- Execution Manager uses API to start/load/resume executions
- Global Ledger modal consumes /stream for real-time entries

## Telemetry & Ops
- Structured logs with executionId/templateId correlation
- Metrics: ingest rate, rule latency, state compute time, action success rate
- Tracing across ingestion → rules → state → actions

## Risks
- Replay determinism when AI rules are used: require "AI-derived" messages carry model+prompt+inputs in metadata; only re-run deterministically when cached. Flag non-deterministic steps.
- Action side-effects during replay: never fire actions during replay unless explicitly enabled; use dry-run mode.
- Event ordering across sources: enforce per-execution sequencing; use receivedAt vs occurredAt fields.

## Milestones
- M1 (2-3 weeks): Service skeleton, Template/Execution CRUD, Event ingest, basic FSM engine, ledger append, snapshots, SSE stream
- M2 (2-3 weeks): Rules module, action runner, replay, SDK v0, editor wiring
- M3 (2 weeks): Hardhat contract + on-chain commitments, token mint flow (happy path)
- M4+: ZK design doc and initial circuits PoC

## Acceptance Criteria
- Create template → create execution → POST events → observe state and ledger in UI via stream
- Replay to snapshot+N events produces same final state (deterministic rules) and identical ledger hash chain
- Actions execute at-least-once but logged exactly-once; retries do not duplicate ledger entries
- Endpoints protected; per-org isolation validated with tests
