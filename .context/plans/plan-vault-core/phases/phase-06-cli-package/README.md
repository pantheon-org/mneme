# Phase 06 — cli-package

## Goal

`vault-cli` binary installed globally via `bun link` — no PATH manipulation. Exposes all core operations (capture, fetch, search, recent, consolidate, index, status) as subcommands.

## Gate

- [ ] `vault-cli capture <<< "text"` writes a note and exits 0
- [ ] `vault-cli search "query"` returns formatted results to stdout, exits 1 when no results
- [ ] `vault-cli status` shows correct counts (tier breakdown, queue depth, pending proposals)
- [ ] Binary works from any directory (not just inside vault-core/)
- [ ] `bun install:cli` exits 0 and is idempotent

## Dependencies

- Phase 02 (storage layer)
- Phase 03 (capture pipeline)
- Phase 04 (retrieval)
- Phase 05 (consolidation loop)

## Tasks

### P06T01 — [command-skeleton](tasks/task-P06T01-command-skeleton.md)
### P06T02 — [core-commands](tasks/task-P06T02-core-commands.md)
### P06T03 — [install-script](tasks/task-P06T03-install-script.md)
