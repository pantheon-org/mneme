# Phase 07 — hook-packages

## Goal

Harness-specific hooks that call directly into `@vault-core/core` — no subprocess spawning. After `bun install:hooks`, sessions in Claude Code and OpenCode automatically capture to the vault.

## Gate

- [ ] After `bun install:hooks`, Claude Code Stop hook writes session transcript to vault
- [ ] After `bun install:hooks`, OpenCode per-message hook pushes captures to async queue
- [ ] Hook execution never delays agent response by more than 5ms
- [ ] If vault-core is unconfigured, hooks exit 0 and log error (no crash, no user-visible failure)
- [ ] `bun install:hooks` is idempotent — safe to re-run

## Dependencies

- Phase 03 (async capture queue — hooks call `core.capture()`)
- Phase 04 (retrieval — session-start hook injects top-k memories)
- Phase 06 (CLI package must be installed globally)

## Tasks

### P07T01 — [claude-code-hooks](tasks/task-P07T01-claude-code-hooks.md)
### P07T02 — [opencode-plugin](tasks/task-P07T02-opencode-plugin.md)
### P07T03 — [hook-install-script](tasks/task-P07T03-hook-install-script.md)
