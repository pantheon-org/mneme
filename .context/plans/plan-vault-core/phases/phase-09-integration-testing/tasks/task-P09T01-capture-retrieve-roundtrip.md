# P09T01 — capture-retrieve-roundtrip

## Phase

09 — integration-testing

## Goal

Test scenario 1: capture 20 synthetic memories (mix of tiers and scopes), run indexer, retrieve with 5 different queries, verify top-k contains expected results.

## File to create/modify

```
packages/core/src/__tests__/integration/capture-retrieve.test.ts
```

## Implementation

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { VaultWriter } from '../../storage/vault-writer.js'
import { IndexDB } from '../../storage/index-db.js'
import { HybridRetriever } from '../../retrieval/retriever.js'
import { Injector } from '../../retrieval/injector.js'
import type { Memory } from '@vault-core/types'

const FIXTURES: Partial<Memory>[] = [
  { summary: 'Use SQLite over Postgres for local index', category: 'decision', tier: 'semantic', tags: ['database'] },
  { summary: 'bun:sqlite requires synchronous API', category: 'bugfix', tier: 'episodic', tags: ['bun', 'sqlite'] },
  // ... 18 more synthetic memories
]

describe('capture → retrieve round-trip', () => {
  let tmpVault: string
  let db: IndexDB

  beforeAll(() => {
    tmpVault = mkdtempSync(join(tmpdir(), 'vault-test-'))
    db = new IndexDB(join(tmpVault, 'index.db'))
    const writer = new VaultWriter(tmpVault)

    for (const fix of FIXTURES) {
      const mem: Memory = {
        id: `mem_${Math.random().toString(36).slice(2)}`,
        tier: fix.tier ?? 'episodic',
        scope: 'user',
        category: fix.category ?? 'discovery',
        status: 'active',
        summary: fix.summary ?? 'test',
        content: `## ${fix.summary}\n\nDetailed content about: ${fix.summary}`,
        tags: fix.tags ?? [],
        strength: 0.8,
        importanceScore: 0.7,
        frequencyCount: 1,
        sourceType: 'cli',
        capturedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        humanEditedAt: null,
        filePath: '',
      }
      writer.write(mem)
      db.upsert(mem)
    }
  })

  afterAll(() => rmSync(tmpVault, { recursive: true, force: true }))

  it('returns SQLite memory for "database choice" query', async () => {
    const results = db.bm25Search('database SQLite Postgres', 7)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.id).toContain('mem_')
  })

  it('returns bun sqlite memory for "bun async" query', async () => {
    const results = db.bm25Search('bun sqlite synchronous', 7)
    expect(results.length).toBeGreaterThan(0)
  })
})
```

## Notes

- Uses `bun test` as the test runner (check `package.json` for test script)
- Embedding-based (vector) retrieval requires a live embedder; BM25-only path is testable without one
- Synthetic memory content must be distinctive enough for BM25 to return unambiguous results

## Verification

```sh
bun test
# capture-retrieve.test.ts must pass
```
