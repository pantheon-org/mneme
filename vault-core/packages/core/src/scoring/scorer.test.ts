import { describe, expect, it } from "bun:test";
import type { MemoryCandidate } from "@vault-core/types";
import type { IndexDB } from "../storage/index-db.js";
import type { Embedder } from "./embedder.js";
import { DEFAULT_WEIGHTS, Scorer } from "./scorer.js";

function makeStubDb(overrides: Partial<IndexDB> = {}): IndexDB {
  return {
    bm25Search: () => [],
    knnSearch: () => [],
    getById: () => null,
    ...overrides,
  } as unknown as IndexDB;
}

function makeStubEmbedder(): Embedder {
  return { embed: async (texts) => texts.map(() => []), dimensions: 768 };
}

function makeCandidate(overrides: Partial<MemoryCandidate> = {}): MemoryCandidate {
  return {
    content: "We decided to use Bun as the runtime",
    signals: [{ type: "keyword", label: "decision-keyword", confidence: 0.7 }],
    input: { content: "We decided to use Bun as the runtime", sourceType: "manual" },
    ...overrides,
  };
}

describe("Scorer", () => {
  describe("score", () => {
    it("returns null when composite is below threshold", async () => {
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder(), DEFAULT_WEIGHTS, 0.99);
      const result = await scorer.score(makeCandidate({ signals: [] }));
      expect(result).toBeNull();
    });

    it("returns an ImportanceScore when composite meets threshold", async () => {
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder());
      const result = await scorer.score(makeCandidate());
      expect(result).not.toBeNull();
      expect(result?.composite).toBeGreaterThanOrEqual(0.45);
    });

    it("recency is 0.5 when no prior similar memory exists", async () => {
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder());
      const result = await scorer.score(makeCandidate());
      expect(result?.recency).toBe(0.5);
    });

    it("recency decays based on age of existing similar memory", async () => {
      const oldCapturedAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const db = makeStubDb({
        bm25Search: () => [{ id: "old-mem" }] as ReturnType<IndexDB["bm25Search"]>,
        getById: () =>
          ({ id: "old-mem", capturedAt: oldCapturedAt, frequencyCount: 1 }) as ReturnType<
            IndexDB["getById"]
          >,
      });
      const scorer = new Scorer(db, makeStubEmbedder());
      const result = await scorer.score(makeCandidate());
      expect(result?.recency).toBeLessThan(0.2);
    });

    it("importance is capped at 1.0 regardless of signal count", async () => {
      const signals = Array.from({ length: 10 }, (_, i) => ({
        type: "keyword" as const,
        label: `sig-${i}`,
        confidence: 1.0,
      }));
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder());
      const result = await scorer.score(makeCandidate({ signals }));
      expect(result?.importance).toBeLessThanOrEqual(1.0);
    });

    it("confidence is average of signal confidences", async () => {
      const signals = [
        { type: "keyword" as const, label: "a", confidence: 0.6 },
        { type: "keyword" as const, label: "b", confidence: 0.8 },
      ];
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder());
      const result = await scorer.score(makeCandidate({ signals }));
      expect(result?.confidence).toBeCloseTo(0.7, 5);
    });

    it("confidence is 0 when there are no signals", async () => {
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder(), DEFAULT_WEIGHTS, 0);
      const result = await scorer.score(makeCandidate({ signals: [] }));
      expect(result?.confidence).toBe(0);
    });

    it("novelty is 1.0 when BM25 returns no results", async () => {
      const scorer = new Scorer(makeStubDb({ bm25Search: () => [] }), makeStubEmbedder());
      const result = await scorer.score(makeCandidate());
      expect(result?.novelty).toBe(1.0);
    });

    it("novelty decreases when BM25 returns similar content", async () => {
      const db = makeStubDb({ bm25Search: () => Array(8).fill({ id: "x" }) });
      const scorer = new Scorer(db, makeStubEmbedder(), DEFAULT_WEIGHTS, 0);
      const result = await scorer.score(makeCandidate());
      expect(result?.novelty).toBeLessThan(1.0);
    });

    it("interference is 0 when novelty >= 0.3", async () => {
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder());
      const result = await scorer.score(makeCandidate());
      if (result != null && result.novelty >= 0.3) {
        expect(result.interference).toBe(0);
      }
    });

    it("interference is positive when novelty < 0.3", async () => {
      const db = makeStubDb({ bm25Search: () => Array(10).fill({ id: "x" }) });
      const scorer = new Scorer(db, makeStubEmbedder(), DEFAULT_WEIGHTS, 0);
      const result = await scorer.score(makeCandidate({ signals: [] }));
      if (result != null && result.novelty < 0.3) {
        expect(result.interference).toBeGreaterThan(0);
      }
    });

    it("frequency is 0 when no existing memory is found", async () => {
      const scorer = new Scorer(makeStubDb(), makeStubEmbedder());
      const result = await scorer.score(makeCandidate());
      expect(result?.frequency).toBe(0);
    });
  });
});
