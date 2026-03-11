import { Database } from "bun:sqlite";
import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import type { Memory, MemoryStatus, MemoryTier } from "@vault-core/types";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS memories (
    id               TEXT PRIMARY KEY,
    tier             TEXT NOT NULL,
    scope            TEXT NOT NULL,
    status           TEXT NOT NULL,
    category         TEXT NOT NULL,
    summary          TEXT NOT NULL,
    content          TEXT NOT NULL,
    tags             TEXT NOT NULL DEFAULT '[]',
    project_id       TEXT,
    strength         REAL NOT NULL DEFAULT 1.0,
    importance_score REAL NOT NULL DEFAULT 0,
    frequency_count  INTEGER NOT NULL DEFAULT 0,
    source_type      TEXT NOT NULL DEFAULT 'manual',
    human_edited_at  TEXT,
    file_path        TEXT NOT NULL,
    captured_at      TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    mtime_ns         INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    id,
    summary,
    content,
    tags
  )`,
];

export interface BM25Result {
  id: string;
  summary: string;
  rank: number;
}

export interface VecResult {
  id: string;
  distance: number;
}

export class IndexDB {
  private readonly db: Database;
  private vecAvailable = false;

  constructor(indexPath: string) {
    mkdirSync(dirname(indexPath), { recursive: true });
    this.db = new Database(indexPath);
    this.db.run("PRAGMA journal_mode=WAL");
    for (const stmt of STATEMENTS) {
      this.db.run(stmt);
    }
    this.initVec();
    this.migrateSchema();
  }

  private initVec(): void {
    try {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS memory_vecs (
          id        TEXT PRIMARY KEY,
          vec       BLOB NOT NULL
        )
      `);
      this.vecAvailable = true;
    } catch {
      this.vecAvailable = false;
    }
  }

  private migrateSchema(): void {
    const existing = (
      this.db.prepare("PRAGMA table_info(memories)").all() as { name: string }[]
    ).map((r) => r.name);
    const toAdd: [string, string][] = [
      ["importance_score", "REAL NOT NULL DEFAULT 0"],
      ["frequency_count", "INTEGER NOT NULL DEFAULT 0"],
      ["source_type", "TEXT NOT NULL DEFAULT 'manual'"],
      ["human_edited_at", "TEXT"],
    ];
    for (const [col, def] of toAdd) {
      if (!existing.includes(col)) {
        this.db.run(`ALTER TABLE memories ADD COLUMN ${col} ${def}`);
      }
    }
  }

  upsert(memory: Memory): void {
    let mtimeNs = 0;
    if (memory.filePath) {
      try {
        mtimeNs = Number(statSync(memory.filePath).mtimeMs) * 1_000_000;
      } catch {
        mtimeNs = 0;
      }
    }

    this.db
      .prepare(`
        INSERT INTO memories
          (id, tier, scope, status, category, summary, content, tags,
           project_id, strength, importance_score, frequency_count, source_type,
           human_edited_at, file_path, captured_at, updated_at, mtime_ns)
        VALUES
          ($id, $tier, $scope, $status, $category, $summary, $content, $tags,
           $project_id, $strength, $importance_score, $frequency_count, $source_type,
           $human_edited_at, $file_path, $captured_at, $updated_at, $mtime_ns)
        ON CONFLICT(id) DO UPDATE SET
          tier             = excluded.tier,
          scope            = excluded.scope,
          status           = excluded.status,
          category         = excluded.category,
          summary          = excluded.summary,
          content          = excluded.content,
          tags             = excluded.tags,
          project_id       = excluded.project_id,
          strength         = excluded.strength,
          importance_score = excluded.importance_score,
          frequency_count  = excluded.frequency_count,
          source_type      = excluded.source_type,
          human_edited_at  = excluded.human_edited_at,
          file_path        = excluded.file_path,
          captured_at      = excluded.captured_at,
          updated_at       = excluded.updated_at,
          mtime_ns         = excluded.mtime_ns
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
        $importance_score: memory.importanceScore,
        $frequency_count: memory.frequencyCount,
        $source_type: memory.sourceType,
        $human_edited_at: memory.humanEditedAt ?? null,
        $file_path: memory.filePath,
        $captured_at: memory.capturedAt,
        $updated_at: memory.updatedAt,
        $mtime_ns: mtimeNs,
      });

    this.db.prepare(`DELETE FROM memories_fts WHERE id = ?`).run(memory.id);
    this.db
      .prepare(`INSERT INTO memories_fts(id, summary, content, tags) VALUES (?, ?, ?, ?)`)
      .run(memory.id, memory.summary, memory.content, JSON.stringify(memory.tags));
  }

  upsertVector(id: string, embedding: number[]): void {
    if (!this.vecAvailable) return;
    try {
      const buf = Buffer.from(new Float32Array(embedding).buffer);
      this.db
        .prepare(`
          INSERT INTO memory_vecs (id, vec)
          VALUES ($id, $vec)
          ON CONFLICT(id) DO UPDATE SET vec = excluded.vec
        `)
        .run({ $id: id, $vec: buf });
    } catch {
      this.vecAvailable = false;
    }
  }

  bm25Search(query: string, limit = 30): BM25Result[] {
    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.replace(/['"*^(){}[\]:]/g, ""))
      .filter(Boolean)
      .join(" OR ");
    if (!ftsQuery) return [];
    try {
      return this.db
        .prepare(`
          SELECT fts.id, fts.summary, fts.rank
          FROM memories_fts fts
          WHERE memories_fts MATCH ?
          ORDER BY fts.rank
          LIMIT ?
        `)
        .all(ftsQuery, limit) as BM25Result[];
    } catch {
      return [];
    }
  }

  knnSearch(embedding: number[], limit = 30): VecResult[] {
    if (!this.vecAvailable) return [];
    try {
      const queryBuf = Buffer.from(new Float32Array(embedding).buffer);
      const rows = this.db.prepare(`SELECT id, vec FROM memory_vecs`).all() as {
        id: string;
        vec: Buffer;
      }[];

      const queryVec = new Float32Array(queryBuf.buffer);
      const results: VecResult[] = rows.map(({ id, vec }) => {
        const candidate = new Float32Array(vec.buffer, vec.byteOffset, vec.byteLength / 4);
        let dot = 0,
          normA = 0,
          normB = 0;
        for (let i = 0; i < queryVec.length && i < candidate.length; i++) {
          const qi = queryVec[i] ?? 0;
          const ci = candidate[i] ?? 0;
          dot += qi * ci;
          normA += qi * qi;
          normB += ci * ci;
        }
        const similarity =
          normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
        return { id, distance: 1 - similarity };
      });

      results.sort((a, b) => a.distance - b.distance);
      return results.slice(0, limit);
    } catch {
      return [];
    }
  }

  getById(id: string): Memory | null {
    const row = this.db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Record<
      string,
      unknown
    > | null;
    return row ? rowToMemory(row) : null;
  }

  getByTier(tier: MemoryTier, projectId?: string, activeOnly = false): Memory[] {
    let sql = "SELECT * FROM memories WHERE tier = ?";
    const params: (string | number | null)[] = [tier];
    if (projectId !== undefined) {
      sql += " AND project_id = ?";
      params.push(projectId);
    }
    if (activeOnly) {
      sql += " AND status = 'active'";
    }
    return (
      this.db.prepare(sql).all(...(params as [string, ...(string | number | null)[]])) as Record<
        string,
        unknown
      >[]
    ).map(rowToMemory);
  }

  incrementFrequency(id: string): void {
    this.db
      .prepare("UPDATE memories SET frequency_count = frequency_count + 1 WHERE id = ?")
      .run(id);
  }

  updateStatus(id: string, status: MemoryStatus): void {
    this.db.prepare("UPDATE memories SET status = ? WHERE id = ?").run(status, id);
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    this.db.prepare("DELETE FROM memories_fts WHERE id = ?").run(id);
    if (this.vecAvailable) {
      try {
        this.db.prepare("DELETE FROM memory_vecs WHERE id = ?").run(id);
      } catch {
        this.vecAvailable = false;
      }
    }
  }

  allIds(): string[] {
    return (this.db.prepare("SELECT id FROM memories").all() as { id: string }[]).map((r) => r.id);
  }

  close(): void {
    this.db.close();
  }
}

function rowToMemory(row: Record<string, unknown>): Memory {
  const mem: Memory = {
    id: row.id as string,
    tier: row.tier as Memory["tier"],
    scope: row.scope as Memory["scope"],
    category: row.category as Memory["category"],
    status: row.status as Memory["status"],
    summary: row.summary as string,
    content: row.content as string,
    tags: JSON.parse(row.tags as string) as string[],
    strength: row.strength as number,
    importanceScore: (row.importance_score as number) ?? 0,
    frequencyCount: (row.frequency_count as number) ?? 0,
    sourceType: (row.source_type as Memory["sourceType"]) ?? "manual",
    capturedAt: row.captured_at as string,
    updatedAt: row.updated_at as string,
    humanEditedAt: (row.human_edited_at as string | null) ?? null,
    filePath: row.file_path as string,
  };
  const projectId = row.project_id as string | null;
  if (projectId !== null) mem.projectId = projectId;
  return mem;
}
