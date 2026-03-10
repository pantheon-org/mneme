# P09T05 — consolidation-proposal

## Phase

09 — integration-testing

## Goal

Test scenario 5: capture 5 episodic memories about the same topic, run `vault-cli consolidate`, verify a proposal is written to `consolidation-proposals.md`.

## File to create/modify

```
packages/core/src/__tests__/integration/consolidation-proposal.test.ts
```

## Implementation

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { VaultWriter } from '../../storage/vault-writer.js'
import { IndexDB } from '../../storage/index-db.js'
import { Proposer } from '../../consolidation/proposer.js'
import { ApprovalInterface } from '../../consolidation/approval.js'
import type { Memory } from '@vault-core/types'

const CLUSTER_MEMORIES = [
  'bun:sqlite does not support async/await — all calls must be synchronous',
  'bun sqlite error: cannot use await inside sqlite transaction',
  'bun database calls need to be sync — async throws in sqlite context',
  'tried async sqlite in bun and got TypeError — synchronous only',
  'confirmed: bun:sqlite is synchronous-only API, no promise support',
]

describe('consolidation proposal', () => {
  let tmpVault: string
  let db: IndexDB
  let writer: VaultWriter
  let adjudicatorMock: any

  beforeAll(async () => {
    tmpVault = mkdtempSync(join(tmpdir(), 'vault-consolidate-'))
    db = new IndexDB(join(tmpVault, 'index.db'))
    writer = new VaultWriter(tmpVault)

    const embedding = (seed: number) => Array.from({ length: 768 }, (_, i) => Math.sin(seed + i * 0.01))

    for (let i = 0; i < CLUSTER_MEMORIES.length; i++) {
      const mem: Memory = {
        id: `mem_bun${i}`,
        tier: 'episodic', scope: 'user', category: 'bugfix', status: 'active',
        summary: CLUSTER_MEMORIES[i]!, content: CLUSTER_MEMORIES[i]!,
        tags: ['bun', 'sqlite'], strength: 0.75, importanceScore: 0.7, frequencyCount: 1,
        sourceType: 'cli',
        capturedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        humanEditedAt: null, filePath: '',
        embedding: embedding(i),   // similar embeddings within cluster threshold
      }
      writer.write(mem)
      db.upsert(mem)
      db.upsertVector(mem.id, mem.embedding!)
    }

    // Mock adjudicator to avoid needing a live harness
    adjudicatorMock = {
      consolidate: async (cluster: Memory[]) => ({
        id: `prop_test`,
        status: 'pending',
        sourceMemoryIds: cluster.map(m => m.id),
        proposedContent: 'bun:sqlite requires synchronous API — async/await throws.',
        proposedTags: ['bun', 'sqlite', 'gotcha'],
        proposedCategory: 'constraint',
        proposedScope: 'user',
        createdAt: new Date().toISOString(),
      })
    }
  })

  afterAll(() => rmSync(tmpVault, { recursive: true, force: true }))

  it('produces a consolidation proposal for the bun:sqlite cluster', async () => {
    const proposer = new Proposer(db, adjudicatorMock)
    const proposals = await proposer.propose()
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals[0]!.proposedContent).toContain('synchronous')
    expect(proposals[0]!.sourceMemoryIds.length).toBeGreaterThanOrEqual(3)
  })

  it('writes proposals to consolidation-proposals.md', async () => {
    const proposer = new Proposer(db, adjudicatorMock)
    const proposals = await proposer.propose()
    const approval = new ApprovalInterface(tmpVault, writer, db, { append: () => {} } as any)
    approval.renderProposals(proposals)

    const proposalFile = join(tmpVault, '00-inbox', 'consolidation-proposals.md')
    expect(existsSync(proposalFile)).toBe(true)
    const content = readFileSync(proposalFile, 'utf-8')
    expect(content).toContain('synchronous')
  })
})
```

## Notes

- Embedding similarity must be close enough to fall below `CLUSTER_THRESHOLD = 0.3` cosine distance — use `Math.sin(seed + i * 0.01)` to produce similar-but-distinct vectors
- The adjudicator is mocked to avoid requiring a live AI harness in CI
- Test verifies both the in-memory proposal list and the written markdown file

## Verification

```sh
bun test
# consolidation-proposal.test.ts must pass
```
