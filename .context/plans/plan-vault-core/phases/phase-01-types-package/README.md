# Phase 01 — types-package

## Goal

Publish `@vault-core/types` — the shared contract used by every other package. Contains only interfaces and types, zero runtime code.

## Gate

- [ ] `bun run typecheck` passes across all packages referencing `@vault-core/types`
- [ ] Breaking a type in `@vault-core/types` causes a compile-time error (not runtime) in downstream packages
- [ ] All interfaces fully exported from `packages/types/src/index.ts`

## Dependencies

- Phase 00 (monorepo scaffold must exist)

## Tasks

### P01T01 — [core-interfaces](tasks/task-P01T01-core-interfaces.md)
### P01T02 — [package-config](tasks/task-P01T02-package-config.md)
