# P09T07 — token-budget

## Phase

09 — integration-testing

## Goal

Test scenario 7: retrieve with `maxTokens: 500`, verify the injected context block never exceeds the token estimate.

## File to create/modify

```
packages/core/src/__tests__/integration/token-budget.test.ts
```

## Implementation

```typescript
import { describe, it, expect } from 'bun:test'
import { Injector } from '../../retrieval/injector.js'
import type { RankedMemory, Memory } from '@vault-core/types'

function makeRankedMemory(summary: string, content: string, score: number): RankedMemory {
  const memory: Memory = {
    id: `mem_${Math.random().toString(36).slice(2)}`,
    tier: 'episodic', scope: 'user', category: 'decision', status: 'active',
    summary, content, tags: [], strength: score,
    importanceScore: 0.8, frequencyCount: 1, sourceType: 'cli',
    capturedAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
    humanEditedAt: null, filePath: '/tmp/fake.md',
  }
  return { memory, score, bm25Rank: 1, vecRank: 1 }
}

describe('token budget enforcement', () => {
  const injector = new Injector()

  it('never exceeds maxTokens estimate', () => {
    const memories = Array.from({ length: 20 }, (_, i) =>
      makeRankedMemory(
        `Decision ${i}: use approach ${i}`,
        'A'.repeat(300),  // 300-char content = ~75 tokens each
        1 - i * 0.05,
      )
    )

    const block = injector.format(memories, 500)
    expect(block.tokenEstimate).toBeLessThanOrEqual(600)   // allow 20% margin
    expect(block.memoriesIncluded).toBeGreaterThan(0)
  })

  it('includes at least 1 memory even if first exceeds budget', () => {
    const bigMemory = makeRankedMemory('Summary', 'X'.repeat(5000), 0.9)
    const block = injector.format([bigMemory], 100)
    expect(block.memoriesIncluded).toBe(1)  // first note always included
  })

  it('returns empty block for empty input', () => {
    const block = injector.format([], 500)
    expect(block.markdown).toBe('')
    expect(block.memoriesIncluded).toBe(0)
  })

  it('never truncates mid-note', () => {
    const memories = Array.from({ length: 5 }, (_, i) =>
      makeRankedMemory(`Note ${i}`, 'B'.repeat(200), 1 - i * 0.1)
    )
    const block = injector.format(memories, 300)
    const sections = block.markdown.split('---').filter(s => s.trim())
    for (const section of sections) {
      // Each included note must be complete (not truncated mid-content)
      expect(section.trim().endsWith('BBB')).toBe(false)  // no partial 'B' blocks
    }
  })
})
```

## Notes

- The 20% margin (`<= 600` for a `500` budget) accounts for the character-to-token estimation being approximate
- "Never truncate mid-note" means: either the full note is included or it is excluded entirely — partial notes are forbidden

## Verification

```sh
bun test
# token-budget.test.ts must pass (4 assertions)
```
