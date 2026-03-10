# P05T02 — approval-interface

## Phase

05 — consolidation-loop

## Goal

Implement the approval interface: render pending proposals as a human-editable markdown file in `00-inbox/consolidation-proposals.md`; read back approved/rejected decisions; write approved proposals as semantic notes; mark source episodic memories as `superseded`.

## File to create/modify

```
packages/core/src/consolidation/proposer.ts  (extend with applyApproved())
packages/core/src/consolidation/approval.ts  (new file)
```

## Implementation

`packages/core/src/consolidation/approval.ts`:
```typescript
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { Memory } from '@vault-core/types'
import type { VaultWriter } from '../storage/vault-writer.js'
import type { IndexDB } from '../storage/index-db.js'
import type { AuditLog } from '../storage/audit-log.js'
import type { ConsolidationProposal } from './proposer.js'

export class ApprovalInterface {
  constructor(
    private readonly vaultPath: string,
    private readonly writer: VaultWriter,
    private readonly db: IndexDB,
    private readonly audit: AuditLog,
  ) {}

  renderProposals(proposals: ConsolidationProposal[]): void {
    const inboxPath = join(this.vaultPath, '00-inbox', 'consolidation-proposals.md')
    let content = '# Consolidation Proposals\n\n'
    for (const p of proposals) {
      content += `---\nproposal_id: ${p.id}\nstatus: pending\nsource_memories:\n`
      for (const id of p.sourceMemoryIds) content += `  - ${id}\n`
      content += `---\n\n## Proposed: ${p.proposedContent.slice(0, 80)}\n\n`
      content += `${p.proposedContent}\n\n`
      content += `**Tags**: ${p.proposedTags.join(', ')}\n`
      content += `**Category**: ${p.proposedCategory}\n\n`
    }
    writeFileSync(inboxPath, content, 'utf-8')
  }

  applyApproved(): { approved: number; rejected: number } {
    const inboxPath = join(this.vaultPath, '00-inbox', 'consolidation-proposals.md')
    if (!existsSync(inboxPath)) return { approved: 0, rejected: 0 }

    const raw = readFileSync(inboxPath, 'utf-8')
    const sections = raw.split(/^---$/m).filter(Boolean)
    let approved = 0, rejected = 0

    for (let i = 0; i + 1 < sections.length; i += 2) {
      const fm = parseYaml(sections[i]!.trim()) as Record<string, unknown>
      if (fm['status'] === 'approved') {
        this.writeSemanticNote(fm)
        this.markSuperseded(fm['source_memories'] as string[])
        approved++
      } else if (fm['status'] === 'rejected') {
        this.audit.append({ ts: new Date().toISOString(), op: 'consolidate',
          memoryId: fm['proposal_id'] as string,
          detail: { decision: 'rejected', sourceMemories: fm['source_memories'] } })
        rejected++
      }
    }

    // Clear after processing
    writeFileSync(inboxPath, '', 'utf-8')
    return { approved, rejected }
  }

  private writeSemanticNote(fm: Record<string, unknown>): void {
    const memory: Memory = {
      id: `mem_${Date.now().toString(36)}`,
      tier: 'semantic',
      scope: 'user',
      category: (fm['category'] as Memory['category']) ?? 'pattern',
      status: 'active',
      summary: String(fm['summary'] ?? '').slice(0, 120),
      content: String(fm['content'] ?? ''),
      tags: (fm['tags'] as string[]) ?? [],
      strength: 1.0,   // semantic notes have maximum strength
      importanceScore: 0.9,
      frequencyCount: 1,
      sourceType: 'cli',
      capturedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      humanEditedAt: null,
      filePath: '',
    }
    this.writer.write(memory)
    this.db.upsert(memory)
  }

  private markSuperseded(ids: string[]): void {
    for (const id of ids) {
      this.db.updateStatus(id, 'superseded')
      this.audit.append({ ts: new Date().toISOString(), op: 'supersede', memoryId: id })
    }
  }
}
```

## Notes

- `db.updateStatus()` must be added to `IndexDB` — updates the `status` column for a given memory ID
- Source episodic memories are marked `superseded` in the index; the vault files are NOT deleted
- Rejected proposals are logged to audit trail but not written anywhere else

## Verification

```sh
bun --filter @vault-core/core run build
echo "ApprovalInterface compiles OK"
# Scenario 5 in Phase 09 tests the full consolidation → approval flow
```
