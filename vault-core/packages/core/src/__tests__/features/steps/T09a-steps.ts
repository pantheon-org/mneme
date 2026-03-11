import { mkdirSync } from "node:fs";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { RankedMemory } from "@vault-core/types";
import { HybridRetriever } from "../../../retrieval/retriever.js";
import type { Embedder } from "../../../scoring/embedder.js";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T09a" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T09a" }, function (this: VaultWorld) {
  this.cleanup();
});

const nullEmb: Embedder = { embed: async (ts: string[]) => ts.map(() => []), dimensions: 768 };
let t09aMemId = "";
let t09aResults: RankedMemory[] = [];

import type { Memory } from "@vault-core/types";

const makeT09aMem = (overrides: Partial<Memory> = {}): Memory => makeMemory({ ...overrides });

Given(
  "an index database with an active memory about {string}",
  async function (this: VaultWorld, topic: string) {
    mkdirSync(this.vaultPath, { recursive: true });
    const db = new IndexDB(this.indexPath);
    const writer = new VaultWriter(this.vaultPath);
    const mem = makeT09aMem({
      summary: `Memory about ${topic}`,
      content: `Use bun:sqlite for ${topic} access. Store data with ${topic}.`,
      status: "active",
    });
    mem.filePath = writer.resolveFilePath(mem);
    await writer.write(mem);
    db.upsert(mem);
    t09aMemId = mem.id;
    db.close();
  },
);

Given(
  "an index database with a superseded memory about {string}",
  async function (this: VaultWorld, topic: string) {
    mkdirSync(this.vaultPath, { recursive: true });
    const db = new IndexDB(this.indexPath);
    const writer = new VaultWriter(this.vaultPath);
    const mem = makeT09aMem({
      summary: `Superseded memory about ${topic}`,
      content: `Use bun:sqlite for ${topic} access. Store data with ${topic}.`,
      status: "superseded",
    });
    mem.filePath = writer.resolveFilePath(mem);
    await writer.write(mem);
    db.upsert(mem);
    t09aMemId = mem.id;
    db.close();
  },
);

Given(
  "an index database with a memory scoped to {string}",
  async function (this: VaultWorld, projectId: string) {
    mkdirSync(this.vaultPath, { recursive: true });
    const db = new IndexDB(this.indexPath);
    const writer = new VaultWriter(this.vaultPath);
    const mem = makeT09aMem({
      summary: `Project-scoped memory for ${projectId}`,
      content: `sqlite database details for ${projectId}`,
      scope: "project",
      projectId,
      status: "active",
    });
    mem.filePath = writer.resolveFilePath(mem);
    await writer.write(mem);
    db.upsert(mem);
    t09aMemId = mem.id;
    db.close();
  },
);

When(
  "active memories are retrieved for query {string}",
  async function (this: VaultWorld, query: string) {
    const db = new IndexDB(this.indexPath);
    const retriever = new HybridRetriever(db, nullEmb);
    t09aResults = (await retriever.retrieve({ text: query })) as RankedMemory[];
    db.close();
  },
);

When(
  "filtered memories are retrieved with project filter {string}",
  async function (this: VaultWorld, projectId: string) {
    const db = new IndexDB(this.indexPath);
    const retriever = new HybridRetriever(db, nullEmb);
    t09aResults = (await retriever.retrieve({
      text: "sqlite database",
      projectId,
    })) as RankedMemory[];
    db.close();
  },
);

Then("the active memory id is in the results", function (this: VaultWorld) {
  const found = t09aResults.some((m) => m.memory.id === t09aMemId);
  if (!found) throw new Error(`Active memory ${t09aMemId} not found in results`);
});

Then("the superseded memory id is not in the results", function (this: VaultWorld) {
  const found = t09aResults.some((m) => m.memory.id === t09aMemId);
  if (found) throw new Error(`Superseded memory ${t09aMemId} should not be in results`);
});

Then("the project-alpha memory id is not in the results", function (this: VaultWorld) {
  const found = t09aResults.some((m) => m.memory.id === t09aMemId);
  if (found) throw new Error(`project-alpha memory ${t09aMemId} should be excluded`);
});

Then("the project-alpha memory id is in the results", function (this: VaultWorld) {
  const found = t09aResults.some((m) => m.memory.id === t09aMemId);
  if (!found) throw new Error(`project-alpha memory ${t09aMemId} not found in results`);
});
