# P03T03 — scorer

## Phase

03 — capture-pipeline

## Goal

Implement `Scorer` — computes a 7-factor `ImportanceScore` for a `MemoryCandidate`, combining recency, frequency, importance, utility, novelty, confidence, and interference into a composite score. Candidates below the threshold are filtered out.

## File to create/modify

```
packages/core/src/scoring/scorer.ts
```

## Implementation

```typescript
import type { ImportanceScore, MemoryCandidate, ScoringWeights } from '@vault-core/types'
import type { IndexDB } from '../storage/index-db.js'

const DEFAULT_WEIGHTS: ScoringWeights = {
  recency:      0.20,
  frequency:    0.15,
  importance:   0.25,
  utility:      0.20,
  novelty:      0.10,
  confidence:   0.10,
  interference: -0.10,
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! ** 2
    nb += b[i]! ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8)
}

export class Scorer {
  constructor(
    private readonly db: IndexDB,
    private readonly weights: ScoringWeights = DEFAULT_WEIGHTS,
    private readonly threshold: number = 0.45,
  ) {}

  async score(candidate: MemoryCandidate, capturedAt: Date): Promise<ImportanceScore | null> {
    const recency = Math.exp(-((Date.now() - capturedAt.getTime()) / (7 * 86_400_000)))

    const importanceRaw = candidate.signals.reduce((sum, s) => {
      return sum + s.confidence * (1 - sum * 0.3)  // diminishing returns
    }, 0)

    const confidence = candidate.signals.reduce((s, x) => s + x.confidence, 0) /
                       Math.max(candidate.signals.length, 1)

    let novelty = 1.0
    if (candidate.embedding) {
      const top50 = this.db.knnSearch(candidate.embedding, 50)
      if (top50.length > 0) {
        const maxSim = Math.max(...top50.map(r => 1 - r.distance))
        novelty = 1 - maxSim
      }
    }

    const score: ImportanceScore = {
      recency,
      frequency:   0,          // initialised to 0 for new memories
      importance:  Math.min(importanceRaw, 1.0),
      utility:     0.5,        // default; adjusted by retrieval feedback
      novelty,
      confidence,
      interference: 0,
      composite: 0,
    }

    score.composite =
      score.recency      * this.weights.recency      +
      score.frequency    * this.weights.frequency    +
      score.importance   * this.weights.importance   +
      score.utility      * this.weights.utility      +
      score.novelty      * this.weights.novelty      +
      score.confidence   * this.weights.confidence   +
      score.interference * Math.abs(this.weights.interference)

    return score.composite >= this.threshold ? score : null
  }
}
```

## Notes

- `interference` factor: memories with cosine similarity 0.3–0.8 vs existing trigger async adjudication (queued separately), but do not block the composite score calculation
- `utility` is always initialised to 0.5; it is updated by retrieval feedback in a later iteration
- Diminishing returns formula prevents signal stacking: each additional signal contributes less than the last

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  const { Scorer } = require('./packages/core/dist/scoring/scorer.js')
  // Mock IndexDB with no existing vectors
  const mockDb = { knnSearch: () => [] }
  const scorer = new Scorer(mockDb)
  const candidate = {
    content: 'We decided to use SQLite',
    signals: [{ type: 'keyword', label: 'decision', confidence: 0.7 }],
    input: { content: '', sourceType: 'cli' },
    embedding: undefined,
  }
  scorer.score(candidate, new Date()).then(s => {
    console.assert(s !== null, 'expected a score above threshold')
    console.log('Scorer OK:', s?.composite)
  })
"
```
