import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Memory } from "@vault-core/types";
import { Injector } from "../../retrieval/injector.js";
import { HybridRetriever } from "../../retrieval/retriever.js";
import type { Embedder } from "../../scoring/embedder.js";
import { IndexDB } from "../../storage/index-db.js";
import { VaultReader } from "../../storage/vault-reader.js";
import { VaultWriter } from "../../storage/vault-writer.js";

/**
 * Feature: Memory Retrieval Ranking
 *
 * As an AI coding agent
 * I want to retrieve contextually relevant memories ranked by importance
 * So that the most useful context is injected into my working window
 */

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "vault-retrieval-test-"));
}

let seq = 0;
function makeMemory(overrides: Partial<Memory> = {}): Memory {
  seq++;
  return {
    id: `mem_test${String(seq).padStart(3, "0")}`,
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
}

function makeNullEmbedder(): Embedder {
  return { embed: async (texts) => texts.map(() => []), dimensions: 768 };
}

describe("Feature: Memory Retrieval Ranking", () => {
  const tmpDir = makeTmpDir();
  const db = new IndexDB(join(tmpDir, "index.db"));
  const writer = new VaultWriter(tmpDir);
  const reader = new VaultReader();
  const embedder = makeNullEmbedder();

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Scenario: Active memories are returned for a matching query", () => {
    it("Given a memory stored in the vault, When retrieving with a matching query, Then the memory is returned", async () => {
      const mem = makeMemory({
        content: "Use bun:sqlite for database access",
        summary: "SQLite choice",
      });
      mem.filePath = writer.resolveFilePath(mem);
      writer.write(mem);
      db.upsert(mem);

      const retriever = new HybridRetriever(db, embedder, reader);
      const results = await retriever.retrieve({ text: "sqlite database" });
      expect(results.some((r) => r.memory.id === mem.id)).toBe(true);
    });
  });

  describe("Scenario: Superseded memories are excluded from results", () => {
    it("Given a superseded memory, When retrieving, Then it is not included in results", async () => {
      const mem = makeMemory({
        status: "superseded",
        content: "Old approach using better-sqlite3",
        summary: "Outdated SQLite lib",
      });
      mem.filePath = writer.resolveFilePath(mem);
      writer.write(mem);
      db.upsert(mem);

      const retriever = new HybridRetriever(db, embedder, reader);
      const results = await retriever.retrieve({ text: "sqlite" });
      expect(results.every((r) => r.memory.id !== mem.id)).toBe(true);
    });
  });

  describe("Scenario: Project-scoped memories are isolated by project", () => {
    it("Given a project-scoped memory for project A, When retrieving with project B context, Then it is excluded", async () => {
      const memA = makeMemory({
        scope: "project",
        projectId: "project-alpha",
        content: "Alpha-specific migration strategy",
        summary: "Alpha migration",
      });
      memA.filePath = writer.resolveFilePath(memA);
      writer.write(memA);
      db.upsert(memA);

      const retriever = new HybridRetriever(db, embedder, reader);
      const results = await retriever.retrieve({
        text: "migration strategy",
        projectId: "project-beta",
      });
      expect(results.every((r) => r.memory.id !== memA.id)).toBe(true);
    });

    it("Given a project-scoped memory for project A, When retrieving with project A context, Then it is included", async () => {
      const memA = makeMemory({
        scope: "project",
        projectId: "project-alpha",
        content: "Alpha-specific deployment approach",
        summary: "Alpha deployment",
      });
      memA.filePath = writer.resolveFilePath(memA);
      writer.write(memA);
      db.upsert(memA);

      const retriever = new HybridRetriever(db, embedder, reader);
      const results = await retriever.retrieve({ text: "deployment", projectId: "project-alpha" });
      expect(results.some((r) => r.memory.id === memA.id)).toBe(true);
    });
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

      const retriever = new HybridRetriever(db, embedder, reader);
      const results = await retriever.retrieve({ text: query });
      const humanIdx = results.findIndex((r) => r.memory.id === humanEdited.id);
      const normalIdx = results.findIndex((r) => r.memory.id === normal.id);
      if (humanIdx !== -1 && normalIdx !== -1) {
        expect(humanIdx).toBeLessThan(normalIdx);
      }
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
      const budget = 200;
      const result = injector.format(ranked, budget);
      expect(result.tokenEstimate).toBeLessThanOrEqual(budget + 50);
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
      const retriever = new HybridRetriever(db, embedder, reader);
      const results = await retriever.retrieve({ text: "memory", topK: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });
});
