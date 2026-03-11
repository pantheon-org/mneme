import type { Database } from "bun:sqlite";
import type { VecResult } from "./index-db.js";

export const knnSearch = (db: Database, embedding: number[], limit = 30): VecResult[] => {
  try {
    const queryVec = new Float32Array(Buffer.from(new Float32Array(embedding).buffer).buffer);
    const rows = db.prepare(`SELECT id, vec FROM memory_vecs`).all() as {
      id: string;
      vec: Buffer;
    }[];
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
      return {
        id,
        distance: normA === 0 || normB === 0 ? 1 : 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB)),
      };
    });
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, limit);
  } catch {
    return [];
  }
};
