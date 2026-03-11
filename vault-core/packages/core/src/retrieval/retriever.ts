import type { RankedMemory, RetrievalQuery } from "@vault-core/types";
import type { Embedder } from "../scoring/embedder.js";
import type { IndexDB } from "../storage/index-db.js";

const RRF_K = 60;

export class HybridRetriever {
  constructor(
    private readonly db: IndexDB,
    private readonly embedder: Embedder,
    private readonly defaultMinStrength: number = 0,
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RankedMemory[]> {
    const topK = query.topK ?? 10;
    const minStrength = query.minStrength ?? this.defaultMinStrength;
    const fetchLimit = topK * 3;

    const bm25Results = this.db.bm25Search(query.text, fetchLimit);

    let vecResults: { id: string; distance: number }[] = [];
    try {
      const [embedding] = await this.embedder.embed([query.text]);
      if (embedding) {
        vecResults = this.db.knnSearch(embedding, fetchLimit);
      }
    } catch {
      vecResults = [];
    }

    const scores = new Map<string, { bm25Rank: number; vecRank: number }>();

    bm25Results.forEach(({ id }, i) => {
      const entry = scores.get(id) ?? { bm25Rank: 0, vecRank: 0 };
      entry.bm25Rank = 1 / (RRF_K + i + 1);
      scores.set(id, entry);
    });

    vecResults.forEach(({ id }, i) => {
      const entry = scores.get(id) ?? { bm25Rank: 0, vecRank: 0 };
      entry.vecRank = 1 / (RRF_K + i + 1);
      scores.set(id, entry);
    });

    const allIds = [...scores.keys()];
    const memories = this.db.getByIds(allIds);
    const memoryMap = new Map(memories.map((m) => [m.id, m]));

    const ranked: RankedMemory[] = [];

    for (const [id, { bm25Rank, vecRank }] of scores) {
      const memory = memoryMap.get(id);
      if (!memory) continue;
      if (memory.status !== "active") continue;

      if (memory.scope === "project") {
        if (!query.projectId || memory.projectId !== query.projectId) continue;
      }

      if (memory.strength < minStrength) continue;

      let score = bm25Rank + vecRank;
      if (memory.humanEditedAt) score *= 1.5;

      ranked.push({ memory, score, bm25Rank, vectorRank: vecRank });
    }

    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, topK);
  }
}
