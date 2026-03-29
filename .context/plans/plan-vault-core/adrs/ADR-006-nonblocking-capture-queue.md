# ADR-006: Non-Blocking Async Capture Queue with pending.jsonl Durability

**Status**: Accepted

## Context

Capture is triggered from IDE hooks (Claude Code `PostToolUse`, OpenCode plugin) that run synchronously in the critical path of the developer's workflow. A slow or blocking capture would degrade the IDE experience. Captures must also survive process crashes.

## Decision

`CaptureQueue.capture()` returns immediately. Work is enqueued and processed asynchronously in the background. Items are written to `~/.vault-core/pending.jsonl` before processing so they survive a process restart.

On startup, the queue replays any items remaining in `pending.jsonl`.

BDD test T06 (`queue-durability.feature`) validates the persistence and replay behaviour.

## Consequences

- Hook execution time is decoupled from capture processing time
- No data loss on crash — `pending.jsonl` acts as a write-ahead log
- Capture errors are silent from the caller's perspective (logged to audit but not surfaced)
- Items in `pending.jsonl` may be processed out of order if the process restarts mid-queue (acceptable for memory capture)
