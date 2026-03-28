# Critical Code Review — vault-core

**Date**: 2026-03-11  
**Scope**: `vault-core/` — all 5 packages  
**Overall rating**: C+ (functional scaffolding, significant bugs and debt)

---

## Summary table

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 12 |
| Medium | 14 |
| Low/Convention | 7 |
| **Total** | **37** |

---

## Critical

**1. VaultWriter silently overwrites human-edited memories** (`storage/vault-writer.ts`)  
The single most important design invariant — "human-edited memories must never be overwritten" — is not enforced in `VaultWriter.write()`. It calls `resolveFilePath()` and writes unconditionally. There is no check for `human_edited_at` before overwriting. Every automated reconsolidation path can silently destroy user edits.

**2. approval.ts clears all pending proposals at flush** (`consolidation/approval.ts`)  
`applyApproved()` truncates the entire proposals file at the end — including `pending` entries the user hasn't reviewed yet. Approved proposals trigger vault writes; then everything else is lost permanently. This is a data-loss bug.

**3. Scorer recency is always ~1.0** (`scoring/scorer.ts`)  
`elapsed = Date.now() - Date.parse(capturedAt)` where `capturedAt` is the current ISO string passed at capture time. Elapsed ≈ 0ms always. The recency dimension of the 7-factor score is permanently broken, always returning max value.

**4. replayPending truncates before processing** (`capture/queue.ts`)  
`replayPending()` truncates `pending.jsonl` before processing its contents. A crash mid-replay permanently loses pending captures. Correct order: process → then truncate on success.

---

## High

**5. vault-writer.ts / approval.ts vault↔DB atomicity gap** (`consolidation/approval.ts:writeSemanticNote`)  
`writer.write()` is called then `db.upsert()` is called separately. If the DB write fails, the vault file exists but the DB has no record — two ground-truth stores diverge with no recovery path.

**6. Human-edit detection window is fragile** (`storage/vault-reader.ts`)  
The 1000ms tolerance window for human-edit detection via `mtime` comparison is fragile. Fast automated write + fast human edit within 1s = edit is not detected. Any CI/VM with low mtime resolution or clock skew will miss edits entirely.

**7. adjudicator.ts passes full payload as single CLI arg** (`consolidation/adjudicator.ts`)  
`inferenceCommand` is split by whitespace then the full JSON payload is one argument. On Linux, `ARG_MAX` is ~128KB. Large clusters with long memory content will silently fail (the error is swallowed, returning `{}`, which the caller treats as a valid no-op).

**8. session-start hook is missing** (`packages/hook-claude-code/src/`)  
No `session-start.ts` exists. The retrieval/injection pipeline — the primary value proposition of vault-core for Claude Code users — is never triggered at session start. AGENTS.md lists `session-start.ts` as a key file that doesn't exist.

**9. appendFileSync in capture queue is blocking** (`capture/queue.ts`)  
The design constraint is "capture must be non-blocking." `CaptureQueue.capture()` calls `appendFileSync()` synchronously on the caller's thread, violating the contract. In a busy hook context this will stall Claude Code.

**10. Timer + interval concurrency not guarded** (`capture/queue.ts`)  
`setInterval` can fire `processBatch()` while an awaited `flush()` is already running `processBatch()`. No mutex or in-flight guard — the same batch can be double-processed.

**11. patchHumanEditedAt uses cross-device tmp** (`storage/vault-reader.ts:patchHumanEditedAt`)  
`patchHumanEditedAt` writes to `os.tmpdir()` then `renameSync`s to the vault. If `/tmp` is on a different filesystem (common on macOS with APFS volumes), `renameSync` throws `EXDEV`. Atomic writes must use a `.tmp` sibling in the same directory.

**12. sweep.ts / queue.ts: multi-candidate return is dead code** (`capture/sweep.ts`, `capture/queue.ts`)  
`sweep.scan()` is typed `MemoryCandidate[]` but always returns at most one candidate. `processBatch()` in queue.ts only processes `candidates[0]`, silently dropping extras if scan is ever extended.

---

## Medium

**13. Scorer weights sum to 0.9 vs config default sum of 1.0** (`scoring/scorer.ts`, `config.ts`)  
`DEFAULT_WEIGHTS` in scorer.ts sums to 0.9. `DEFAULT_CONFIG.scoring_weights` in config.ts sums to 1.0. They diverge silently depending on which path is used.

**14. composite score can go negative** (`scoring/scorer.ts`)  
The interference subtraction `score -= weights.interference * interference` can produce a score < 0. There is no `Math.max(0, ...)` clamp.

**15. interference ≡ 1 - novelty** (`scoring/scorer.ts`)  
When `novelty < 0.3`, `interference = 1 - novelty`. These two dimensions are perfectly correlated, making the 7-factor score effectively 6-factor with one factor counted twice.

**16. Retriever applies minStrength filter only to episodic tier** (`retrieval/retriever.ts`)  
Semantic and procedural memories skip the minStrength filter entirely. A corrupted or zero-strength semantic memory will always be returned.

**17. N+1 query pattern in HybridRetriever** (`retrieval/retriever.ts`)  
After BM25 + vector search return IDs, `getById()` is called in a loop for every result (up to ~2×topK×3 calls). Should bulk-fetch with a single `WHERE id IN (...)` query.

**18. Proposer cluster coherence is broken** (`consolidation/proposer.ts`)  
The greedy clustering algorithm checks `cosine(mem, other) < threshold` — distance from the first member, not the cluster centroid. Two memories can both be near `mem` but dissimilar to each other, producing incoherent clusters.

**19. Hardcoded paths ignore config** (`capture/queue.ts`, `consolidation/proposer.ts`, `hook-claude-code/src/loader.ts`)  
`PENDING_PATH` and `QUEUE_PATH` are hardcoded to `~/.vault-core/...` instead of reading from config. Multi-vault setups are broken.

**20. session-stop.ts captures unbounded transcript** (`hook-claude-code/src/session-stop.ts`)  
Reads the entire `CLAUDE_TRANSCRIPT_PATH` file with no size check. A long session's transcript could be megabytes — stored as one episodic memory, bloating the vault and the embedding store.

**21. Injector: first memory always added regardless of budget** (`retrieval/injector.ts`)  
The budget check is `sections.length > 0 && charCount + sectionChars > maxChars` — the first memory bypasses the budget entirely. A single memory with 50k chars would blow any budget.

**22. Shell arg splitting is fragile** (`scoring/embedder.ts`, `consolidation/adjudicator.ts`)  
`inferenceCommand.split(/\s+/)` can't handle quoted paths with spaces. A user with a space in their home directory will get silent failures.

**23. plugin.ts: process signal handler registered globally** (`plugin-opencode/src/plugin.ts`)  
`process.once('SIGINT', ...)` registered in a plugin can interfere with OpenCode's own signal handling and prevent clean shutdowns.

**24. plugin.ts: vault_recall tool captures itself** (`plugin-opencode/src/plugin.ts`)  
The `tool.execute.after` hook fires on ALL tool calls including `vault_recall`. Recall queries get captured as episodic memories, creating noise and potential feedback loops.

**25. loader.ts: no caching — full reinitialisation per hook event** (`hook-claude-code/src/loader.ts`)  
`loadHookCore()` opens a new SQLite connection, instantiates a new embedder, and creates all objects on every PostToolUse event. Claude Code fires PostToolUse frequently — this is expensive and creates un-closed DB handles.

**26. markSuperseded does not update vault Markdown** (`consolidation/approval.ts`)  
`markSuperseded` updates the DB status but does NOT update the vault Markdown file's frontmatter, causing vault/DB divergence. The vault file still shows the old status.

---

## Low / Conventions

**27. Named function declarations throughout**  
`loadConfig`, `renderMarkdown`, `patchHumanEditedAt`, `main` (hooks), `cosine`, `clusterByEmbedding`, `createEmbedder`, `formatMemory`, `readStdin` all violate the arrow-function convention enforced by Biome.

**28. Multiple exports per module**  
`sweep.ts` (ContextSweep + inferCategory), `embedder.ts` (HarnessEmbedder + LocalEmbedder + createEmbedder), `scorer.ts` (Scorer + DEFAULT_WEIGHTS), `proposer.ts` (Proposer + ConsolidationProposal), `loader.ts` (HookCore + loadHookCore) all violate the one-export-per-module rule.

**29. Comments in code**  
`queue.ts` contains `/* skip malformed */` and `// embedding failed` in violation of the no-comments rule.

**30. node:fs instead of Bun.file()**  
`vault-reader.ts` and `session-stop.ts` use `readFileSync` instead of Bun-native `Bun.file()`.

**31. Test quality is shallow**  
Integration tests assert `results.length > 0` and field presence but rarely assert ordering, relevance, or content correctness. No test for human-edit-immunity in the write path (T03 tests detection, not prevention). No test for the non-blocking capture constraint.

**32. config.ts vault_structure defaults mismatch**  
`archive` tier in `DEFAULT_CONFIG` has no corresponding `TIER_DIR` entry in VaultWriter. Silent fallback to `00-inbox` for unknown tiers means archived memories land in inbox.

**33. queue.ts exceeds 110 non-blank line limit**  
`queue.ts` is 113 non-blank lines — 3 lines over the Biome-enforced limit.

---

## Priority fix order

1. Enforce human-edit immunity in `VaultWriter.write()` — check `human_edited_at` before write
2. Fix `replayPending` truncation order — process first, truncate on success
3. Fix `applyApproved` to preserve unreviewed `pending` proposals
4. Fix the broken recency score — store capture time at queue entry, not scoring time
5. Implement the missing `session-start` hook so retrieval actually fires
6. Add concurrency guard to `CaptureQueue` (`processBatch` in-flight flag)
7. Make `patchHumanEditedAt` tmp file sibling to target (same filesystem)
8. Fix vault↔DB atomicity in `approval.ts:writeSemanticNote`
9. Extend minStrength filter to all tiers in retriever
10. Clamp composite score to `[0, 1]` in scorer
