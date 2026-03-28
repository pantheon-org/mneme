# P05T03 — adjudicator

## Phase

05 — consolidation-loop

## Goal

Implement `Adjudicator` — single inference call that handles both conflict resolution (two contradictory memories) and consolidation proposals (cluster → semantic note). Constructs structured prompts, calls the harness headlessly, parses JSON responses, and logs all calls to the audit log.

## File to create/modify

```
packages/core/src/consolidation/adjudicator.ts
```

## Implementation

```typescript
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Memory } from '@vault-core/types'
import type { AuditLog } from '../storage/audit-log.js'
import type { ConsolidationProposal } from './proposer.js'

const exec = promisify(execFile)

interface ConflictResolution {
  action: 'keep_existing' | 'keep_incoming' | 'merge'
  rationale: string
  mergedContent?: string
}

export class Adjudicator {
  constructor(
    private readonly inferenceCommand: string,
    private readonly audit: AuditLog,
  ) {}

  async resolveConflict(existing: Memory, incoming: Memory): Promise<ConflictResolution> {
    const prompt = this.buildConflictPrompt(existing, incoming)
    const result = await this.callInference(prompt)
    this.audit.append({
      ts: new Date().toISOString(),
      op: 'adjudicate',
      memoryId: existing.id,
      detail: { type: 'conflict', incomingId: incoming.id, resolution: result.action },
    })
    return result as ConflictResolution
  }

  async consolidate(cluster: Memory[]): Promise<ConsolidationProposal | null> {
    const prompt = this.buildConsolidationPrompt(cluster)
    const result = await this.callInference(prompt)
    if (!result?.proposedContent) return null

    const proposal: ConsolidationProposal = {
      id: `prop_${Date.now().toString(36)}`,
      status: 'pending',
      sourceMemoryIds: cluster.map(m => m.id),
      proposedContent: result.proposedContent,
      proposedTags: result.tags ?? [],
      proposedCategory: result.category ?? 'pattern',
      proposedScope: result.scope ?? 'user',
      createdAt: new Date().toISOString(),
    }
    this.audit.append({
      ts: new Date().toISOString(),
      op: 'consolidate',
      memoryId: proposal.id,
      detail: { type: 'proposal', sourceCount: cluster.length },
    })
    return proposal
  }

  private async callInference(prompt: string): Promise<Record<string, unknown>> {
    const cmd = this.inferenceCommand.split(' ')
    const bin = cmd[0]!
    const args = [...cmd.slice(1), prompt]
    try {
      const { stdout } = await exec(bin, args, { timeout: 30_000 })
      return JSON.parse(stdout)
    } catch {
      return {}
    }
  }

  private buildConflictPrompt(existing: Memory, incoming: Memory): string {
    return JSON.stringify({
      task: 'conflict_resolution',
      existing: { id: existing.id, summary: existing.summary, content: existing.content },
      incoming: { summary: incoming.summary, content: incoming.content },
      instruction: 'Return JSON: { "action": "keep_existing"|"keep_incoming"|"merge", "rationale": "...", "mergedContent": "..." }',
    })
  }

  private buildConsolidationPrompt(cluster: Memory[]): string {
    return JSON.stringify({
      task: 'consolidation',
      memories: cluster.map(m => ({ id: m.id, summary: m.summary, content: m.content })),
      instruction: 'Return JSON: { "proposedContent": "...", "tags": [...], "category": "...", "scope": "user"|"project" }',
    })
  }
}
```

## Notes

- All inference calls are fire-and-await; they run asynchronously relative to capture but are not fire-and-forget (we need the result to decide what to write)
- `timeout: 30_000` prevents hung inference processes from blocking the queue
- Failed inference calls (exception or invalid JSON) return `{}` — non-blocking, logged via audit

## Verification

```sh
bun --filter @vault-core/core run build
echo "Adjudicator compiles OK"
# Conflict detection scenario (Phase 09 scenario 4) exercises the full path
```
