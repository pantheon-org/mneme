# Phase 05 — consolidation-loop

## Goal

Periodically cluster episodic memories and propose semantic promotions; surface proposals as a human-editable Obsidian file; write approved promotions and mark source episodic memories as superseded.

## Gate

- [x] Proposer clusters 3+ episodic memories about the same topic and writes a proposal to `00-inbox/consolidation-proposals.md`
- [x] `vault-cli consolidate --apply` writes approved semantic notes with correct frontmatter
- [x] Source episodic memories are marked `superseded`, not deleted
- [x] Rejected proposals are archived to audit log — not deleted, full provenance preserved

## Dependencies

- Phase 02 (storage layer — vault writer, SQLite index)
- Phase 03 (embedder for cosine clustering)

## Tasks

### P05T01 — [proposer](tasks/task-P05T01-proposer.md)
### P05T02 — [approval-interface](tasks/task-P05T02-approval-interface.md)
### P05T03 — [adjudicator](tasks/task-P05T03-adjudicator.md)
