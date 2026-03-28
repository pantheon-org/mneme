# P05T01 — proposer

## Phase

05 — consolidation-loop

## Goal

Implement `Proposer` — clusters episodic memories by cosine similarity, identifies clusters of ≥ 3 members, calls inference to produce a proposed semantic note for each cluster, and writes proposals to `~/.vault-core/consolidation-queue.jsonl` with status `pending`.

## File to create/modify

```
packages/core/src/consolidation/proposer.ts
```

## Implementation

```typescript
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Memory } from '@vault-core/types'
import type { IndexDB } from '../storage/index-db.js'
import type { Adjudicator } from './adjudicator.js'

const QUEUE_PATH = join(homedir(), '.vault-core', 'consolidation-queue.jsonl')
const CLUSTER_THRESHOLD = 0.3  // cosine distance < 0.3 = same cluster
const MIN_CLUSTER_SIZE = 3

export interface ConsolidationProposal {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  sourceMemoryIds: string[]
  proposedContent: string
  proposedTags: string[]
  proposedCategory: string
  proposedScope: string
  createdAt: string
}

export class Proposer {
  constructor(
    private readonly db: IndexDB,
    private readonly adjudicator: Adjudicator,
  ) {
    mkdirSync(join(homedir(), '.vault-core'), { recursive: true })
  }

  async propose(projectId?: string): Promise<ConsolidationProposal[]> {
    const episodic = this.db.getByTier('episodic', projectId)
    const clusters = this.clusterByEmbedding(episodic)
    const proposals: ConsolidationProposal[] = []

    for (const cluster of clusters) {
      if (cluster.length < MIN_CLUSTER_SIZE) continue

      const proposal = await this.adjudicator.consolidate(cluster)
      if (!proposal) continue

      appendFileSync(QUEUE_PATH, JSON.stringify(proposal) + '\n', 'utf-8')
      proposals.push(proposal)
    }

    return proposals
  }

  private clusterByEmbedding(memories: Memory[]): Memory[][] {
    const clusters: Memory[][] = []
    const assigned = new Set<string>()

    for (const mem of memories) {
      if (assigned.has(mem.id) || !mem.embedding) continue
      const cluster: Memory[] = [mem]
      assigned.add(mem.id)

      for (const other of memories) {
        if (assigned.has(other.id) || !other.embedding) continue
        const sim = cosineSimilarity(mem.embedding, other.embedding)
        if (1 - sim < CLUSTER_THRESHOLD) {
          cluster.push(other)
          assigned.add(other.id)
        }
      }

      clusters.push(cluster)
    }

    return clusters
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!; na += a[i]! ** 2; nb += b[i]! ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8)
}
```

## Notes

- `db.getByTier()` must be added to `IndexDB` — returns all `Memory` rows with `tier = 'episodic'` and `status = 'active'`
- Embeddings must be stored in the index (already handled in Phase 02 `upsertVector`)
- The greedy clustering algorithm (O(n²)) is acceptable for vaults up to ~10k episodic memories

## Verification

```sh
bun --filter @vault-core/core run build
echo "Proposer compiles OK"
# Full scenario test in Phase 09 (scenario 5 — consolidation proposal)
```
