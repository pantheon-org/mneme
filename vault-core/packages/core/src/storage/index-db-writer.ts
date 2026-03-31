import type { Database } from "bun:sqlite";
import { statSync } from "node:fs";
import type { Memory, MemoryStatus } from "@vault-core/types";
import { UPSERT_SQL } from "./index-db-schema.js";

export const upsert = (db: Database, memory: Memory): void => {
  let mtimeNs = 0;
  try {
    mtimeNs = Number(statSync(memory.filePath).mtimeMs) * 1_000_000;
  } catch {
    mtimeNs = 0;
  }
  db.prepare(UPSERT_SQL).run({
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
  db.prepare(`DELETE FROM memories_fts WHERE id = ?`).run(memory.id);
  db.prepare(`INSERT INTO memories_fts(id, summary, content, tags) VALUES (?, ?, ?, ?)`).run(
    memory.id,
    memory.summary,
    memory.content,
    JSON.stringify(memory.tags),
  );
};

export const upsertVector = (db: Database, id: string, embedding: number[]): boolean => {
  try {
    db.prepare(
      `INSERT INTO memory_vecs (id, vec) VALUES ($id, $vec) ON CONFLICT(id) DO UPDATE SET vec = excluded.vec`,
    ).run({ $id: id, $vec: Buffer.from(new Float32Array(embedding).buffer) });
    return true;
  } catch {
    return false;
  }
};

export const deleteMemory = (db: Database, id: string, vecAvailable: boolean): boolean => {
  db.prepare("DELETE FROM memories WHERE id = ?").run(id);
  db.prepare("DELETE FROM memories_fts WHERE id = ?").run(id);
  if (!vecAvailable) return true;
  try {
    db.prepare("DELETE FROM memory_vecs WHERE id = ?").run(id);
    return true;
  } catch {
    return false;
  }
};

export const incrementFrequency = (db: Database, id: string): void => {
  db.prepare("UPDATE memories SET frequency_count = frequency_count + 1 WHERE id = ?").run(id);
};

export const updateStatus = (db: Database, id: string, status: MemoryStatus): void => {
  db.prepare("UPDATE memories SET status = ? WHERE id = ?").run(status, id);
};
