# P02T03 — sqlite-index

## Phase

02 — storage-layer

## Goal

Implement `IndexDB` — the SQLite-backed search index with three tables: `memories` (metadata), `memories_fts` (FTS5 BM25), and `memory_vecs` (vector KNN via sqlite-vec). Supports upsert, BM25 search, KNN search, and full rebuild.

## File to create/modify

```
packages/core/src/storage/index-db.ts
```

## Implementation

```typescript
import { Database } from 'bun:sqlite'
import type { Memory } from '@vault-core/types'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id           TEXT PRIMARY KEY,
  tier         TEXT NOT NULL,
  scope        TEXT NOT NULL,
  status       TEXT NOT NULL,
  category     TEXT NOT NULL,
  summary      TEXT NOT NULL,
  content      TEXT NOT NULL,
  tags         TEXT NOT NULL,
  project_id   TEXT,
  strength     REAL NOT NULL,
  file_path    TEXT NOT NULL,
  captured_at  TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  mtime_ns     INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  summary, content, tags,
  content=memories, content_rowid=rowid
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_vecs USING vec0(
  id TEXT PRIMARY KEY,
  embedding float[768]
);
`

export interface BM25Result { id: string; rank: number }
export interface VecResult  { id: string; distance: number }

export class IndexDB {
  private db: InstanceType<typeof Database>

  constructor(indexPath: string) {
    this.db = new Database(indexPath)
    this.db.loadExtension('vec0')   // sqlite-vec native extension
    this.db.run(SCHEMA)
  }

  upsert(memory: Memory): void {
    this.db.run(`
      INSERT OR REPLACE INTO memories
        (id, tier, scope, status, category, summary, content, tags,
         project_id, strength, file_path, captured_at, updated_at, mtime_ns)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `,
      memory.id, memory.tier, memory.scope, memory.status, memory.category,
      memory.summary, memory.content, JSON.stringify(memory.tags),
      memory.projectId ?? null, memory.strength, memory.filePath,
      memory.capturedAt, memory.updatedAt,
      Date.now() * 1_000_000   // nanoseconds
    )
    // Update FTS index
    this.db.run(`INSERT OR REPLACE INTO memories_fts(rowid, summary, content, tags)
      SELECT rowid, summary, content, tags FROM memories WHERE id = ?`, memory.id)
  }

  upsertVector(id: string, embedding: number[]): void {
    this.db.run(`INSERT OR REPLACE INTO memory_vecs(id, embedding) VALUES (?, ?)`,
      id, new Float32Array(embedding)
    )
  }

  bm25Search(query: string, limit = 30): BM25Result[] {
    return this.db.query(`
      SELECT memories.id, memories_fts.rank
      FROM memories_fts
      JOIN memories ON memories.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?
      ORDER BY memories_fts.rank
      LIMIT ?
    `).all(query, limit) as BM25Result[]
  }

  knnSearch(embedding: number[], limit = 30): VecResult[] {
    return this.db.query(`
      SELECT id, distance FROM memory_vecs
      WHERE embedding MATCH ? AND k = ?
      ORDER BY distance
    `).all(new Float32Array(embedding), limit) as VecResult[]
  }

  getById(id: string): Memory {
    const row = this.db.query(`SELECT * FROM memories WHERE id = ?`).get(id)
    if (!row) throw new Error(`Memory not found: ${id}`)
    return row as unknown as Memory
  }

  getByTier(tier: string, projectId?: string): Memory[] {
    if (projectId) {
      return this.db.query(
        `SELECT * FROM memories WHERE tier = ? AND status = 'active' AND (scope = 'user' OR project_id = ?)`
      ).all(tier, projectId) as unknown as Memory[]
    }
    return this.db.query(
      `SELECT * FROM memories WHERE tier = ? AND status = 'active'`
    ).all(tier) as unknown as Memory[]
  }

  updateStatus(id: string, status: string): void {
    this.db.run(`UPDATE memories SET status = ? WHERE id = ?`, status, id)
  }
}
```

## Notes

- `bun:sqlite` is built into Bun — no npm package needed
- `sqlite-vec` is a native extension loaded via `db.loadExtension('vec0')` — install it with `bun add sqlite-vec` and ensure the `.so`/`.dylib` is available
- `bun:sqlite` API: `db.run()` for mutations, `db.query().all()` for reads — no `.prepare().run()` pattern (that is `better-sqlite3` API)
- Vector dimension (768) is hardcoded to match the default `nomic-embed` model; a full reindex is required if the model changes
- The vault is the source of truth — the SQLite index is always rebuildable via `vault-cli index --full`

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  import { IndexDB } from './packages/core/src/storage/index-db.ts'
  const db = new IndexDB('/tmp/test-index.db')
  db.upsert({ id: 'mem_t01', tier: 'episodic', scope: 'user', status: 'active',
    category: 'decision', summary: 'SQLite test memory', content: 'Testing BM25',
    tags: ['test'], strength: 0.8, filePath: '/tmp/fake.md',
    capturedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  const results = db.bm25Search('SQLite test')
  console.assert(results.length > 0, 'BM25 returned no results')
  console.log('IndexDB OK:', results)
"
```
