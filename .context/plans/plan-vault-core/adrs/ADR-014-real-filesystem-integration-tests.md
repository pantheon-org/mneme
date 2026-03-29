# ADR-014: Real Filesystem and Real SQLite in Integration Tests

**Status**: Accepted

## Context

Mocking the filesystem and database in tests risks hiding bugs that only appear when the real systems interact. A prior incident (unrelated to this project) demonstrated that mocked tests can pass while the real system fails on migration.

## Decision

Integration tests (BDD Cucumber, `T01`–`T09`) use real temporary directories on the filesystem and a real SQLite database. No filesystem or database mocks.

The only mock in the test suite is `MockAdjudicator` in T05, which substitutes the LLM call during consolidation testing — LLM calls are impractical to run deterministically in CI.

## Consequences

- Integration tests catch real I/O behaviour (file permissions, atomic rename, FTS5 queries)
- Tests are slower than mock-based equivalents but remain fast enough for CI (SQLite in a temp dir is cheap)
- Tests are isolated via temp directories created and destroyed per scenario (`Before`/`After` hooks)
- LLM-dependent paths must be designed with a seam for test injection (e.g. `Adjudicator` interface)
- Test coverage must be >90% lines; verified manually via `bun test --coverage` before merging
