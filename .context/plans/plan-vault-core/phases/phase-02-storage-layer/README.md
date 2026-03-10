# Phase 02 — storage-layer

## Goal

Read and write Memory objects to the Obsidian vault as markdown with YAML frontmatter; maintain a SQLite FTS5 + vector index; append every operation to an audit log.

## Gate

- [ ] Round-trip: write a Memory → read it back → structs are identical
- [ ] Index: write 100 notes, BM25 search returns expected results
- [ ] Audit: every write appends one entry to `~/.vault-core/audit.jsonl`
- [ ] Human-edit detection: modifying a vault file externally sets `human_edited_at` on next read

## Dependencies

- Phase 01 (`@vault-core/types` must be built)

## Tasks

### P02T01 — [vault-writer](tasks/task-P02T01-vault-writer.md)
### P02T02 — [vault-reader](tasks/task-P02T02-vault-reader.md)
### P02T03 — [sqlite-index](tasks/task-P02T03-sqlite-index.md)
### P02T04 — [audit-log](tasks/task-P02T04-audit-log.md)
