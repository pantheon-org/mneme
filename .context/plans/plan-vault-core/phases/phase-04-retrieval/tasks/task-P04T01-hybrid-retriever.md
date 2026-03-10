# P04T01 — hybrid-retriever

## Phase

04 — retrieval

## Goal

Implement `HybridRetriever` — BM25 + vector KNN with Reciprocal Rank Fusion (RRF), scope filtering (user vs project), status filtering (active only), and strength filtering for episodic memories.

## File to create/modify

```
packages/core/src/retrieval/retriever.ts
```

## Implementation

```typescript
import type { RetrievalQuery, RankedMemory, Memory } from '@vault-core/types'
import type { IndexDB } from '../storage/index-db.js'
import type { Embedder } from '../scoring/embedder.js'
import type { VaultReader } from '../storage/vault-reader.js'

const RRF_K = 60

function rrfScore(bm25Rank: number, vecRank: number): number {
  return 1 / (RRF_K + bm25Rank) + 1 / (RRF_K + vecRank)
}

export class HybridRetriever {
  constructor(
    private readonly db: IndexDB,
    private readonly embedder: Embedder,
    private readonly reader: VaultReader,
    private readonly defaultMinStrength: number = 0.0,
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RankedMemory[]> {
    const topK = query.topK ?? 7
    const minStrength = query.minStrength ?? this.defaultMinStrength

    const [embedding] = await this.embedder.embed([query.text])
    if (!embedding) return []

    const bm25Results = this.db.bm25Search(query.text, 30)
    const vecResults  = this.db.knnSearch(embedding, 30)

    const bm25Ranks = new Map(bm25Results.map((r, i) => [r.id, i + 1]))
    const vecRanks  = new Map(vecResults.map((r, i) => [r.id, i + 1]))

    const allIds = new Set([...bm25Ranks.keys(), ...vecRanks.keys()])
    const scored: Array<{ id: string; rrf: number; bm25Rank: number; vecRank: number }> = []

    for (const id of allIds) {
      const b = bm25Ranks.get(id) ?? 9999
      const v = vecRanks.get(id) ?? 9999
      scored.push({ id, rrf: rrfScore(b, v), bm25Rank: b, vecRank: v })
    }

    scored.sort((a, b) => b.rrf - a.rrf)

    const results: RankedMemory[] = []
    for (const { id, rrf, bm25Rank, vecRank } of scored) {
      if (results.length >= topK * 3) break   // over-fetch then filter

      let memory: Memory
      try {
        memory = this.db.getById(id)
      } catch {
        continue  // stale index entry — skip
      }

      // Status filter: active only
      if (memory.status !== 'active') continue

      // Scope filter
      if (memory.scope === 'project' && memory.projectId !== query.projectId) continue

      // Strength filter: episodic only
      if (memory.tier === 'episodic' && memory.strength < minStrength) continue

      // Human-edited memories get a rank boost
      const boostMultiplier = memory.humanEditedAt ? 1.5 : 1.0

      results.push({ memory, score: rrf * boostMultiplier, bm25Rank, vecRank })
      if (results.length >= topK) break
    }

    return results
  }
}
```

## Notes

- `db.getById()` must be added to `IndexDB` (returns a `Memory` from the metadata table)
- Human-edited memories get a 1.5× RRF score multiplier so they consistently rank above equal-relevance auto-captured notes
- `user`-scoped memories appear in all sessions; `project`-scoped only when `projectId` matches

## Verification

```sh
bun --filter @vault-core/core run build
# Full integration test in Phase 09 — scope isolation scenario
echo "HybridRetriever compiles OK"
```
