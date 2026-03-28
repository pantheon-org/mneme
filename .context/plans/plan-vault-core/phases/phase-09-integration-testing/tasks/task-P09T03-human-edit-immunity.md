# P09T03 — human-edit-immunity

## Phase

09 — integration-testing

## Goal

Test scenario 3: write a semantic note, modify its file directly (simulating an Obsidian edit), read it back, verify that `human_edited_at` is set and the note is immune to automated reconsolidation.

## File to create/modify

```
packages/core/src/__tests__/integration/human-edit-immunity.test.ts
```

## Implementation

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, rmSync, appendFileSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { VaultWriter } from '../../storage/vault-writer.js'
import { VaultReader } from '../../storage/vault-reader.js'
import type { Memory } from '@vault-core/types'

describe('human edit immunity', () => {
  let tmpVault: string
  let writer: VaultWriter
  let reader: VaultReader
  let filePath: string

  beforeAll(() => {
    tmpVault = mkdtempSync(join(tmpdir(), 'vault-edit-'))
    writer = new VaultWriter(tmpVault)
    reader = new VaultReader()

    const mem: Memory = {
      id: 'mem_edittest',
      tier: 'semantic', scope: 'user', category: 'constraint', status: 'active',
      summary: 'Never use var in TypeScript', content: '## Constraint\n\nAlways use const/let.',
      tags: ['typescript'], strength: 1.0, importanceScore: 0.9, frequencyCount: 1,
      sourceType: 'cli',
      capturedAt: new Date(Date.now() - 60_000).toISOString(),
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
      humanEditedAt: null, filePath: '',
    }
    filePath = join(tmpVault, '02-semantic', 'edittest.md')
    mem.filePath = filePath
    writer.write(mem)
  })

  afterAll(() => rmSync(tmpVault, { recursive: true, force: true }))

  it('detects human edit and sets human_edited_at', () => {
    // Simulate Obsidian edit: append content and bump mtime
    appendFileSync(filePath, '\n\n_Edited by human_', 'utf-8')
    const now = new Date()
    utimesSync(filePath, now, now)  // force mtime > updated_at

    const result = reader.read(filePath)
    expect(result.humanEditedAt).not.toBeNull()
    expect(result.humanEditedAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('human_edited_at is persisted on re-read', () => {
    const result = reader.read(filePath)
    expect(result.humanEditedAt).not.toBeNull()
  })
})
```

## Notes

- `utimesSync` is used to set the file's mtime to "now", which must be > `updated_at` stored in frontmatter (we set `updated_at` to 60s ago)
- The 1000ms tolerance in `VaultReader` ensures clock skew does not cause false positives

## Verification

```sh
bun test
# human-edit-immunity.test.ts must pass
```
