import type { Database } from "bun:sqlite";
import type { BM25Result } from "./index-db.js";

export const bm25Search = (db: Database, query: string, limit = 30): BM25Result[] => {
  const ftsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/['"*^(){}[\]:]/g, ""))
    .filter(Boolean)
    .join(" OR ");
  if (!ftsQuery) return [];
  try {
    return db
      .prepare(
        `SELECT fts.id, fts.summary, fts.rank FROM memories_fts fts WHERE memories_fts MATCH ? ORDER BY fts.rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as BM25Result[];
  } catch {
    return [];
  }
};
