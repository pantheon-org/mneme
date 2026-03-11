# AGENTS.md

Guidance for AI coding agents working in this repository.

## Repository overview

This is a **Bun monorepo** (`vault-core/`) containing five TypeScript packages that implement persistent memory for AI coding agents. The packages form a strict dependency DAG:

```mermaid
graph TD
    T["@vault-core/types (no deps)"]
    C["@vault-core/core"]
    CLI["@vault-core/cli"]
    HC["@vault-core/hook-claude-code"]
    HO["@vault-core/plugin-opencode"]

    T --> C
    C --> CLI
    C --> HC
    C --> HO
```

## Essential commands

Run all commands from `vault-core/`:

```bash
bun install              # install dependencies
bun run build            # compile all packages (tsc --build)
bun run typecheck        # type-check all packages (no emit)
bun test                 # run integration tests
bun run install:hooks    # register hooks with Claude Code and OpenCode
bun run install:skills   # copy SKILL.md files to harness skill directories
bun run install:cli      # make vault-cli globally available
```

Always run `bun run typecheck` after making changes. Run `bun test` to verify integration.

## Code conventions

- **Language**: TypeScript with strict mode (`strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`)
- **Runtime**: Bun — use `bun:sqlite` (not `better-sqlite3`), use `bun:test` (not Jest/Vitest)
- **Module system**: `NodeNext` — use `.js` extensions in imports even for `.ts` source files
- **No comments**: do not add comments to code unless explicitly requested
- **No unused imports**: TypeScript strict mode will flag these

### Import style

```typescript
import { Memory } from "@vault-core/types";
import type { VaultCoreConfig } from "@vault-core/types";
```

Use `import type` for type-only imports.

### File naming

- Source files: `kebab-case.ts`
- Test files: `T<nn>-description.test.ts` (see existing test suite)

## Package locations

| Package | Path | Purpose |
|---------|------|---------|
| `@vault-core/types` | `packages/types/src/` | Shared interfaces — zero runtime code |
| `@vault-core/core` | `packages/core/src/` | Main library — capture, storage, retrieval, consolidation |
| `@vault-core/cli` | `packages/cli/src/` | `vault-cli` binary (Commander.js) |
| `@vault-core/hook-claude-code` | `packages/hook-claude-code/src/` | Claude Code hook scripts |
| `@vault-core/plugin-opencode` | `packages/plugin-opencode/src/` | OpenCode plugin |

## Key source files

| File | Role |
|------|------|
| `packages/core/src/config.ts` | Config loading from `~/.vault-core/config.toml` |
| `packages/core/src/capture/queue.ts` | Async capture queue (non-blocking) |
| `packages/core/src/capture/sweep.ts` | Rule-based signal detection |
| `packages/core/src/storage/index-db.ts` | SQLite schema + FTS5 + vector operations |
| `packages/core/src/storage/vault-writer.ts` | Atomic Markdown writes to Obsidian vault |
| `packages/core/src/storage/vault-reader.ts` | Markdown reads + human-edit detection |
| `packages/core/src/scoring/scorer.ts` | 7-factor importance score |
| `packages/core/src/scoring/embedder.ts` | Embedding abstraction (Harness/Local) |
| `packages/core/src/retrieval/retriever.ts` | BM25 + vector RRF hybrid search |
| `packages/core/src/retrieval/injector.ts` | Token-budgeted context formatter |
| `packages/core/src/consolidation/proposer.ts` | Episodic clustering |
| `packages/core/src/consolidation/adjudicator.ts` | LLM-based conflict resolution |
| `packages/core/src/consolidation/approval.ts` | Human approval via vault inbox |
| `packages/cli/src/index.ts` | All CLI commands |
| `packages/hook-claude-code/src/session-start.ts` | SessionStart hook entry point |
| `packages/hook-claude-code/src/post-tool.ts` | PostToolUse hook entry point |
| `packages/hook-claude-code/src/session-stop.ts` | Stop hook entry point |
| `packages/plugin-opencode/src/plugin.ts` | OpenCode plugin entry point |

## Testing

Tests live in `packages/core/src/__tests__/integration/`. There are 7 integration test suites:

| File | What it covers |
|------|---------------|
| `T01-capture-retrieve-roundtrip.test.ts` | Full pipeline: write → index → search |
| `T02-scope-isolation.test.ts` | Project scope filtering correctness |
| `T03-human-edit-immunity.test.ts` | External edit detection via mtime |
| `T04-conflict-detection.test.ts` | Vector fallback when sqlite-vec unavailable |
| `T05-consolidation-proposal.test.ts` | Episodic clustering and approval rendering |
| `T06-queue-durability.test.ts` | `pending.jsonl` persistence across restart |
| `T07-token-budget.test.ts` | Injector token budget enforcement |

Tests use real filesystem (temp dirs) and real SQLite. No mocking except `MockAdjudicator` in T05.

When adding new functionality, add a corresponding integration test following the `T<nn>-description.test.ts` naming pattern.

## Memory model (domain concepts)

Understanding these concepts is important when working on this codebase:

- **Episodic memory** — time-bound session events; decay is allowed
- **Semantic memory** — distilled facts/rules; only change via explicit reconsolidation
- **Procedural memory** — how-to processes; permanent until explicitly revoked
- **Strength** — composite score (0–1) reflecting memory durability
- **ImportanceScore** — 7-factor score: recency, frequency, importance, utility, novelty, confidence, interference
- **Human-edited** — memories with `human_edited_at` set are immune to automated reconsolidation

## Design constraints

- Capture must be non-blocking. `CaptureQueue.capture()` must return immediately.
- Writes to the vault are atomic: write to `.tmp` then rename.
- The SQLite index is derived and rebuildable from vault Markdown files via `vault-cli index`.
- Human edits in Obsidian are ground truth — never overwrite a memory with `human_edited_at` set.
- Do not add Ebbinghaus-style time decay to semantic or procedural memories.
- Vector search (sqlite-vec) is optional — the system must degrade gracefully to BM25-only.

## Runtime file paths

| Path | Purpose |
|------|---------|
| `~/.vault-core/config.toml` | Configuration file |
| `~/.vault-core/index.db` | SQLite index |
| `~/.vault-core/audit.jsonl` | Append-only audit log |
| `~/.vault-core/pending.jsonl` | Capture queue durability buffer |
| `~/.vault-core/consolidation-queue.jsonl` | Consolidation proposals buffer |
| `<vault_path>/00-inbox/` | Consolidation approval inbox |
| `<vault_path>/01-episodic/` | Episodic tier Markdown files |
| `<vault_path>/02-semantic/` | Semantic tier Markdown files |
| `<vault_path>/03-procedural/` | Procedural tier Markdown files |

## Documentation

All documentation lives in `docs/`. Update relevant docs when making changes to:

- CLI commands → `docs/cli.md`
- Configuration keys → `docs/configuration.md`
- Hook/plugin behavior → `docs/hooks.md`
- Public API → `docs/api.md`
- Architecture → `docs/architecture.md`

## Agent Rules <!-- tessl-managed -->

@.tessl/RULES.md follow the [instructions](.tessl/RULES.md)
