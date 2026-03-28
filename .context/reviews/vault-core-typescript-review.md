# vault-core TypeScript Code Review

**Date:** 2026-03-11  
**Scope:** `vault-core/packages/` — all five packages

---

## Critical

**`index-db.ts`: Vector search is fake**
`knnSearch` stores embeddings as JSON strings and queries with `WHERE embedding MATCH ?` — this is not actual sqlite-vec KNN syntax. The method returns empty results silently, making vector search a no-op while the system believes it's running hybrid search. Either integrate sqlite-vec properly or remove the dead code path.

**`vault-reader.ts`: Non-atomic patch write** (`patchHumanEditedAt`)
The design constraint requires atomic writes (`.tmp` → rename). `patchHumanEditedAt` uses plain `writeFileSync`, violating this constraint. A crash mid-write corrupts the vault file.

**`approval.ts`: Destructive file clear on error**
`applyApproved()` clears the proposals file with `writeFileSync('', '')` at the end unconditionally. If any write throws mid-loop, approved proposals are destroyed with no recovery path.

---

## High

**`index-db.ts`: Critical schema gaps — data loss**
`rowToMemory()` hard-codes `importanceScore: 0`, `frequencyCount: 0`, `sourceType: 'manual'`, `humanEditedAt: null`. These fields are never persisted to or read from the DB. This means every retrieval discards scoring and provenance data captured at write time.

**`index-db.ts`: `upsert()` always passes `mtime_ns: 0`**
The `mtime_ns` column exists for human-edit detection, but is never populated. `vault-reader.ts` compares mtime against `updated_at + 1000ms` — without a real mtime in the DB, this detection is effectively broken.

**`scorer.ts`: Interference weight double-negation**
`DEFAULT_WEIGHTS.interference = -0.1`. The composite formula applies `Math.abs(weights.interference) * -interference`. If the intent is that high interference *reduces* score, using a negative weight + forced sign flip is confusing and breaks if a caller passes a positive weight. The sign semantics are contradictory.

**`queue.ts`: ID collision on same-millisecond captures**
`Date.now().toString(36)` produces identical IDs for concurrent captures in the same millisecond. `adjudicator.ts` and `approval.ts` have the same issue. Use `crypto.randomUUID()` or a counter suffix.

**`retriever.ts`: `humanEditedAt` boost is dead code**
`rowToMemory()` always sets `humanEditedAt: null`, so the 1.5x boost for human-edited memories in `retrieve()` never fires.

**`scorer.ts`: `frequency` always 0**
The frequency factor is hardcoded to `0` — it's never read from the DB (where `frequencyCount` also isn't persisted). The `ScoringWeights.frequency` weight is wasted.

---

## Medium

**`capture/queue.ts`: Brittle pending queue replay**
`replayPending()` clears `pending.jsonl` immediately upon reading, before items are processed. A crash during replay loses all pending items.

**`cli/src/index.ts`: Queue drain timing hack**
`capture` and `fetch` commands wait `1500ms` as a proxy for queue drain. If the system is under load, items may not be written. Expose a `drain()` or `flush()` method on `CaptureQueue` instead.

**`sweep.ts`: Always returns at most 1 candidate**
`scan()` return type is `MemoryCandidate[]` but the implementation always wraps a single candidate. Multi-signal detection is architecturally hobbled.

**`proposer.ts`: Fetches ALL episodic memories, including inactive**
`getByTier('episodic')` has no status filter — superseded and archived memories participate in clustering.

**`adjudicator.ts` / `approval.ts`**: LLM response fields (`proposedCategory`, `proposedScope`, `proposedTier`) are cast directly to union types without validation. Invalid LLM output silently produces invalid `Memory` objects.

**`embedder.ts`: `LocalEmbedder` return type mismatch**
`@xenova/transformers` returns a `Tensor`, not `{ data: number[][] }`. The cast will throw at runtime for local embeddings.

**`embedder.ts`: No timeout on `execFile`**
`HarnessEmbedder.embed()` and inference calls in `adjudicator.ts` have no timeout. A hung harness blocks the process indefinitely.

---

## Low

**Comments violate repo convention**
Multiple files contain inline comments despite the explicit "no comments" rule: `index-db.ts`, `post-tool.ts`, `session-stop.ts`, `plugin-opencode/src/plugin.ts`, `cli/src/index.ts` (at least 6 instances of `// never fail the harness`, `// skip malformed`, etc.).

**`cli/src/index.ts`**: `opts.tier`, `opts.scope`, `opts.category` are cast to union types without validation — invalid values propagate silently.

**`plugin-opencode/src/plugin.ts`**: No cleanup on plugin unload — `IndexDB` connection and `CaptureQueue` interval timer are never disposed.

**`injector.ts`**: First memory always bypasses token budget (the `sections.length > 0` guard). A very large first memory will exceed `maxTokens`.

**`session-stop.ts`**: The entire session transcript is captured as a single memory. Long sessions will produce extremely large memories with poor signal-to-noise.

**`retriever.ts`**: `_reader` field is instantiated but never used — dead code.

**`approval.ts`**: `renderProposals()` uses a non-atomic write for the inbox approval file.

---

## Summary by package

| Package | Severity | Top concern |
|---|---|---|
| `core/storage/index-db.ts` | **Critical** | Fake vector search; schema gaps lose data |
| `core/storage/vault-reader.ts` | **Critical** | Non-atomic patch write |
| `core/consolidation/approval.ts` | **Critical** | Destructive file clear on error |
| `core/scoring/scorer.ts` | **High** | Frequency=0; interference sign bug |
| `core/capture/queue.ts` | **High** | ID collision; brittle replay |
| `core/retrieval/retriever.ts` | **High** | Dead humanEdited boost |
| `core/scoring/embedder.ts` | **Medium** | LocalEmbedder type mismatch; no timeout |
| `cli/src/index.ts` | **Medium** | Queue drain timing hack; no enum validation |
