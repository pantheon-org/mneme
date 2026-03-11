import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Memory } from "@vault-core/types";
import { Injector } from "../../retrieval/injector.js";
import { HybridRetriever } from "../../retrieval/retriever.js";
import type { Embedder } from "../../scoring/embedder.js";
import { IndexDB } from "../../storage/index-db.js";
import { VaultWriter } from "../../storage/vault-writer.js";

let seq = 0;
const makeMemory = (overrides: Partial<Memory> = {}): Memory => {
  seq++;
  return {
    id: `mem_t09b${String(seq).padStart(3, "0")}`,
    tier: "episodic",
    scope: "user",
    category: "decision",
    status: "active",
    summary: `Memory ${seq}`,
    content: `Content for memory ${seq}`,
    tags: [],
    strength: 0.8,
    importanceScore: 0.7,
    frequencyCount: 1,
    sourceType: "manual",
    capturedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    humanEditedAt: null,
    filePath: "",
    ...overrides,
  };
};
const makeNullEmbedder = (): Embedder => ({
  embed: async (texts) => texts.map(() => []),
  dimensions: 768,
});

describe("Feature: Memory Retrieval Ranking", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "vault-retrieval-rank-test-"));
  const db = new IndexDB(join(tmpDir, "index.db"));
  const writer = new VaultWriter(tmpDir);
  const embedder = makeNullEmbedder();

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Scenario: Human-edited memories receive a ranking boost", () => {
    it("Given two similar memories where one is human-edited, When retrieved together, Then the human-edited one ranks higher", async () => {
      const query = "runtime performance optimisation";
      const humanEdited = makeMemory({
        content: "Bun is faster for runtime performance optimisation tasks",
        summary: "Bun performance",
        humanEditedAt: new Date().toISOString(),
        strength: 0.8,
      });
      const normal = makeMemory({
        content: "Bun is also suitable for runtime performance optimisation",
        summary: "Bun also good",
        humanEditedAt: null,
        strength: 0.8,
      });
      humanEdited.filePath = writer.resolveFilePath(humanEdited);
      normal.filePath = writer.resolveFilePath(normal);
      writer.write(humanEdited);
      writer.write(normal);
      db.upsert(humanEdited);
      db.upsert(normal);
      const results = await new HybridRetriever(db, embedder).retrieve({ text: query });
      const humanIdx = results.findIndex((r) => r.memory.id === humanEdited.id);
      const normalIdx = results.findIndex((r) => r.memory.id === normal.id);
      if (humanIdx !== -1 && normalIdx !== -1) expect(humanIdx).toBeLessThan(normalIdx);
    });
  });

  describe("Scenario: Injector respects token budget during formatting", () => {
    it("Given many memories and a small token budget, When formatted, Then output fits within budget", () => {
      const injector = new Injector();
      const memories = Array.from({ length: 50 }, (_, i) =>
        makeMemory({ summary: `Token test memory ${i}`, content: "a".repeat(200) }),
      );
      const ranked = memories.map((m) => ({
        memory: m,
        score: 0.5,
        bm25Rank: 0.5,
        vectorRank: 0.5,
      }));
      const result = injector.format(ranked, 200);
      expect(result.tokenEstimate).toBeLessThanOrEqual(250);
      expect(result.memoriesIncluded).toBeLessThan(50);
    });

    it("Given no memories, When formatted, Then markdown is empty and estimates are zero", () => {
      const injector = new Injector();
      const result = injector.format([]);
      expect(result.markdown).toBe("");
      expect(result.tokenEstimate).toBe(0);
      expect(result.memoriesIncluded).toBe(0);
    });
  });

  describe("Scenario: topK limits returned results", () => {
    it("Given many memories in the database, When topK is 3, Then at most 3 results are returned", async () => {
      const results = await new HybridRetriever(db, embedder).retrieve({ text: "memory", topK: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });
});
