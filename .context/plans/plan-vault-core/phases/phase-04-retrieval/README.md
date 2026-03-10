# Phase 04 — retrieval

## Goal

Given a query (current session context), return the top-k most relevant memories in a formatted context block ready for harness injection.

## Gate

- [ ] Retrieval latency < 50ms for a 10k-note vault (BM25 + KNN + RRF fusion)
- [ ] Scope filtering: project-A memories never appear in project-B sessions
- [ ] Human-edited notes rank above equal-relevance auto-captured notes
- [ ] Token budget respected: result set never exceeds `maxTokens` estimate (no mid-note truncation)

## Dependencies

- Phase 02 (SQLite index for BM25 and vector search)
- Phase 03 (embedder for query embedding)

## Tasks

### P04T01 — [hybrid-retriever](tasks/task-P04T01-hybrid-retriever.md)
### P04T02 — [injector](tasks/task-P04T02-injector.md)
