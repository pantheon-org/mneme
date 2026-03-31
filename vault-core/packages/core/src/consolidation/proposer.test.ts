import { describe, expect, it } from "bun:test";
import type { Memory } from "@vault-core/types";
import type { IndexDB } from "../storage/index-db.js";
import type { Adjudicator } from "./adjudicator.js";
import type { ConsolidationProposal } from "./consolidation-proposal.js";
import { Proposer } from "./proposer.js";

const BASE_EMBEDDING = [1, 0, 0, 0];

const makeMemory = (overrides: Partial<Memory> = {}): Memory => ({
  id: "mem_001",
  tier: "episodic",
  scope: "user",
  category: "decision",
  status: "active",
  summary: "Use Bun as the runtime",
  content: "We chose Bun because of native SQLite and speed.",
  tags: [],
  strength: 0.8,
  importanceScore: 0.7,
  frequencyCount: 1,
  sourceType: "manual",
  capturedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  humanEditedAt: null,
  filePath: "",
  ...overrides,
});

const makeSimilarEmbedding = (base: number[]): number[] =>
  base.map((v) => v + Math.random() * 0.001); // nosemgrep: node_insecure_random_generator

const makeDb = (memories: Memory[]): IndexDB =>
  ({ getByTier: (_tier: string, _projectId?: string) => memories }) as unknown as IndexDB;

const makeMockAdjudicator = (proposal?: Partial<ConsolidationProposal>): Adjudicator =>
  ({
    consolidate: async (cluster: Memory[]) => ({
      id: `prop_${Date.now()}`,
      status: "pending",
      sourceMemoryIds: cluster.map((m) => m.id),
      proposedContent: "Consolidated content",
      proposedSummary: "Consolidated summary",
      proposedTags: [],
      proposedCategory: "decision",
      proposedScope: "user",
      createdAt: new Date().toISOString(),
      ...proposal,
    }),
  }) as unknown as Adjudicator;

describe("Proposer", () => {
  describe("propose", () => {
    it("returns empty array when there are no episodic memories", async () => {
      expect(await new Proposer(makeDb([]), makeMockAdjudicator()).propose()).toEqual([]);
    });

    it("returns empty array when no cluster reaches minimum size of 3", async () => {
      const memories = [
        makeMemory({ id: "mem_001", embedding: BASE_EMBEDDING }),
        makeMemory({ id: "mem_002", embedding: makeSimilarEmbedding(BASE_EMBEDDING) }),
      ];
      expect(await new Proposer(makeDb(memories), makeMockAdjudicator()).propose()).toEqual([]);
    });

    it("returns empty array when memories have no embeddings", async () => {
      const memories = Array.from({ length: 5 }, (_, i) => makeMemory({ id: `mem_00${i}` }));
      expect(await new Proposer(makeDb(memories), makeMockAdjudicator()).propose()).toEqual([]);
    });

    it("returns a proposal when cluster of 3+ similar memories exists", async () => {
      const memories = Array.from({ length: 3 }, (_, i) =>
        makeMemory({ id: `mem_00${i}`, embedding: makeSimilarEmbedding(BASE_EMBEDDING) }),
      );
      const result = await new Proposer(makeDb(memories), makeMockAdjudicator()).propose();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("proposal contains sourceMemoryIds from clustered memories", async () => {
      const memories = Array.from({ length: 3 }, (_, i) =>
        makeMemory({ id: `mem_00${i}`, embedding: makeSimilarEmbedding(BASE_EMBEDDING) }),
      );
      const [proposal] = await new Proposer(makeDb(memories), makeMockAdjudicator()).propose();
      expect(proposal?.sourceMemoryIds).toHaveLength(3);
    });

    it("does not propose memories from different embedding clusters", async () => {
      const clusterA = Array.from({ length: 3 }, (_, i) =>
        makeMemory({ id: `mem_a${i}`, embedding: [1, 0, 0, 0].map((v) => v + i * 0.001) }),
      );
      const clusterB = Array.from({ length: 3 }, (_, i) =>
        makeMemory({ id: `mem_b${i}`, embedding: [0, 1, 0, 0].map((v) => v + i * 0.001) }),
      );
      const result = await new Proposer(
        makeDb([...clusterA, ...clusterB]),
        makeMockAdjudicator(),
      ).propose();
      for (const proposal of result) {
        const ids = proposal.sourceMemoryIds;
        expect(
          ids.every((id) => id.startsWith("mem_a")) || ids.every((id) => id.startsWith("mem_b")),
        ).toBe(true);
      }
    });

    it("skips clusters where adjudicator returns null", async () => {
      const memories = Array.from({ length: 3 }, (_, i) =>
        makeMemory({ id: `mem_00${i}`, embedding: makeSimilarEmbedding(BASE_EMBEDDING) }),
      );
      const nullAdjudicator = { consolidate: async () => null } as unknown as Adjudicator;
      expect(await new Proposer(makeDb(memories), nullAdjudicator).propose()).toEqual([]);
    });
  });
});
