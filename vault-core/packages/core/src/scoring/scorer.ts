import type { ImportanceScore, MemoryCandidate, ScoringWeights } from "@vault-core/types";
import type { IndexDB } from "../storage/index-db.js";
import type { Embedder } from "./embedder.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.2,
  frequency: 0.15,
  importance: 0.25,
  utility: 0.2,
  novelty: 0.1,
  confidence: 0.1,
  interference: 0.1,
};

export class Scorer {
  constructor(
    private readonly db: IndexDB,
    _embedder: Embedder,
    private readonly weights: ScoringWeights = DEFAULT_WEIGHTS,
    private readonly threshold: number = 0.45,
  ) {}

  async score(candidate: MemoryCandidate): Promise<ImportanceScore | null> {
    const importanceRaw = candidate.signals.reduce((acc, s, i) => {
      return acc + s.confidence * 0.8 ** i;
    }, 0);
    const importance = Math.min(importanceRaw, 1.0);

    const confidence =
      candidate.signals.length > 0
        ? candidate.signals.reduce((s, sig) => s + sig.confidence, 0) / candidate.signals.length
        : 0;

    const utility = importance * confidence;

    let novelty = 1.0;
    if (candidate.embedding && candidate.embedding.length > 0) {
      const neighbours = this.db.knnSearch(candidate.embedding, 50);
      if (neighbours.length > 0) {
        const maxSim = Math.max(...neighbours.map((n) => 1 - (n.distance ?? 0)));
        novelty = 1 - maxSim;
      }
    } else {
      const results = this.db.bm25Search(candidate.content.slice(0, 100), 10);
      novelty = results.length === 0 ? 1.0 : Math.max(0, 1 - results.length / 10);
    }

    const existingResults = this.db.bm25Search(candidate.content.slice(0, 100), 1);
    const existingId = existingResults[0]?.id;
    const existingMemory = existingId ? this.db.getById(existingId) : null;
    const rawFrequency = existingMemory ? existingMemory.frequencyCount : 0;
    const frequency = Math.min(rawFrequency / 10, 1.0);

    const lastSeenMs = existingMemory ? Date.parse(existingMemory.capturedAt) : null;
    const recency =
      lastSeenMs !== null ? Math.exp(-(Date.now() - lastSeenMs) / SEVEN_DAYS_MS) : 0.5;

    const interference = novelty < 0.3 ? 1.0 - novelty : 0;

    const rawComposite =
      this.weights.recency * recency +
      this.weights.frequency * frequency +
      this.weights.importance * importance +
      this.weights.utility * utility +
      this.weights.novelty * novelty +
      this.weights.confidence * confidence -
      this.weights.interference * interference;
    const composite = Math.max(0, Math.min(1, rawComposite));

    if (composite < this.threshold) return null;

    return {
      recency,
      frequency,
      importance,
      utility,
      novelty,
      confidence,
      interference,
      composite,
    };
  }
}
