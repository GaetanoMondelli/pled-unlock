# Blockchain Roadmap (Commitments, Tokens, ZK)

## Phase 2: Commitments + Minimal Tokens

### Commitments
- Build Merkle tree over ledger entries [seq_start, seq_end].
- Publish merkleRoot to PLEDRegistry on L2 chain (Base/Arbitrum/OP preferred).
- Store txHash and range in commitments table.
- Verifier tool: fetch root from chain, recompute from exported ledger slice, verify equality.

### Contracts (solidity)
- PLEDRegistry: commitLedgerRoot(executionId, rangeStart, rangeEnd, merkleRoot)
- Optional: Access control via roles per org

### Tokenization
- Mint ERC-1155 for sink-produced token types (configurable metadata). Source of truth: verified sink ledger entries.
- Flow: UI/API requests mint → service computes amount, builds proof that entries are within committed range → submits mint tx referencing commitment range.

## Phase 3: ZK Attestations

### Targets
- Proof of valid FSM transition sequence for a range (no forbidden transitions, guards satisfied)
- Proofs of conservation/invariants (e.g., total emitted from node A equals consumed by B ± tolerance)
- Optional privacy: hide event payloads; reveal only commitments and selected public fields

### Architecture
- Prover service assembles witness from ledger slice and compiled FSM
- Circuits for: transition validity, token balance conservation, threshold conditions
- Publish proof hash on-chain; optionally verify on-chain for critical operations (mint)

## Chains & infra
- Start on Base (low fees, EVM compatible). Consider OP/Arbitrum. Enterprise chain optional.
- Use ethers.js + Hardhat (already present) with TypeChain.
- Manage keys with .env in dev; Vault/HSM in prod.

## Open items
- Economic model: fees for commitments and mints; potential protocol revenue share
- Off-chain data availability for proofs (IPFS/Arweave vs S3 with signed URLs)
- Per-template token economics (decimals, metadata, rate limits)
