import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Memory } from "@vault-core/types";
import { HybridRetriever } from "../../retrieval/retriever.js";
import type { Embedder } from "../../scoring/embedder.js";
import { IndexDB } from "../../storage/index-db.js";
import { VaultWriter } from "../../storage/vault-writer.js";

let seq = 0;
const makeMemory = (overrides: Partial<Memory> = {}): Memory => {
  seq++;
  return {
    id: `mem_t09a${String(seq).padStart(3, "0")}`,
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

describe("Feature: Memory Retrieval Filtering", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "vault-retrieval-filter-test-"));
  const db = new IndexDB(join(tmpDir, "index.db"));
  const writer = new VaultWriter(tmpDir);
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
      const retriever = new HybridRetriever(db, embedder);
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
      const retriever = new HybridRetriever(db, embedder);
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
      const results = await new HybridRetriever(db, embedder).retrieve({
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
      const results = await new HybridRetriever(db, embedder).retrieve({
        text: "deployment",
        projectId: "project-alpha",
      });
      expect(results.some((r) => r.memory.id === memA.id)).toBe(true);
    });
  });
});
