import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Memory, MemoryStatus, MemoryTier } from "@vault-core/types";
import { bm25Search } from "./bm25-search.js";
import { MIGRATE_COLUMNS, SCHEMA_STATEMENTS } from "./index-db-schema.js";
import {
  deleteMemory,
  incrementFrequency,
  updateStatus,
  upsert,
  upsertVector,
} from "./index-db-writer.js";
import { knnSearch } from "./knn-search.js";
import { rowToMemory } from "./row-to-memory.js";

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
    for (const stmt of SCHEMA_STATEMENTS) this.db.run(stmt);
    try {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS memory_vecs (id TEXT PRIMARY KEY, vec BLOB NOT NULL)`,
      );
      this.vecAvailable = true;
    } catch {
      this.vecAvailable = false;
    }
    const existing = (
      this.db.prepare("PRAGMA table_info(memories)").all() as { name: string }[]
    ).map((r) => r.name);
    for (const [col, def] of MIGRATE_COLUMNS) {
      if (!existing.includes(col)) this.db.run(`ALTER TABLE memories ADD COLUMN ${col} ${def}`);
    }
  }

  upsert(memory: Memory): void {
    upsert(this.db, memory);
  }

  upsertVector(id: string, embedding: number[]): void {
    if (!this.vecAvailable) return;
    if (!upsertVector(this.db, id, embedding)) this.vecAvailable = false;
  }

  bm25Search(query: string, limit = 30): BM25Result[] {
    return bm25Search(this.db, query, limit);
  }

  knnSearch(embedding: number[], limit = 30): VecResult[] {
    if (!this.vecAvailable) return [];
    return knnSearch(this.db, embedding, limit);
  }

  getById(id: string): Memory | null {
    const row = this.db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Record<
      string,
      unknown
    > | null;
    return row ? rowToMemory(row) : null;
  }

  getByIds(ids: string[]): Memory[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    return (
      this.db
        .prepare(`SELECT * FROM memories WHERE id IN (${placeholders})`)
        .all(...(ids as [string, ...string[]])) as Record<string, unknown>[]
    ).map(rowToMemory);
  }

  getByTier(tier: MemoryTier, projectId?: string, activeOnly = false): Memory[] {
    let sql = "SELECT * FROM memories WHERE tier = ?";
    const params: (string | number | null)[] = [tier];
    if (projectId !== undefined) {
      sql += " AND project_id = ?";
      params.push(projectId);
    }
    if (activeOnly) sql += " AND status = 'active'";
    return (
      this.db.prepare(sql).all(...(params as [string, ...(string | number | null)[]])) as Record<
        string,
        unknown
      >[]
    ).map(rowToMemory);
  }

  incrementFrequency(id: string): void {
    incrementFrequency(this.db, id);
  }
  updateStatus(id: string, status: MemoryStatus): void {
    updateStatus(this.db, id, status);
  }

  delete(id: string): void {
    if (!deleteMemory(this.db, id, this.vecAvailable)) this.vecAvailable = false;
  }

  allIds(): string[] {
    return (this.db.prepare("SELECT id FROM memories").all() as { id: string }[]).map((r) => r.id);
  }
  rowCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as n FROM memories").get() as { n: number }).n;
  }
  close(): void {
    this.db.close();
  }
}
