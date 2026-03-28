# GEMINI.md — mneme / vault-core

Project context for the Gemini CLI GitHub Action.

## What this repository is

`vault-core` is a **Bun monorepo** of five TypeScript packages that implement persistent memory for AI coding agents. Memory is stored as Markdown files in an Obsidian vault, indexed in SQLite with hybrid BM25 + vector search.

## Package map

| Package | Path | Role |
|---|---|---|
| `@vault-core/types` | `packages/types/src/` | Shared interfaces — zero runtime code |
| `@vault-core/core` | `packages/core/src/` | Capture, storage, retrieval, consolidation |
| `@vault-core/cli` | `packages/cli/src/` | `vault-cli` binary (Commander.js) |
| `@vault-core/hook-claude-code` | `packages/hook-claude-code/src/` | Claude Code hook scripts |
| `@vault-core/plugin-opencode` | `packages/plugin-opencode/src/` | OpenCode plugin |

Dependency order: `types → core → cli / hook-claude-code / plugin-opencode`

## Code conventions (enforce these in reviews)

- **Runtime**: Bun only — use `bun:sqlite`, `bun:test`. Never `better-sqlite3`, Jest, or Vitest.
- **TypeScript**: strict mode, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
- **Modules**: NodeNext — `.js` extensions required in all imports even for `.ts` source.
- **Style**: Arrow functions over function declarations. No comments unless logic is non-obvious. No unused imports.
- **File size**: Max 110 non-blank lines per file (Biome enforced).
- **Exports**: One primary exported function or class per module. Helpers go in their own files.
- **Import style**: `import type` for type-only imports.

## Domain concepts

- **Episodic memory** — time-bound session events, decay allowed
- **Semantic memory** — distilled facts/rules, only change via reconsolidation
- **Procedural memory** — how-to processes, permanent until revoked
- **Human-edited immunity** — memories with `human_edited_at` set are never overwritten by automation
- **ImportanceScore** — 7-factor composite: recency, frequency, importance, utility, novelty, confidence, interference

## Design constraints

- `CaptureQueue.capture()` must return immediately (non-blocking)
- Vault writes are atomic: write `.tmp` then rename
- SQLite index is derived and rebuildable from Markdown via `vault-cli index`
- Vector search (sqlite-vec) is optional; system degrades gracefully to BM25
- No Ebbinghaus-style time decay on semantic or procedural memories

## Testing

- BDD integration tests: `bun run test:bdd` from `vault-core/`
- Feature files in `packages/core/src/__tests__/features/*.feature`
- Tests use real filesystem (temp dirs) and real SQLite — no mocking except `MockAdjudicator`
- Maintain >90% line coverage

## Essential commands

Run from `vault-core/`:

```bash
bun install
bun run build
bun run typecheck
bun run test:bdd
```

## Labels used in this repo

When triaging issues, prefer these label categories:
- `bug` / `enhancement` / `documentation` / `question`
- `package: types` / `package: core` / `package: cli` / `package: hook-claude-code` / `package: plugin-opencode`
- `priority: high` / `priority: medium` / `priority: low`
- `good first issue` / `help wanted`
