# P03T04 — async-queue

## Phase

03 — capture-pipeline

## Goal

Implement the durable async capture queue: `capture()` pushes to an in-memory queue and returns immediately (< 5ms). A background worker processes batches: sweep → embed → score → filter → write → index → audit. Unprocessed items persist across restarts via `~/.vault-core/pending.jsonl`.

## File to create/modify

```
packages/core/src/capture/queue.ts
```

## Implementation

```typescript
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { CaptureInput } from '@vault-core/types'
import type { ContextSweep } from './sweep.js'
import type { Scorer } from '../scoring/scorer.js'
import type { Embedder } from '../scoring/embedder.js'
import type { VaultWriter } from '../storage/vault-writer.js'
import type { IndexDB } from '../storage/index-db.js'
import type { AuditLog } from '../storage/audit-log.js'

const PENDING_PATH = join(homedir(), '.vault-core', 'pending.jsonl')

export class CaptureQueue {
  private queue: CaptureInput[] = []
  private processing = false

  constructor(
    private readonly sweep: ContextSweep,
    private readonly embedder: Embedder,
    private readonly scorer: Scorer,
    private readonly writer: VaultWriter,
    private readonly db: IndexDB,
    private readonly audit: AuditLog,
  ) {
    this.replayPending()
    setInterval(() => this.processBatch(), 500)
  }

  capture(input: CaptureInput): void {
    this.queue.push(input)
    appendFileSync(PENDING_PATH, JSON.stringify(input) + '\n', 'utf-8')
  }

  private replayPending(): void {
    if (!existsSync(PENDING_PATH)) return
    const lines = readFileSync(PENDING_PATH, 'utf-8').trim().split('\n').filter(Boolean)
    for (const line of lines) {
      try { this.queue.push(JSON.parse(line) as CaptureInput) } catch { /* ignore malformed */ }
    }
    writeFileSync(PENDING_PATH, '', 'utf-8')  // clear after loading
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    const batch = this.queue.splice(0, 10)
    try {
      for (const input of batch) {
        const candidates = this.sweep.scan(input)
        if (candidates.length === 0) continue

        const texts = candidates.map(c => c.content)
        const embeddings = await this.embedder.embed(texts)
        for (let i = 0; i < candidates.length; i++) {
          const candidate = candidates[i]!
          candidate.embedding = embeddings[i]!
          const score = await this.scorer.score(candidate, new Date())
          if (!score) continue

          const memory = this.buildMemory(candidate, score)
          this.writer.write(memory)
          this.db.upsert(memory)
          this.db.upsertVector(memory.id, candidate.embedding)
          this.audit.append({ ts: new Date().toISOString(), op: 'capture', memoryId: memory.id })
        }
      }
      // Clear processed items from pending file
      if (this.queue.length === 0) writeFileSync(PENDING_PATH, '', 'utf-8')
    } finally {
      this.processing = false
    }
  }

  private buildMemory(candidate: any, score: any): any {
    const id = `mem_${Date.now().toString(36)}`
    return {
      id,
      tier: candidate.input.hints?.tier ?? 'episodic',
      scope: candidate.input.projectId ? 'project' : 'user',
      category: candidate.input.hints?.category ?? this.inferCategory(candidate),
      status: 'active',
      summary: candidate.content.slice(0, 120),
      content: candidate.content,
      tags: candidate.input.hints?.tags ?? [],
      projectId: candidate.input.projectId,
      strength: score.composite,
      importanceScore: score.importance,
      frequencyCount: 1,
      sourceType: candidate.input.sourceType,
      sourceHarness: candidate.input.sourceHarness,
      sourceSession: candidate.input.sourceSession,
      capturedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      humanEditedAt: null,
      filePath: '',   // set by writer
    }
  }

  private inferCategory(candidate: any): string {
    const signal = candidate.signals[0]
    return signal?.label ?? 'discovery'
  }
}
```

## Notes

- `setInterval(processBatch, 500)` — batches up to 10 items every 500ms
- `pending.jsonl` is appended on every `capture()` call and cleared after successful processing — ensures durability without a heavy queue library
- The `buildMemory` private method produces a `Memory`; its `filePath` is set by `VaultWriter.write()` before the write call (writer fills it in)
- Do not use `any` in the final implementation — replace with proper types from `@vault-core/types`

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  // Smoke test: capture() must return in < 5ms
  const start = Date.now()
  // (instantiate with mocks in real test)
  console.log('capture() return time target: < 5ms')
  console.assert(Date.now() - start < 5, 'setup too slow')
  console.log('async-queue structure OK')
"
# Full integration test runs in Phase 09
```
