# Open Questions and Alignment Checks

## Product scope
- Which initial verticals are priority? (contracts ops, carbon/IoT, HR, fintech, AI agents/DAO?)
- What value flows require on-chain tokens in MVP vs later? (ERC-20 vs ERC-1155?)
- Should templates/components be shareable across orgs (marketplace) in MVP?

## Modeling
- Canonical FSM format: continue FSL+jssm semantics or define internal JSON schema with compiler? Any constraints to guarantee determinism?
- How strict must we be about determinism when AI-derived messages are used? Plan: messages carry ai_metadata; replays use cached outputs; re-run flagged as non-deterministic.
- Do we support hierarchical FSMs/modules at runtime in MVP or compile-flatten only?

## Events & rules
- Event sources in MVP (DocuSign webhooks, email ingestion, manual, HTTP/webhooks)?
- Rule types in MVP (deterministic expressions, mapping, regex, basic DSL). AI rules behind a feature flag?
- Do we need a visual rule builder now or JSON-only with examples?

## Actions
- First-class actions for: send email, call webhook, create DocuSign envelope, write to chain, mint token. Which are MVP?
- Idempotency strategy per action type (e.g., dedupe keys, external idempotency keys)?

## Ledger & replay
- Snapshot frequency target (time-based vs event count). Default? 1k events or 60s?
- Maximum replay window and performance targets?
- Export formats required (JSONL, CSV, Parquet)?

## Blockchain
- Target chain(s) for commitments and token mint: Base/Arbitrum/OP/Polygon? Any enterprise chain?
- Commitment cadence and costs acceptable? Per 1k ledger entries or time-based?
- Token mint source of truth: sink ledger entries or a separate minting ledger?

## Security & tenancy
- Single-tenant vs multi-tenant from day 1? Org isolation strategy (schema-per-tenant vs row scoping)?
- Required compliance baselines (SOC2, GDPR, HIPAA?) that affect architecture?

## SDK & DX
- Primary SDK: TypeScript; do we need Python/Go soon?
- Offline-first needs? Simulate locally and reconcile with server later?
- Webhooks or server-sent events for real-time? Both?

## Roadmap & resourcing
- Target MVP date and constraints?
- Team split across API, editor integration, blockchain, zk research?

## Naming
- Are we keeping "PLED" or evolving to "PLED Protocol"? Token names/symbols reserved?
