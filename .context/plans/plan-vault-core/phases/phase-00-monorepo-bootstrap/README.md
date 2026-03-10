# Phase 00 — monorepo-bootstrap

## Goal

Scaffold the Bun workspace monorepo with all package directories, shared TypeScript config, root scripts, and config file generation — so every subsequent phase can `bun install && bun run build` and have a clean compile.

## Gate

- [x] `bun install` exits 0 with all workspace packages linked
- [x] `bun run build` exits 0 (no TS errors) across all packages
- [ ] `bun install:cli` exits 0 and `vault-cli --version` works from any directory
- [x] `~/.vault-core/config.toml` is auto-generated on first run with correct defaults

## Dependencies

- None (this is the foundation)

## Tasks

### P00T01 — [scaffold-workspace](tasks/task-P00T01-scaffold-workspace.md)
### P00T02 — [tsconfig-base](tasks/task-P00T02-tsconfig-base.md)
### P00T03 — [config-file-generation](tasks/task-P00T03-config-file-generation.md)
