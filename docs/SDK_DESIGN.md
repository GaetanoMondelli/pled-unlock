# SDK Design (TypeScript, v0)

The SDK provides a typed, ergonomic client for PLED API plus a local simulation helper for testing.

## Packages
- @pled/sdk-core: HTTP client, auth, resource clients, streaming helpers
- @pled/sdk-sim: Local deterministic runner for unit tests and offline workflows

## Auth
- constructor accepts either OAuth access token provider or static PAT; supports org selection

```ts
type AuthOptions = {
  baseUrl: string;
  getAccessToken?: () => Promise<string>;
  apiKey?: string; // PAT
  organizationId?: string;
};

export class PledClient {
  constructor(opts: AuthOptions);
  templates: TemplatesClient;
  executions: ExecutionsClient;
  events: EventsClient;
  rules: RulesClient;
  actions: ActionsClient;
  tokens: TokensClient;
}
```

## Templates
```ts
class TemplatesClient {
  list(): Promise<Template[]>;
  create(input: { name: string; description?: string; model: TemplateModel }): Promise<Template>;
  get(id: string): Promise<Template>;
  update(id: string, patch: Partial<Template>): Promise<Template>;
  compile(id: string): Promise<CompiledModelReport>;
}
```

## Executions
```ts
class ExecutionsClient {
  create(input: { templateId: string; name: string; description?: string }): Promise<Execution>;
  get(id: string): Promise<Execution>;
  state(id: string): Promise<ExecutionState>;
  replay(id: string, opts?: { upToSeq?: number; fromSnapshotId?: string }): Promise<ReplayResult>;
  snapshot(id: string, description?: string): Promise<Snapshot>;
  ledger(id: string, opts?: { afterSeq?: number }): Promise<LedgerEntry[]>;
  stream(id: string): AsyncIterable<LedgerDelta | StateDelta>; // SSE/WebSocket abstraction
}
```

## Events & Rules
```ts
class EventsClient {
  append(executionId: string, evt: { type: string; payload: unknown; source?: string; occurredAt?: string }, opts?: { idempotencyKey?: string }): Promise<LedgerAppendResult>;
  list(executionId: string, opts?: { afterSeq?: number }): Promise<Event[]>;
}

class RulesClient {
  create(templateId: string, rule: RuleDefinition): Promise<Rule>;
  test(ruleId: string, evt: Event): Promise<TestResult>;
}
```

## Actions & Tokens
```ts
class ActionsClient {
  enqueue(executionId: string, action: { type: string; input: any; dedupeKey?: string }): Promise<Action>;
  get(id: string): Promise<Action>;
}

class TokensClient {
  list(executionId: string): Promise<Token[]>;
  mint(executionId: string, input: { type: string; quantity: string; sinkNodeId: string }): Promise<MintResult>; // phase 2
}
```

## Local simulation (sdk-sim)
```ts
import { SimRunner } from '@pled/sdk-sim';

const runner = new SimRunner(compiledModel);
await runner.appendEvent(evt);
const { state, ledger } = runner.getSnapshot();
```

## DX niceties
- awaitState(executionId, predicate, timeout)
- withIdempotency(key) wrappers
- generator-based ledger stream consumption with backpressure
- Zod schemas for all models; strict mode
