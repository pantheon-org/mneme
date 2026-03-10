# Phase 03 — capture-pipeline

## Goal

Async capture queue that processes raw input into scored, routed, written memories without blocking the caller. `capture()` must return in < 5ms regardless of queue depth.

## Gate

- [ ] `capture()` returns in < 5ms under load (queue depth up to 500)
- [ ] A 1000-word session capture is fully processed (written to vault + indexed) within 10 seconds
- [ ] Captures with composite score < 0.45 are rejected and logged, not written
- [ ] Conflicting incoming content (cosine similarity 0.3–0.8 vs existing) triggers adjudication, not automatic overwrite
- [ ] `~/.vault-core/pending.jsonl` is replayed correctly after process restart (queue durability)

## Dependencies

- Phase 02 (storage layer — writer, reader, SQLite index, audit log)

## Tasks

### P03T01 — [embedder](tasks/task-P03T01-embedder.md)
### P03T02 — [context-sweep](tasks/task-P03T02-context-sweep.md)
### P03T03 — [scorer](tasks/task-P03T03-scorer.md)
### P03T04 — [async-queue](tasks/task-P03T04-async-queue.md)
