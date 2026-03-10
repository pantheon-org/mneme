# P02T04 — audit-log

## Phase

02 — storage-layer

## Goal

Implement `AuditLog` — an append-only JSONL file at `~/.vault-core/audit.jsonl`. Every operation (capture, update, reconsolidation, adjudication) appends one line. The file is never modified, only appended to.

## File to create/modify

```
packages/core/src/storage/audit-log.ts
```

## Implementation

```typescript
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { AuditEntry } from '@vault-core/types'

export class AuditLog {
  constructor(private readonly logPath: string) {
    mkdirSync(dirname(logPath), { recursive: true })
  }

  append(entry: AuditEntry): void {
    appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf-8')
  }
}
```

`AuditEntry` interface (in `@vault-core/types`):
```typescript
export interface AuditEntry {
  ts: string                    // ISO 8601
  op: 'capture' | 'update' | 'supersede' | 'archive' | 'adjudicate' | 'consolidate'
  memoryId: string
  sessionId?: string
  harness?: string
  detail?: Record<string, unknown>
}
```

## Notes

- `appendFileSync` is correct here — the audit log is intentionally synchronous and serialised; no data loss on crash mid-write
- Do not use a stream or buffer — each `append()` must flush immediately
- The audit log must survive process crashes; `appendFileSync` guarantees this

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  const { AuditLog } = require('./packages/core/dist/storage/audit-log.js')
  const log = new AuditLog('/tmp/test-audit.jsonl')
  log.append({ ts: new Date().toISOString(), op: 'capture', memoryId: 'mem_001' })
  log.append({ ts: new Date().toISOString(), op: 'update',  memoryId: 'mem_001' })
  const lines = require('fs').readFileSync('/tmp/test-audit.jsonl', 'utf-8').trim().split('\n')
  console.assert(lines.length === 2, 'expected 2 lines')
  console.log('AuditLog OK')
"
```
