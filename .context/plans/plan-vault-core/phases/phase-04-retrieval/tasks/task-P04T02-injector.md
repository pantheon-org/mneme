# P04T02 — injector

## Phase

04 — retrieval

## Goal

Implement `Injector` — formats `RankedMemory[]` into a context block (markdown string) ready for injection into an AI harness session. Enforces a token budget: drops lowest-ranked results rather than truncating mid-note.

## File to create/modify

```
packages/core/src/retrieval/injector.ts
```

## Implementation

```typescript
import type { RankedMemory, InjectionBlock } from '@vault-core/types'

const CHARS_PER_TOKEN = 4  // conservative estimate

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function formatMemory(ranked: RankedMemory): string {
  const { memory } = ranked
  const label = memory.category
  const scope = memory.scope === 'project'
    ? `project · ${memory.projectId}`
    : 'user preference'
  const date = memory.tier === 'episodic'
    ? ` (${memory.capturedAt.slice(0, 10)})`
    : ''

  return [
    `**[${label}]** ${memory.summary}${date}`,
    `*Source: ${scope} · Strength: ${memory.strength.toFixed(2)}*`,
    '',
    memory.content.slice(0, 500),  // cap very long notes
  ].join('\n')
}

export class Injector {
  format(memories: RankedMemory[], maxTokens = 2000): InjectionBlock {
    const header = '## Vault Context\n\n'
    let body = ''
    let count = 0

    for (const ranked of memories) {
      const section = formatMemory(ranked) + '\n\n---\n\n'
      const projected = estimateTokens(header + body + section)
      if (projected > maxTokens) break
      body += section
      count++
    }

    const markdown = count > 0 ? header + body.trimEnd() : ''
    return {
      markdown,
      tokenEstimate: estimateTokens(markdown),
      memoriesIncluded: count,
    }
  }
}
```

## Notes

- `maxTokens` is a soft limit based on character count (4 chars/token). It is conservative by design.
- Notes are never truncated mid-sentence — the entire note is included or excluded
- If the first note alone exceeds `maxTokens`, it is still included (returning 1 note); `maxTokens` is treated as a guidance target, not a hard cap for the first item

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  const { Injector } = require('./packages/core/dist/retrieval/injector.js')
  const inj = new Injector()
  const block = inj.format([], 500)
  console.assert(block.markdown === '', 'empty input gives empty block')
  console.assert(block.memoriesIncluded === 0)
  console.log('Injector empty case OK')
  
  const fakeMemory = {
    memory: { category: 'decision', summary: 'Use SQLite', content: 'Full content',
      scope: 'user', strength: 0.9, tier: 'episodic', capturedAt: '2026-03-01T00:00:00Z',
      humanEditedAt: null },
    score: 0.9, bm25Rank: 1, vecRank: 1
  }
  const block2 = inj.format([fakeMemory], 500)
  console.assert(block2.memoriesIncluded === 1, 'expected 1 memory')
  console.assert(block2.tokenEstimate <= 600, 'token estimate too high')
  console.log('Injector format OK:', block2.tokenEstimate, 'tokens')
"
```
