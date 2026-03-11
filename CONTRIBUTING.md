# Contributing

Thank you for your interest in contributing to vault-core.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- TypeScript knowledge (strict mode)
- Familiarity with SQLite
- Claude Code or OpenCode for testing hooks end-to-end

## Development setup

```bash
git clone https://github.com/pantheon-org/mneme.git
cd mneme/vault-core
bun install
bun run build
```

## Project structure

This is a Bun workspace monorepo. All source code lives in `vault-core/packages/`:

| Package | Purpose |
|---------|---------|
| `@vault-core/types` | Shared TypeScript interfaces — zero runtime code |
| `@vault-core/core` | Main library: capture, storage, retrieval, consolidation |
| `@vault-core/cli` | `vault-cli` binary |
| `@vault-core/hook-claude-code` | Claude Code hooks |
| `@vault-core/hook-opencode` | OpenCode plugin |

## Making changes

### 1. Work from `vault-core/`

All commands must be run from the `vault-core/` directory.

### 2. Understand the design constraints

Before making changes, read [docs/architecture.md](docs/architecture.md). The key invariants:

- `CaptureQueue.capture()` must return immediately (non-blocking)
- Vault writes must be atomic (write `.tmp` → rename)
- The SQLite index is derived; it must be rebuildable from Markdown via `vault-cli index`
- Human-edited memories (those with `human_edited_at` set) are immune to automated changes
- Vector search is optional — all code paths must degrade gracefully to BM25-only

### 3. Type-check and test

```bash
bun run typecheck   # must pass with zero errors
bun test            # must pass all integration tests
```

Always run both before submitting a pull request.

### 4. Write integration tests

Tests live in `packages/core/src/__tests__/integration/`. Each test file covers a specific scenario. Follow the `T<nn>-description.test.ts` naming convention.

Tests must:
- Use real filesystem (temp dirs via `mkdtempSync`)
- Use real SQLite (no mocking of `IndexDB`)
- Clean up after themselves in `afterAll`
- Not rely on network access

## Code conventions

### TypeScript

- Strict mode enforced: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- Use `.js` extensions in all imports (even for `.ts` source files) — `NodeNext` module resolution
- Use `import type` for type-only imports
- No comments unless explicitly requested

### File naming

- Source files: `kebab-case.ts`
- Test files: `T<nn>-description.test.ts`

### Bun-native APIs

- Use `bun:sqlite` (not `better-sqlite3`)
- Use `bun:test` (not Jest/Vitest)
- Use `Bun.file()` for file reads where appropriate

## Adding a new CLI command

1. Add the command to `packages/cli/src/index.ts` using Commander.js
2. Wire dependencies in `packages/cli/src/core-loader.ts` if needed
3. Update `docs/cli.md` with the new command, its options, and examples

## Adding a new configuration key

1. Add the key to the `VaultCoreConfig` interface in `packages/types/src/vault.ts`
2. Add the default value to `loadConfig()` in `packages/core/src/config.ts`
3. Update `docs/configuration.md` with the key, type, default, and description

## Adding a new hook event

1. Implement the handler in the appropriate hook package
2. Update the hook registration template if needed
3. Update `docs/hooks.md` with the event, payload, and behavior

## Pull request checklist

- [ ] `bun run typecheck` passes with zero errors
- [ ] `bun test` passes all integration tests
- [ ] New functionality has a corresponding integration test
- [ ] Relevant documentation is updated
- [ ] No comments added to code (unless explicitly requested)
- [ ] No unused imports
- [ ] `.js` extensions used in all imports

## Reporting issues

Open an issue on GitHub with:
- Bun version (`bun --version`)
- OS and architecture
- Steps to reproduce
- Expected vs actual behavior
- Relevant log output from `~/.vault-core/audit.jsonl` if applicable
