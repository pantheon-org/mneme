# P02T01 — vault-writer

## Phase

02 — storage-layer

## Goal

Implement `VaultWriter` that takes a `Memory` object and writes it as a markdown file with YAML frontmatter to the correct directory in the Obsidian vault. Writes must be atomic.

## File to create/modify

```
packages/core/src/storage/vault-writer.ts
```

## Implementation

```typescript
import { writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import type { Memory } from '@vault-core/types'

export class VaultWriter {
  constructor(private readonly vaultPath: string) {}

  write(memory: Memory): void {
    const filePath = this.resolveFilePath(memory)
    const content = this.renderMarkdown(memory)
    mkdirSync(dirname(filePath), { recursive: true })
    const tmp = filePath + '.tmp'
    writeFileSync(tmp, content, 'utf-8')
    renameSync(tmp, filePath)           // atomic on same filesystem
  }

  private resolveFilePath(memory: Memory): string {
    const dirMap: Record<string, string> = {
      episodic:   '01-episodic',
      semantic:   '02-semantic',
      procedural: '03-procedural',
    }
    const dir = dirMap[memory.tier] ?? '00-inbox'
    const slug = memory.id.replace('mem_', '')
    return join(this.vaultPath, dir, `${slug}.md`)
  }

  private renderMarkdown(memory: Memory): string {
    const frontmatter = {
      id: memory.id,
      tier: memory.tier,
      scope: memory.scope,
      category: memory.category,
      status: memory.status,
      summary: memory.summary,
      tags: memory.tags,
      project_id: memory.projectId ?? null,
      strength: memory.strength,
      importance_score: memory.importanceScore,
      frequency_count: memory.frequencyCount,
      source_type: memory.sourceType,
      source_harness: memory.sourceHarness ?? null,
      source_session: memory.sourceSession ?? null,
      captured_at: memory.capturedAt,
      updated_at: memory.updatedAt,
      human_edited_at: memory.humanEditedAt ?? null,
    }
    return `---\n${yamlStringify(frontmatter)}---\n\n${memory.content}\n`
  }
}
```

## Notes

- Atomic write via `.tmp` + `rename` prevents partial files visible to vault readers
- Use the `yaml` package (not `js-yaml`) — it has better TypeScript types
- `filePath` is stored in the `Memory` object (set by the writer before writing)

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  const { VaultWriter } = require('./packages/core/dist/storage/vault-writer.js')
  const w = new VaultWriter('/tmp/test-vault')
  w.write({ id: 'mem_test01', tier: 'episodic', scope: 'user', category: 'decision',
    status: 'active', summary: 'Test', content: '## Test', tags: [], strength: 0.8,
    importanceScore: 0.7, frequencyCount: 1, sourceType: 'cli',
    capturedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    filePath: '' })
  console.log(require('fs').readFileSync('/tmp/test-vault/01-episodic/test01.md', 'utf-8'))
"
```
