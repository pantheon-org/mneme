import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import type { Memory, MemoryTier, MemoryStatus } from "@vault-core/types"

const SCHEMA = /* sql */ `
  CREATE TABLE IF NOT EXISTS memories (
    id          TEXT PRIMARY KEY,
    tier        TEXT NOT NULL,
    scope       TEXT NOT NULL,
    status      TEXT NOT NULL,
    category    TEXT NOT NULL,
    summary     TEXT NOT NULL,
    content     TEXT NOT NULL,
    tags        TEXT NOT NULL DEFAULT '[]',
    project_id  TEXT,
    strength    REAL NOT NULL DEFAULT 1.0,
    file_path   TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    mtime_ns    INTEGER NOT NULL DEFAULT 0
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    summary,
    content,
    tags,
    content=memories,
    content_rowid=rowid
  );

  CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, summary, content, tags)
    VALUES (new.rowid, new.summary, new.content, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, summary, content, tags)
    VALUES ('delete', old.rowid, old.summary, old.content, old.tags);
    INSERT INTO memories_fts(rowid, summary, content, tags)
    VALUES (new.rowid, new.summary, new.content, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, summary, content, tags)
    VALUES ('delete', old.rowid, old.summary, old.content, old.tags);
  END;
`

export interface BM25Result {
  id: string
  summary: string
  rank: number
}

export interface VecResult {
  id: string
  distance: number
}

export class IndexDB {
  private readonly db: Database

  constructor(indexPath: string) {
    mkdirSync(dirname(indexPath), { recursive: true })
    this.db = new Database(indexPath)
    this.db.run("PRAGMA journal_mode=WAL")
    this.db.run(SCHEMA)
    this.initVec()
  }

  private initVec(): void {
    try {
      // dynamic import not available synchronously; use Bun.plugin or preloaded extension
      this.db.run(`
        CREATE TABLE IF NOT EXISTS memory_vecs (
          id        TEXT PRIMARY KEY,
          embedding TEXT NOT NULL DEFAULT '[]'
        )
      `)
    } catch {
      // vec table creation failed; vector search unavailable
    }
  }

  upsert(memory: Memory): void {
    this.db
      .prepare(/* sql */ `
        INSERT INTO memories
          (id, tier, scope, status, category, summary, content, tags,
           project_id, strength, file_path, captured_at, updated_at, mtime_ns)
        VALUES
          ($id, $tier, $scope, $status, $category, $summary, $content, $tags,
           $project_id, $strength, $file_path, $captured_at, $updated_at, $mtime_ns)
        ON CONFLICT(id) DO UPDATE SET
          tier        = excluded.tier,
          scope       = excluded.scope,
          status      = excluded.status,
          category    = excluded.category,
          summary     = excluded.summary,
          content     = excluded.content,
          tags        = excluded.tags,
          project_id  = excluded.project_id,
          strength    = excluded.strength,
          file_path   = excluded.file_path,
          captured_at = excluded.captured_at,
          updated_at  = excluded.updated_at,
          mtime_ns    = excluded.mtime_ns
      `)
      .run({
        $id: memory.id,
        $tier: memory.tier,
        $scope: memory.scope,
        $status: memory.status,
        $category: memory.category,
        $summary: memory.summary,
        $content: memory.content,
        $tags: JSON.stringify(memory.tags),
        $project_id: memory.projectId ?? null,
        $strength: memory.strength,
        $file_path: memory.filePath,
        $captured_at: memory.capturedAt,
        $updated_at: memory.updatedAt,
        $mtime_ns: 0,
      })
  }

  upsertVector(id: string, embedding: number[]): void {
    try {
      this.db
        .prepare(/* sql */ `
          INSERT INTO memory_vecs (id, embedding)
          VALUES ($id, $embedding)
          ON CONFLICT(id) DO UPDATE SET embedding = excluded.embedding
        `)
        .run({ $id: id, $embedding: JSON.stringify(embedding) })
    } catch {
      // vec extension unavailable
    }
  }

  bm25Search(query: string, limit = 30): BM25Result[] {
    return this.db
      .prepare(/* sql */ `
        SELECT m.id, m.summary, fts.rank
        FROM memories_fts fts
        JOIN memories m ON m.rowid = fts.rowid
        WHERE memories_fts MATCH ?
        ORDER BY fts.rank
        LIMIT ?
      `)
      .all(query, limit) as BM25Result[]
  }

  knnSearch(embedding: number[], limit = 30): VecResult[] {
    try {
      return this.db
        .prepare(/* sql */ `
          SELECT id, distance
          FROM memory_vecs
          WHERE embedding MATCH ?
          ORDER BY distance
          LIMIT ?
        `)
        .all(JSON.stringify(embedding), limit) as VecResult[]
    } catch {
      return []
    }
  }

  getById(id: string): Memory | null {
    const row = this.db
      .prepare("SELECT * FROM memories WHERE id = ?")
      .get(id) as Record<string, unknown> | null
    return row ? rowToMemory(row) : null
  }

  getByTier(tier: MemoryTier, projectId?: string): Memory[] {
    const rows = projectId
      ? (this.db
          .prepare("SELECT * FROM memories WHERE tier = ? AND project_id = ?")
          .all(tier, projectId) as Record<string, unknown>[])
      : (this.db
          .prepare("SELECT * FROM memories WHERE tier = ?")
          .all(tier) as Record<string, unknown>[])
    return rows.map(rowToMemory)
  }

  updateStatus(id: string, status: MemoryStatus): void {
    this.db
      .prepare("UPDATE memories SET status = ? WHERE id = ?")
      .run(status, id)
  }
}

function rowToMemory(row: Record<string, unknown>): Memory {
  const mem: Memory = {
    id: row["id"] as string,
    tier: row["tier"] as Memory["tier"],
    scope: row["scope"] as Memory["scope"],
    category: row["category"] as Memory["category"],
    status: row["status"] as Memory["status"],
    summary: row["summary"] as string,
    content: row["content"] as string,
    tags: JSON.parse(row["tags"] as string) as string[],
    strength: row["strength"] as number,
    importanceScore: 0,
    frequencyCount: 0,
    sourceType: "manual",
    capturedAt: row["captured_at"] as string,
    updatedAt: row["updated_at"] as string,
    humanEditedAt: null,
    filePath: row["file_path"] as string,
  }
  const projectId = row["project_id"] as string | null
  if (projectId !== null) mem.projectId = projectId
  return mem
}
