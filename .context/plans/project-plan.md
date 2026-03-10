# vault-core: Implementation Plan

> **Goal**: A locally-installable TypeScript monorepo that provides psychology-grounded,
> Obsidian-backed persistent memory for AI coding agents (Claude Code, OpenCode, and future
> harnesses). No copy-pasting — everything installs, links, and runs from source via standard
> tooling.

---

## Guiding Principles

1. **Architectural decisions are binary, not time-decayed** — semantic and procedural memories
   only change via explicit reconsolidation, never via Ebbinghaus curves
2. **Embeddings over Jaccard** — cosine similarity on dense vectors for novelty, deduplication,
   and interference detection
3. **Async capture, never blocking** — hooks fire and return immediately; extraction runs in a
   background queue
4. **Human edits are ground truth** — any note edited in Obsidian is immune to automated
   reconsolidation until explicitly cleared
5. **Open vault, not a silo** — memories are browsable markdown in Obsidian, not locked in SQLite
6. **Selective injection, not broadcast** — session start embeds current context, injects top-k
   relevant memories only

---

## Repository Structure

```
vault-core/                          # monorepo root
├── package.json                     # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
│
├── packages/
│   ├── types/                       # @vault-core/types
│   │   └── src/
│   │       ├── memory.ts
│   │       ├── capture.ts
│   │       ├── scoring.ts
│   │       ├── vault.ts
│   │       ├── retrieval.ts
│   │       └── index.ts
│   │
│   ├── core/                        # @vault-core/core — main library
│   │   └── src/
│   │       ├── index.ts             # VaultCore class, public API
│   │       ├── capture/
│   │       │   ├── queue.ts         # async capture queue
│   │       │   ├── sweep.ts         # context sweep (detection signals)
│   │       │   └── extractor.ts     # candidate extraction
│   │       ├── scoring/
│   │       │   ├── scorer.ts        # 7-factor ImportanceScore
│   │       │   ├── embedder.ts      # embedding abstraction
│   │       │   └── weights.ts       # default ScoringWeights
│   │       ├── storage/
│   │       │   ├── index-db.ts      # SQLite FTS5 + vector index
│   │       │   ├── vault-writer.ts  # writes markdown to Obsidian vault
│   │       │   ├── vault-reader.ts  # reads frontmatter + content
│   │       │   └── audit-log.ts     # append-only audit log
│   │       ├── retrieval/
│   │       │   ├── retriever.ts     # BM25 + vector hybrid search
│   │       │   └── injector.ts      # formats top-k for context injection
│   │       ├── consolidation/
│   │       │   ├── proposer.ts      # episodic → semantic proposals
│   │       │   └── adjudicator.ts   # conflict resolution via inference
│   │       └── config.ts            # VaultCoreConfig with defaults
│   │
│   ├── cli/                         # @vault-core/cli — vault-cli binary
│   │   └── src/
│   │       ├── index.ts             # entry point, command registration
│   │       ├── commands/
│   │       │   ├── capture.ts       # vault-cli capture
│   │       │   ├── fetch.ts         # vault-cli fetch <url>
│   │       │   ├── search.ts        # vault-cli search <query>
│   │       │   ├── recent.ts        # vault-cli recent
│   │       │   ├── consolidate.ts   # vault-cli consolidate
│   │       │   └── index.ts         # vault-cli index [--full]
│   │       └── format.ts            # stdout formatting helpers
│   │
│   ├── hook-claude-code/            # @vault-core/hook-claude-code
│   │   └── src/
│   │       ├── hooks.json           # Claude Code hook registration
│   │       ├── session-start.ts     # PreToolUse: inject top-k memories
│   │       ├── post-tool.ts         # PostToolUse: async capture queue push
│   │       └── session-stop.ts      # Stop: flush queue, final capture
│   │
│   └── hook-opencode/               # @vault-core/hook-opencode
│       └── src/
│           ├── plugin.ts            # OpenCode plugin entry point
│           ├── session-start.ts     # chat.message hook: inject memories
│           ├── post-message.ts      # per-message async capture
│           └── compaction.ts        # pre-compaction capture flush
│
└── skills/                          # SKILL.md files (harness-agnostic)
    ├── vault-capture/
    │   └── SKILL.md
    ├── vault-search/
    │   └── SKILL.md
    ├── vault-fetch/
    │   └── SKILL.md
    └── vault-consolidate/
        └── SKILL.md
```

---

## Phase 0: Repository Bootstrap

**Goal**: Working monorepo that builds cleanly, with all packages linked locally — no npm
publishing required, no copy-pasting.

### 0.1 — Monorepo scaffold

```bash
mkdir vault-core && cd vault-core
pnpm init
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

`package.json` (root):
```json
{
  "name": "vault-core-monorepo",
  "private": true,
  "scripts": {
    "build":    "pnpm -r run build",
    "dev":      "pnpm -r run dev",
    "test":     "pnpm -r run test",
    "typecheck":"pnpm -r run typecheck",
    "install:hooks": "pnpm --filter @vault-core/hook-claude-code run install-hooks &&
                      pnpm --filter @vault-core/hook-opencode run install-plugin",
    "install:skills": "node scripts/install-skills.js",
    "install:cli":    "pnpm --filter @vault-core/cli run install-global"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

Each package's `tsconfig.json` extends `../../tsconfig.base.json` and adds its own
`include`/`paths`.

### 0.2 — Local package linking

Because all packages live in the monorepo, pnpm workspace protocol handles linking
automatically. No `npm link` gymnastics:

```json
// packages/core/package.json
{
  "name": "@vault-core/core",
  "dependencies": {
    "@vault-core/types": "workspace:*"
  }
}
```

```json
// packages/cli/package.json
{
  "name": "@vault-core/cli",
  "dependencies": {
    "@vault-core/core":  "workspace:*",
    "@vault-core/types": "workspace:*"
  },
  "bin": {
    "vault-cli": "./dist/index.js"
  },
  "scripts": {
    "install-global": "npm link"
  }
}
```

After `pnpm install && pnpm build`, running `pnpm install:cli` makes `vault-cli` available
globally via `npm link` — no path management, no copy-pasting.

### 0.3 — Configuration file

`~/.vault-core/config.toml` (auto-generated on first run if missing):

```toml
vault_path        = "~/vault"
index_path        = "~/.vault-core/index.db"
harness           = "claude-code"          # or "opencode"
inference_command = "claude -p"            # headless inference
embedding_model   = "local:nomic-embed"    # or "harness" to delegate
capture_threshold = 0.45
top_k_retrieval   = 7

[scoring_weights]
recency      = 0.20
frequency    = 0.15
importance   = 0.25
utility      = 0.20
novelty      = 0.10
confidence   = 0.10
interference = -0.10

[vault_structure]
inbox       = "00-inbox"
episodic    = "01-episodic"
semantic    = "02-semantic"
procedural  = "03-procedural"
archive     = "04-archive"
```

---

## Phase 1: Types Package

**Goal**: Publish `@vault-core/types` — the shared contract used by every other package.
Contains only interfaces and types, no runtime code.

### Deliverables
- All interfaces from the design session (Memory, CaptureInput, ImportanceScore,
  RetrievalQuery, AuditEntry, ConsolidationProposal, VaultCore, VaultCoreConfig)
- Zero runtime dependencies
- Fully exported from `packages/types/src/index.ts`

### Acceptance criteria
- `pnpm typecheck` passes across all packages
- Any change here breaks downstream packages at compile time, not runtime

---

## Phase 2: Core Package — Storage Layer

**Goal**: Read and write markdown notes to the Obsidian vault with correct frontmatter;
maintain the SQLite index; append to the audit log.

### 2.1 — Vault writer

Writes a `Memory` to the correct path in the vault as a markdown file.

Frontmatter schema (YAML, Obsidian-compatible):
```yaml
---
id: mem_abc123
tier: episodic
scope: project
category: decision
status: active
summary: "Decided to use SQLite over Postgres for local index"
tags: [database, architecture]
project_id: my-project
strength: 0.82
importance_score: 0.75
frequency_count: 3
source_type: hook
source_harness: claude-code
source_session: sess_xyz
captured_at: 2026-03-10T14:23:00Z
updated_at: 2026-03-10T14:23:00Z
human_edited_at: null
---

## Decision: SQLite over Postgres

During the session on 2026-03-10, we evaluated database options for the local
index. SQLite was chosen because...
```

The `vault-writer` resolves the destination path from `VaultDestination`, creates
directories if needed, and writes atomically (write to `.tmp`, rename).

### 2.2 — Vault reader

Reads a markdown file, parses YAML frontmatter, returns a `Memory`. Detects
`human_edited_at` by comparing file mtime against the stored `updated_at` — if mtime is
newer, sets `human_edited_at` and writes it back.

### 2.3 — SQLite index

Two tables:

```sql
-- FTS5 for BM25 keyword search
CREATE VIRTUAL TABLE memories_fts USING fts5(
  summary, content, tags,
  content=memories, content_rowid=rowid
);

-- sqlite-vec for vector KNN
CREATE VIRTUAL TABLE memory_vecs USING vec0(
  id TEXT PRIMARY KEY,
  embedding float[768]   -- dimension matches embedding model
);

-- Core metadata (not full content — that lives in vault files)
CREATE TABLE memories (
  id           TEXT PRIMARY KEY,
  tier         TEXT NOT NULL,
  scope        TEXT NOT NULL,
  status       TEXT NOT NULL,
  category     TEXT NOT NULL,
  summary      TEXT NOT NULL,
  content      TEXT NOT NULL,
  tags         TEXT NOT NULL,   -- JSON array
  project_id   TEXT,
  strength     REAL NOT NULL,
  file_path    TEXT NOT NULL,   -- absolute path in vault
  captured_at  TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  mtime_ns     INTEGER NOT NULL -- for change detection
);
```

The vault is the source of truth. The SQLite index is derived and rebuildable at any time
via `vault-cli index --full`.

### 2.4 — Audit log

Append-only JSONL file at `~/.vault-core/audit.jsonl`. One JSON object per line, never
modified, only appended. Provides full provenance for every operation.

### Acceptance criteria
- Round-trip: write a Memory → read it back → identical struct
- Index: write 100 notes, BM25 search returns expected results
- Audit: every write appends an entry to audit.jsonl
- Human edit detection: modify a vault file externally, reader detects it on next read

---

## Phase 3: Core Package — Capture Pipeline

**Goal**: Async capture queue that processes raw input into scored, routed, written memories
without blocking the caller.

### 3.1 — Embedder abstraction

```typescript
interface Embedder {
  embed(texts: string[]): Promise<number[][]>
  dimensions: number
}
```

Two implementations:
- `HarnessEmbedder` — calls `inference_command` with a structured prompt that returns
  embeddings as JSON. Uses the installed harness, no extra API key needed.
- `LocalEmbedder` — uses a local model (e.g. nomic-embed via `@xenova/transformers`).
  Preferred when available; faster and fully offline.

Config selects which to use. System falls back gracefully if local model unavailable.

### 3.2 — Context sweep

Scans raw content for detection signals without calling inference:

- **Layer 1**: Keyword patterns (importance signals from psychmem's multilingual list,
  trimmed to what's relevant for coding contexts)
- **Layer 2**: Structural signals (corrections, repetition, tool errors, enumerations)
- **Layer 3**: Caller hints (from `CaptureHints` — highest confidence, trusted)

Returns `MemoryCandidate[]` with `DetectionSignal[]` attached. If no signals exceed
pre-filter threshold, returns empty — no further processing.

### 3.3 — Scorer

Takes `MemoryCandidate` + existing index, computes `ImportanceScore`:

- **Recency**: time since capture, normalised to 1-week scale
- **Frequency**: access count, log-normalised
- **Importance**: weighted sum of detection signals with diminishing returns
- **Utility**: initialised to 0.5, adjusted by future retrieval feedback
- **Novelty**: `1 - max_cosine_similarity(candidate.embedding, top_50_existing)`
- **Confidence**: weighted average of signal confidences
- **Interference**: for each existing memory with cosine similarity 0.3–0.8,
  triggers adjudication call (async, does not block scoring)

### 3.4 — Async queue

```
capture(input) called by hook
  → push to in-memory queue → return immediately (non-blocking)

Background worker (setInterval or dedicated worker thread):
  → dequeue batch
  → run context sweep
  → embed candidates
  → score candidates
  → filter by threshold
  → detect conflicts → queue adjudication calls
  → write accepted memories to vault
  → update SQLite index
  → append to audit log
```

Queue is durable: on process start, any unprocessed items from the previous session are
replayed from a small pending queue file (`~/.vault-core/pending.jsonl`).

### Acceptance criteria
- `capture()` returns in < 5ms regardless of queue depth
- A 1000-word session capture is fully processed within 10 seconds
- Threshold filtering: captures below 0.45 composite are rejected and logged
- Conflict detection: semantically similar incoming content triggers adjudication,
  not automatic overwrite

---

## Phase 4: Core Package — Retrieval

**Goal**: Given a query (current session context), return the top-k most relevant memories
formatted for injection.

### 4.1 — Hybrid retriever

Same BM25 + vector + RRF pattern established in the Crosley analysis, but scoped:

1. Embed the query text
2. Run BM25 search against `memories_fts` (top 30)
3. Run KNN against `memory_vecs` (top 30)
4. Apply scope filter: always include `user`-scoped; include `project`-scoped only if
   `projectId` matches
5. Apply status filter: `active` only
6. Apply strength filter: episodic memories below `minStrength` excluded
   (semantic/procedural not filtered by strength — they're permanent until revoked)
7. RRF fusion → top-k

### 4.2 — Injector

Formats `RankedMemory[]` into a context block for harness injection:

```markdown
## Vault Context

**[constraint]** Never use `var` in TypeScript — always `const`/`let`
*Source: user preference · Strength: 1.0*

**[decision]** Using SQLite over Postgres for local index (2026-03-01)
*Source: project decision · my-project · Strength: 0.91*

**[bugfix]** bun:sqlite requires synchronous API — async/await does not work (2026-03-08)
*Source: session · claude-code · Strength: 0.74*
```

Token budget enforced: injector truncates to `maxTokens` by dropping lowest-ranked
results, never truncating mid-note.

### Acceptance criteria
- Retrieval latency < 50ms for a 10k-note vault
- Scope filtering: project memories from project A never appear in project B sessions
- Human-edited notes always rank above auto-captured notes of equal relevance score
- Token budget respected: result set never exceeds `maxTokens` estimate

---

## Phase 5: Core Package — Consolidation Loop

**Goal**: Periodically propose episodic → semantic promotions; surface for human approval;
write approved promotions to semantic store.

### 5.1 — Proposer

Runs on-demand (via `vault-cli consolidate` or scheduled) against the episodic store:

1. Cluster episodic memories by semantic similarity (cosine distance < 0.3 = same cluster)
2. For each cluster with ≥ 3 members, call inference to produce a proposed semantic note:
   > "Given these episodic records, what is the generalised semantic knowledge they imply?
   >  Write a single semantic note in markdown with appropriate category and tags."
3. Score the proposal — does it meet the semantic threshold?
4. Write proposal to `~/.vault-core/consolidation-queue.jsonl` with status `pending`

### 5.2 — Approval interface

Proposals surface as a special file in the vault: `00-inbox/consolidation-proposals.md`.
Each proposal is a markdown section with a frontmatter block the human can edit:

```markdown
---
proposal_id: prop_abc
status: pending     # change to 'approved' or 'rejected'
source_memories:
  - mem_001
  - mem_002
  - mem_003
---

## Proposed: bun:sqlite requires synchronous API

Across three sessions, the following pattern emerged: bun's SQLite binding does not
support async/await. All database calls must be synchronous...

**Tags**: bun, sqlite, gotcha
**Category**: constraint
**Scope**: user
```

When `vault-cli consolidate --apply` runs, it reads this file, processes any
`approved` proposals (writes semantic note, marks source episodic memories as
`superseded`), and clears the file.

### 5.3 — Adjudicator

Used by both conflict detection (Phase 3) and consolidation:

```typescript
interface AdjudicatorCall {
  type: 'conflict' | 'consolidation'
  prompt: string    // constructed by adjudicator.ts
  model: string     // small/fast model via inference_command
}
```

Single inference call returns structured JSON. The adjudicator constructs the prompt,
calls the harness headlessly, parses the response. All adjudication calls are logged to
the audit log.

### Acceptance criteria
- Proposer clusters correctly: 3 episodic memories about the same bug group together
- Approved proposals write correct semantic notes with proper frontmatter
- Source episodic memories are marked `superseded`, not deleted
- Rejected proposals are archived, not deleted — full audit trail preserved

---

## Phase 6: CLI Package

**Goal**: `vault-cli` binary installed globally via `npm link`. No copy-pasting, no
PATH manipulation beyond the link.

### Commands

```
vault-cli capture [--tier <tier>] [--project <id>] [--tags <tags>]
  Reads from stdin or --text flag. Calls core.captureSync().
  Used by skills for explicit capture.

vault-cli fetch <url> [--project <id>]
  Fetches URL, converts to markdown (via @mozilla/readability + turndown),
  pipes through capture pipeline with tier=episodic, category=discovery.

vault-cli search <query> [--top-k <n>] [--tier <tier>] [--project <id>]
  Calls core.retrieve(), prints formatted results to stdout.
  Exits 0 with results, exits 1 if no results found.

vault-cli recent [--n <count>] [--project <id>]
  Lists most recently captured/modified memories.

vault-cli consolidate [--apply] [--project <id>]
  Without --apply: runs proposer, writes to consolidation-proposals.md.
  With --apply: processes approved proposals from consolidation-proposals.md.

vault-cli index [--full] [--vault <path>]
  Without --full: incremental reindex (mtime-based change detection).
  With --full: drop and rebuild entire index.

vault-cli status
  Shows vault stats: note counts by tier, index freshness, queue depth,
  pending consolidation proposals, config summary.
```

### Installation (once, after clone)

```bash
cd vault-core
pnpm install
pnpm build
pnpm install:cli      # runs npm link inside packages/cli
```

After this, `vault-cli` is available in any terminal session. No further steps.

### Acceptance criteria
- `vault-cli capture <<< "text"` writes a note and exits 0
- `vault-cli search "query"` returns formatted results to stdout
- `vault-cli status` shows correct counts
- Binary works from any directory (not just vault-core/)

---

## Phase 7: Hook Packages

**Goal**: Harness-specific hooks that call into `@vault-core/core` directly — no
subprocess spawning, no copy-pasting hook files.

### 7.1 — Claude Code hooks

`packages/hook-claude-code/src/hooks.json`:
```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node ~/.vault-core/hooks/claude-code/session-stop.js"
      }]
    }],
    "PostToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "node ~/.vault-core/hooks/claude-code/post-tool.js"
      }]
    }]
  }
}
```

The hook scripts are compiled JS files installed to `~/.vault-core/hooks/claude-code/`
by `pnpm install:hooks`. They import `@vault-core/core` from the monorepo via the
global link.

`session-stop.ts` — reads transcript from `CLAUDE_TRANSCRIPT_PATH` env var (provided by
Claude Code on Stop hook), calls `core.capture()` with full session content.

`post-tool.ts` — reads tool event from stdin JSON, pre-filters for importance signals,
pushes to async queue if above pre-filter threshold.

### 7.2 — OpenCode plugin

`packages/hook-opencode/src/plugin.ts` — OpenCode plugin entry point. Registered in
`~/.config/opencode/opencode.json` by `pnpm install:hooks`.

Uses OpenCode's `chat.message` hook for per-message capture and session start injection.

### Installation (once, after CLI install)

```bash
pnpm install:hooks    # installs both claude-code hooks and opencode plugin
```

This script:
1. Compiles hook packages
2. Copies compiled JS to `~/.vault-core/hooks/`
3. Patches `~/.claude/settings.json` to register Claude Code hooks
4. Patches `~/.config/opencode/opencode.json` to register OpenCode plugin
5. Prints confirmation and any manual steps needed

### Acceptance criteria
- After `pnpm install:hooks`, Claude Code sessions automatically capture to vault
- After `pnpm install:hooks`, OpenCode sessions automatically capture to vault
- Hook execution never delays agent response by more than 5ms
- If vault-core is not running/configured, hooks fail silently (exit 0, log error)

---

## Phase 8: Skills

**Goal**: SKILL.md files installed to `~/.claude/skills/` and
`~/.config/opencode/skills/` by `pnpm install:skills`. Work in any compliant harness.

### Skills

**`vault-capture`**
```yaml
---
name: vault-capture
description: >
  Save important information to the persistent vault. Auto-invoke when the user
  says "remember this", "save this", "note that", or when a significant decision,
  constraint, or lesson is established. Also invoke before ending a session to
  capture key outcomes. Calls vault-cli capture.
allowed-tools: Bash
---
```

**`vault-search`**
```yaml
---
name: vault-search
description: >
  Search the persistent vault for relevant past knowledge. Auto-invoke at session
  start to retrieve relevant context, and whenever working on a topic where prior
  decisions, constraints, or patterns would help. Calls vault-cli search.
allowed-tools: Bash
---
```

**`vault-fetch`**
```yaml
---
name: vault-fetch
description: >
  Save a web URL to the vault as a research note. Invoke when the user shares a
  URL they want to reference later. Calls vault-cli fetch.
allowed-tools: Bash
---
```

**`vault-consolidate`**
```yaml
---
name: vault-consolidate
description: >
  Review and apply pending consolidation proposals — promoting episodic session
  captures into permanent semantic knowledge. Invoke when the user asks to review
  or process their memory consolidation queue. Calls vault-cli consolidate.
allowed-tools: Bash
---
```

### Installation (once)

```bash
pnpm install:skills
```

Copies SKILL.md files to `~/.claude/skills/` and `~/.config/opencode/skills/`.

---

## Phase 9: Integration Testing

**Goal**: End-to-end test that exercises the full pipeline without requiring a live harness.

### Test scenarios

1. **Capture → index → retrieve round-trip**
   Capture 20 synthetic memories (mix of tiers/scopes), run indexer, retrieve with 5
   different queries, verify top-k contains expected results

2. **Scope isolation**
   Capture 10 project-A memories and 10 project-B memories, retrieve for project-A,
   verify project-B memories never appear

3. **Human edit immunity**
   Write a semantic note, modify its file directly (simulate Obsidian edit), run
   retrieval, verify `human_edited_at` is set and note is immune to reconsolidation

4. **Conflict detection**
   Capture a memory, then capture a conflicting memory (same topic, different
   conclusion), verify conflict is logged and not auto-applied

5. **Consolidation proposal**
   Capture 5 episodic memories about the same topic, run `vault-cli consolidate`,
   verify a proposal is written to `consolidation-proposals.md`

6. **Queue durability**
   Push 10 items to capture queue, kill the process, restart, verify all 10 are
   processed from `pending.jsonl`

7. **Token budget enforcement**
   Retrieve with `maxTokens: 500`, verify injected context never exceeds estimate

---

## Build and Development Workflow

### Initial setup (once)

```bash
git clone <your-repo> vault-core
cd vault-core
pnpm install           # installs all packages, links workspace deps
pnpm build             # compiles all packages
pnpm install:cli       # makes vault-cli available globally
pnpm install:hooks     # installs hooks into claude-code + opencode
pnpm install:skills    # installs SKILL.md files into harnesses
```

### Development loop (ongoing)

```bash
pnpm dev               # watches all packages, recompiles on change
vault-cli status       # verify everything is wired up
```

When you modify any package in the monorepo:
- `pnpm dev` recompiles automatically
- The globally-linked `vault-cli` picks up changes immediately (it resolves through
  the workspace link, not a copy)
- Hook scripts also pick up changes immediately (same reason)

### Updating hooks or skills after changes

```bash
pnpm install:hooks     # idempotent — safe to re-run
pnpm install:skills    # idempotent — safe to re-run
```

No manual file copying. Ever.

---

## Build Order

Dependencies flow strictly in one direction. Build phases respect this order:

```
Phase 1: @vault-core/types           (no deps)
Phase 2: @vault-core/core            (depends on types)
Phase 3: @vault-core/cli             (depends on core, types)
Phase 4: @vault-core/hook-claude-code (depends on core, types)
Phase 4: @vault-core/hook-opencode    (depends on core, types)
Phase 5: skills/                     (no code deps — pure markdown)
```

`pnpm build` at the root runs these in correct order via pnpm's workspace topology.

---

## Open Questions (Deferred)

These are explicitly deferred — do not block Phase 1 implementation:

1. **Embedding model selection**: Start with `HarnessEmbedder` (delegates to installed
   harness). Add `LocalEmbedder` in a later iteration once the pipeline is working.

2. **Decay for episodic memories**: The decay model applies only to episodic tier.
   Start with no decay (everything stays active). Add Ebbinghaus decay as a configurable
   option once the slow loop is validated.

3. **Vector dimensions**: Tied to embedding model choice. Start with 768
   (nomic-embed default). The schema supports changing this via full reindex.

4. **Web fetch quality**: Start with `@mozilla/readability` + `turndown`. Evaluate
   whether Firecrawl integration is worth the external dependency later.

5. **Consolidation scheduling**: Start with manual (`vault-cli consolidate`). Add
   a file watcher or cron-style trigger once the manual flow is validated.

6. **Multi-vault support**: Single vault path for now. Multiple vaults (personal +
   work) is a natural extension once scoping is proven.
