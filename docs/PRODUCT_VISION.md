# PLED Product Vision: Workflow FSM + Tokenization Protocol

## Summary
PLED turns real-world procedures into composable finite state machines (FSMs) backed by an append-only ledger. Today, the template editor simulates nodes, tokens, and an activity ledger fully in the browser. The product vision is to provide a full backend/API + SDK so users can: define templates, instantiate executions, ingest events, compute and replay state, execute actions, and optionally commit state/ledger proofs to blockchains — enabling compliant, auditable AI-driven workflows and value/token flows.

## Why now
- AI is great at extracting intent from messy inputs but needs guardrails. FSMs provide guardrails, auditability, and explainability.
- Enterprises need transparent, amendable workflow state backed by evidence, not just hard-coded automations.
- On-chain commitments and tokenization unlock verifiability, interoperability, and programmable value flows.

## Core concepts
- Events: Raw inputs (emails, API callbacks, files). Immutable; ordered per execution.
- Rules → Messages: Deterministic or AI-assisted rules transform events to messages.
- FSMs: Templates compiled from nodes; executions compute current state from messages and can fire actions.
- Actions: Produce side-effects (notifications, API calls, chain txs) and produce new events with embedded snapshot context.
- Ledger: Append-only activity log of state transitions, actions, and token movements.
- Tokens: Typed value units produced/consumed by nodes; can be bridged/minted on-chain.

## Product pillars
1) Modeling and design
- Visual template editor with reusable components and FSL view.
- Library and marketplace of components/templates.
- Versioning and model upgrades with deterministic replay/compare.

2) Execution and evidence
- Event ingestion API, storage, and message derivation.
- Deterministic replay with snapshots; time-travel and diff tools.
- Secure action execution with idempotency and audit trail.

3) Verifiability and value
- State/ledger commitments to L2 chains; optional public verifiability.
- Tokenization primitives (ERC-20/1155/Custom) for sinks and process outputs.
- Future: ZK attestations of FSM steps and state invariants.

## Initial audiences
- Builders of contract operations, policy compliance, carbon/IoT tokenization, fintech flows, and AI orchestration.
- Platform/infra teams who want a verifiable workflow backbone with strong provenance.

## North-star outcomes
- Trustable workflows: every state is attributable to evidence and rules.
- Governed AI: models assist but FSMs enforce safety/liveness and scope.
- Interoperable value: tokens and proofs travel across systems/chains.

## Scope by phases
- MVP: Hosted API for templates, executions, events, messages, snapshots, actions. TypeScript SDK. Firehose/websocket updates. Postgres primary; object storage for artifacts.
- Phase 2: On-chain commitments (Merkle roots of ledger/state). Minimal registry contract. Optional ERC token mint from sinks.
- Phase 3: ZK proofs of state transitions/invariants; verifiable off-chain computation; richer token economics.

## Success criteria
- 95%+ deterministic replay match for executions after model or rule updates.
- p95 ingestion-to-state latency < 2s for typical org workloads.
- >10 published reusable templates/components with marketplace adoption.
- First on-chain commitment and token mint flows used in production.
