# ADR-003: SQLite as Derived Index

**Status**: Accepted

## Context

The system needs fast full-text search and vector similarity search over memories. A remote database would add operational complexity. A pure in-memory index would not survive restarts.

## Decision

Use SQLite (via `bun:sqlite`) at `~/.vault-core/index.db` as a derived, rebuildable index. The index is **not** the source of truth — Markdown vault files are. The index can always be reconstructed via `vault-cli index`.

SQLite FTS5 provides full-text search. `sqlite-vec` extension provides vector similarity search (see ADR-004).

## Consequences

- Zero operational overhead — no server process
- Index is safe to delete and rebuild at any time
- FTS5 virtual table enables BM25 keyword search without external search engine
- Vault Markdown files remain the authoritative record, readable by humans in Obsidian
- Concurrent write access is limited by SQLite's single-writer model (acceptable for single-user IDE tooling)
