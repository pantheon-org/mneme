# P02T02 — vault-reader

## Phase

02 — storage-layer

## Goal

Implement `VaultReader` that parses a markdown vault file's YAML frontmatter and returns a typed `Memory` object. Detects human edits by comparing file mtime against `updated_at` and sets `human_edited_at` if drift is detected.

## File to create/modify

```
packages/core/src/storage/vault-reader.ts
```

## Implementation

```typescript
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import type { Memory } from '@vault-core/types'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/

export class VaultReader {
  read(filePath: string): Memory {
    const raw = readFileSync(filePath, 'utf-8')
    const match = raw.match(FRONTMATTER_RE)
    if (!match) throw new Error(`No frontmatter in: ${filePath}`)

    const fm = parseYaml(match[1]!) as Record<string, unknown>
    const content = match[2]!.trim()

    const memory: Memory = {
      id:               fm['id'] as string,
      tier:             fm['tier'] as Memory['tier'],
      scope:            fm['scope'] as Memory['scope'],
      category:         fm['category'] as Memory['category'],
      status:           fm['status'] as Memory['status'],
      summary:          fm['summary'] as string,
      content,
      tags:             (fm['tags'] as string[]) ?? [],
      projectId:        (fm['project_id'] as string | undefined) ?? undefined,
      strength:         fm['strength'] as number,
      importanceScore:  fm['importance_score'] as number,
      frequencyCount:   fm['frequency_count'] as number,
      sourceType:       fm['source_type'] as Memory['sourceType'],
      sourceHarness:    fm['source_harness'] as string | undefined,
      sourceSession:    fm['source_session'] as string | undefined,
      capturedAt:       fm['captured_at'] as string,
      updatedAt:        fm['updated_at'] as string,
      humanEditedAt:    (fm['human_edited_at'] as string | null) ?? null,
      filePath,
    }

    // Human-edit detection
    const mtime = statSync(filePath).mtimeMs
    const updatedMs = new Date(memory.updatedAt).getTime()
    if (mtime > updatedMs + 1000 && memory.humanEditedAt == null) {
      memory.humanEditedAt = new Date(mtime).toISOString()
      // Write back only the frontmatter field to avoid overwriting content
      this.patchHumanEditedAt(filePath, raw, memory.humanEditedAt)
    }

    return memory
  }

  private patchHumanEditedAt(filePath: string, raw: string, value: string): void {
    const patched = raw.replace(
      /human_edited_at: null/,
      `human_edited_at: '${value}'`
    )
    writeFileSync(filePath, patched, 'utf-8')
  }
}
```

## Notes

- `patchHumanEditedAt` uses a targeted string replacement rather than a full re-render to avoid touching human-written content
- 1000ms tolerance on mtime comparison accounts for filesystem timestamp granularity
- `noUncheckedIndexedAccess` means all `match[n]` accesses require `!` assertion — add them

## Verification

```sh
bun --filter @vault-core/core run build
# Write a test file, read it back, assert round-trip
bun -e "
  const { VaultWriter } = require('./packages/core/dist/storage/vault-writer.js')
  const { VaultReader } = require('./packages/core/dist/storage/vault-reader.js')
  const mem = { id: 'mem_rt01', tier: 'episodic', scope: 'user', category: 'decision',
    status: 'active', summary: 'Round-trip test', content: '## Round trip',
    tags: ['test'], strength: 0.8, importanceScore: 0.7, frequencyCount: 1,
    sourceType: 'cli', capturedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), humanEditedAt: null, filePath: '' }
  const w = new VaultWriter('/tmp/rtvault')
  mem.filePath = '/tmp/rtvault/01-episodic/rt01.md'
  w.write(mem)
  const r = new VaultReader()
  const result = r.read(mem.filePath)
  console.assert(result.id === mem.id, 'id mismatch')
  console.assert(result.summary === mem.summary, 'summary mismatch')
  console.log('round-trip OK')
"
```
