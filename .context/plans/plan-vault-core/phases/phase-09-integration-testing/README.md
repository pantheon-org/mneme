# Phase 09 — integration-testing

## Goal

End-to-end test suite that exercises the full capture → index → retrieve pipeline using synthetic data, without requiring a live AI harness.

## Gate

- [x] `bun test` exits 0 with all 7 integration scenarios passing (17 assertions)
- [x] Scope-isolation test: project-B memories never appear in project-A retrieval results
- [x] Queue-durability test: pending items survive process restart and are replayed correctly

## Dependencies

- Phase 02 (storage layer)
- Phase 03 (capture pipeline)
- Phase 04 (retrieval)
- Phase 05 (consolidation loop)
- Phase 06 (CLI package)

## Tasks

<!-- One H3 per task. Add rows as tasks are created. -->
