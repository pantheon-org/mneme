# ADR-001: Bun as Runtime

**Status**: Accepted

## Context

The project requires native SQLite access, fast test execution, and modern TypeScript support without complex build tooling. Node.js requires third-party packages (`better-sqlite3`, Jest/Vitest configuration) and additional compilation steps for TypeScript.

## Decision

Use Bun as the runtime for all packages. Use `bun:sqlite` for database access and `bun:test` for unit tests.

Enforced via Biome `noRestrictedImports` rules that ban `better-sqlite3`, `jest`, and `vitest`.

## Consequences

- Native SQLite available via `bun:sqlite` — no native addon compilation
- `bun:test` runs TypeScript directly with no transpile step
- `bun install` is significantly faster than `npm install`
- Bun is not Node.js — some Node.js ecosystem packages may behave differently
- CI and developer machines must have Bun installed (not Node.js alone)
