# API reference

`@vault-core/core` is the main library package. It exports all runtime components. Everything else (`@vault-core/cli`, `@vault-core/hook-*`) is a thin layer on top.

## Installation

vault-core is not published to npm. Install from source:

```bash
git clone https://github.com/pantheon-org/mneme.git
cd mneme/vault-core && bun install && bun run build
```

Then reference from a local package:

```json
{
  "dependencies": {
    "@vault-core/core": "workspace:*",
    "@vault-core/types": "workspace:*"
  }
}
```

## Config

### `loadConfig()`

Load config from `~/.vault-core/config.toml`. Creates the file with defaults if it does not exist.

```typescript
import { loadConfig } from "@vault-core/core";

const config = loadConfig();
// config.vaultPath, config.captureThreshold, etc.
```

**Returns**: `VaultCoreConfig`

---

## Storage

### `VaultWriter`

Atomic writes of `Memory` objects to Obsidian Markdown files.

```typescript
import { VaultWriter } from "@vault-core/core";

const writer = new VaultWriter(config);
await writer.write(memory);
```

**Constructor**: `new VaultWriter(config: VaultCoreConfig)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `write` | `(memory: Memory) => Promise<void>` | Atomically write a memory to the vault (`.tmp` → rename) |

---

### `VaultReader`

Read memories from Markdown files and detect human edits.

```typescript
import { VaultReader } from "@vault-core/core";

const reader = new VaultReader(config);
const memory = await reader.read(filePath);
// memory.humanEditedAt is set if external mtime change detected
```

**Constructor**: `new VaultReader(config: VaultCoreConfig)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `read` | `(filePath: string) => Promise<Memory \| null>` | Read and parse a `.md` file. Returns null if file not found. Sets `humanEditedAt` when external edit detected. |
| `readAll` | `(tier?: MemoryTier) => Promise<Memory[]>` | Read all memories from the vault, optionally filtered by tier |

---

### `IndexDB`

SQLite index with FTS5 (BM25) and optional vector (sqlite-vec) search.

```typescript
import { IndexDB } from "@vault-core/core";

const db = new IndexDB(config.indexPath);
await db.upsert(memory);
const results = await db.searchBM25({ query: "typescript", topK: 10 });
```

**Constructor**: `new IndexDB(indexPath: string)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `upsert` | `(memory: Memory) => Promise<void>` | Insert or update a memory record |
| `getById` | `(id: string) => Promise<Memory \| null>` | Retrieve a memory by ID |
| `getByTier` | `(tier: MemoryTier, limit?: number) => Promise<Memory[]>` | Get memories by tier, newest first |
| `searchBM25` | `(query: BM25Query) => Promise<BM25Result[]>` | Full-text BM25 search via FTS5 |
| `searchVec` | `(query: VecQuery) => Promise<VecResult[]>` | KNN vector search (returns [] if sqlite-vec unavailable) |
| `updateStatus` | `(id: string, status: MemoryStatus) => Promise<void>` | Update memory status (active/superseded/archived) |
| `close` | `() => void` | Close the database connection |

---

### `AuditLog`

Append-only JSONL audit log at `~/.vault-core/audit.jsonl`.

```typescript
import { AuditLog } from "@vault-core/core";

const log = new AuditLog(config);
log.append({ op: "capture", memoryId: "mem_abc", sessionId: "sess_xyz", harness: "opencode" });
```

**Constructor**: `new AuditLog(config: VaultCoreConfig)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `append` | `(entry: Omit<AuditEntry, "ts">) => void` | Append an entry to the audit log (synchronous) |

---

## Capture

### `CaptureQueue`

Async, batched capture queue with durability.

```typescript
import { CaptureQueue } from "@vault-core/core";

const queue = new CaptureQueue(config, writer, indexDb, scorer, embedder, auditLog);
await queue.init(); // replays pending.jsonl on startup

queue.capture({
  text: "Always prefer bun:sqlite over better-sqlite3",
  hints: { tier: "semantic", projectId: "my-project" },
  sessionId: "sess_abc",
  harness: "claude-code",
});
// returns immediately — processing is async
```

**Constructor**: `new CaptureQueue(config, writer, indexDb, scorer, embedder, auditLog)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `init` | `() => Promise<void>` | Load and replay `pending.jsonl`. Must be called once before `capture`. |
| `capture` | `(input: CaptureInput) => void` | Enqueue a capture — returns immediately |
| `flush` | `() => Promise<void>` | Process all pending items — useful in tests or on shutdown |

---

### `ContextSweep`

Rule-based signal detection without LLM calls.

```typescript
import { ContextSweep, inferCategory } from "@vault-core/core";

const sweep = new ContextSweep();
const signals = sweep.detect({ text, hints });
// signals: DetectionSignal[] — may be empty if below threshold
```

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `detect` | `(input: CaptureInput) => DetectionSignal[]` | Run keyword and structural rules against input text. Returns empty array if composite confidence < 0.45. |

**`inferCategory(text: string): MemoryCategory`** — Standalone helper that infers a memory category from text without running the full sweep.

---

## Scoring

### `Scorer`

Compute a 7-factor `ImportanceScore` for a memory candidate.

```typescript
import { Scorer, DEFAULT_WEIGHTS } from "@vault-core/core";

const scorer = new Scorer(config, indexDb, embedder);
const result = await scorer.score(candidate);
if (result === null) {
  // rejected — below capture_threshold
}
```

**Constructor**: `new Scorer(config: VaultCoreConfig, indexDb: IndexDB, embedder: Embedder)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `score` | `(candidate: MemoryCandidate) => Promise<ImportanceScore \| null>` | Compute composite score. Returns null if below `config.captureThreshold`. |

**`DEFAULT_WEIGHTS`** — Default `ScoringWeights` matching config defaults.

---

### `Embedder` / `HarnessEmbedder` / `LocalEmbedder`

```typescript
import { createEmbedder, HarnessEmbedder, LocalEmbedder } from "@vault-core/core";
import type { EmbedderConfig } from "@vault-core/core";

const embedder = createEmbedder(config);
const embedding = await embedder.embed("some text");
// embedding: number[]
```

**`createEmbedder(config: VaultCoreConfig): Embedder`** — Factory that returns the appropriate embedder based on config and availability.

**`Embedder` interface**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `embed` | `(text: string) => Promise<number[]>` | Generate a dense embedding vector |

**`HarnessEmbedder`** — Calls `inference_command` subprocess with JSON payload.

**`LocalEmbedder`** — Uses `@xenova/transformers` (dynamically imported). Falls back to `HarnessEmbedder` if unavailable.

---

## Retrieval

### `HybridRetriever`

Hybrid BM25 + vector search with Reciprocal Rank Fusion.

```typescript
import { HybridRetriever } from "@vault-core/core";

const retriever = new HybridRetriever(config, indexDb, embedder);
const memories = await retriever.retrieve({
  text: "typescript configuration",
  projectId: "my-project",
  topK: 10,
});
// memories: RankedMemory[]
```

**Constructor**: `new HybridRetriever(config: VaultCoreConfig, indexDb: IndexDB, embedder: Embedder)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `retrieve` | `(query: RetrievalQuery) => Promise<RankedMemory[]>` | Run hybrid search. Applies RRF (k=60), scope/status filters, 1.5× boost for human-edited memories. |

---

### `Injector`

Format `RankedMemory[]` into a token-budgeted Markdown context block.

```typescript
import { Injector } from "@vault-core/core";

const injector = new Injector();
const block = injector.format(memories, { maxTokens: 2000 });
// block: InjectionBlock — { text: string, memoriesIncluded: number, tokensUsed: number }
```

**Constructor**: `new Injector()`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `format` | `(memories: RankedMemory[], options: { maxTokens: number }) => InjectionBlock` | Format memories into a Markdown block. Never truncates mid-note. Always includes the first memory regardless of budget. |

---

## Consolidation

### `Proposer`

Cluster episodic memories and generate semantic consolidation proposals.

```typescript
import { Proposer } from "@vault-core/core";

const proposer = new Proposer(config, indexDb, embedder, adjudicator);
const proposals = await proposer.propose({ projectId: "my-project" });
// proposals: ConsolidationProposal[]
```

**Constructor**: `new Proposer(config: VaultCoreConfig, indexDb: IndexDB, embedder: Embedder, adjudicator: Adjudicator)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `propose` | `(options?: { projectId?: string }) => Promise<ConsolidationProposal[]>` | Cluster episodic memories by cosine similarity (threshold 0.3, min cluster 3) and generate one proposal per cluster |

---

### `Adjudicator`

LLM-based conflict resolution and memory consolidation.

```typescript
import { Adjudicator } from "@vault-core/core";

const adj = new Adjudicator(config);
const proposal = await adj.consolidate(cluster);
// proposal: ConsolidationProposal

const resolution = await adj.resolveConflict(memA, memB);
// resolution: ConflictResolution — "keep_a" | "keep_b" | "merge"
```

**Constructor**: `new Adjudicator(config: VaultCoreConfig)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `consolidate` | `(cluster: Memory[]) => Promise<ConsolidationProposal>` | Synthesize a cluster of episodic memories into a semantic note proposal |
| `resolveConflict` | `(a: Memory, b: Memory) => Promise<ConflictResolution>` | Determine which of two conflicting memories to keep, or merge |

Calls are made via `inference_command` subprocess with 30s timeout.

---

### `ApprovalInterface`

Human approval workflow via vault inbox.

```typescript
import { ApprovalInterface } from "@vault-core/core";

const approval = new ApprovalInterface(config, writer, indexDb);
await approval.renderToInbox(proposals);
// → writes vault/00-inbox/consolidation-proposals.md

const applied = await approval.applyApproved();
// applied: number — count of proposals applied
```

**Constructor**: `new ApprovalInterface(config: VaultCoreConfig, writer: VaultWriter, indexDb: IndexDB)`

**Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `renderToInbox` | `(proposals: ConsolidationProposal[]) => Promise<void>` | Write proposals to `00-inbox/consolidation-proposals.md` as YAML frontmatter blocks |
| `applyApproved` | `() => Promise<number>` | Read inbox file, write approved proposals as semantic memories, mark source memories superseded, clear inbox |

---

## Types (`@vault-core/types`)

Key interfaces from `@vault-core/types`:

```typescript
interface Memory {
  id: string;
  tier: "episodic" | "semantic" | "procedural";
  scope: "user" | "project";
  category: "decision" | "constraint" | "pattern" | "bugfix" | "discovery" | "preference";
  status: "active" | "superseded" | "archived";
  summary: string;
  content: string;
  tags: string[];
  projectId?: string;
  strength: number;           // 0–1 composite score
  importanceScore: ImportanceScore;
  frequencyCount: number;
  embedding?: number[];
  sourceType: "hook" | "cli" | "manual";
  sourceHarness?: string;
  sourceSession?: string;
  capturedAt: Date;
  updatedAt: Date;
  humanEditedAt?: Date;
  filePath: string;
}

interface ImportanceScore {
  recency: number;
  frequency: number;
  importance: number;
  utility: number;
  novelty: number;
  confidence: number;
  interference: number;
  composite: number;
}

interface RetrievalQuery {
  text: string;
  projectId?: string;
  topK?: number;
  scope?: "user" | "project";
}

interface RankedMemory extends Memory {
  rank: number;
  score: number;
}

interface InjectionBlock {
  text: string;
  memoriesIncluded: number;
  tokensUsed: number;
}
```

Full interface definitions are in `packages/types/src/`.
