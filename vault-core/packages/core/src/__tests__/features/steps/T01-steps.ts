import { mkdirSync } from "node:fs";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultReader } from "../../../storage/vault-reader.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T01" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T01" }, function (this: VaultWorld) {
  this.cleanup();
});

Given("an empty vault and index database", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
});

When("I write 20 memories of which 3 are about databases", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const writer = new VaultWriter(this.vaultPath);
  for (let i = 0; i < 3; i++) {
    const mem = makeMemory({
      summary: `Database memory ${i}`,
      content: `Using SQLite for storage. Postgres is an alternative. Database indexing matters.`,
    });
    mem.filePath = writer.resolveFilePath(mem);
    writer.write(mem);
    db.upsert(mem);
  }
  for (let i = 0; i < 17; i++) {
    const mem = makeMemory({
      summary: `Unrelated memory ${i}`,
      content: `Some other content about cooking and weather.`,
    });
    mem.filePath = writer.resolveFilePath(mem);
    writer.write(mem);
    db.upsert(mem);
  }
  db.close();
});

Then(
  "BM25 search for {string} returns at least 1 result",
  function (this: VaultWorld, query: string) {
    const db = new IndexDB(this.indexPath);
    const results = db.bm25Search(query, 10);
    db.close();
    if (results.length < 1) throw new Error(`Expected at least 1 result for "${query}", got 0`);
    this.retrievalResults = results.map((r) => r.id);
  },
);

Then("each result id matches the pattern {string}", function (this: VaultWorld, pattern: string) {
  for (const id of this.retrievalResults) {
    if (!id.includes(pattern)) throw new Error(`Memory id "${id}" does not contain "${pattern}"`);
  }
});

When(
  "I write a memory with specific summary, content, tags, tier, scope, and projectId",
  function (this: VaultWorld) {
    const db = new IndexDB(this.indexPath);
    const writer = new VaultWriter(this.vaultPath);
    const mem = makeMemory({
      summary: "Roundtrip test summary",
      content: "Roundtrip test content body",
      tags: ["bdd", "roundtrip"],
      tier: "semantic",
      scope: "project",
      projectId: "project-roundtrip",
    });
    mem.filePath = writer.resolveFilePath(mem);
    writer.write(mem);
    db.upsert(mem);
    db.close();
    this.lastReadMemory = mem;
  },
);

Then(
  "reading that memory from the vault returns the exact same fields",
  function (this: VaultWorld) {
    const reader = new VaultReader();
    if (!this.lastReadMemory) throw new Error("No memory was previously read");
    const original = this.lastReadMemory;
    const read = reader.read(original.filePath);
    if (!read) throw new Error("Memory not found in vault");
    if (read.id !== original.id) throw new Error(`id mismatch: ${read.id} !== ${original.id}`);
    if (read.summary !== original.summary) throw new Error(`summary mismatch`);
    if (read.content !== original.content) throw new Error(`content mismatch`);
    if (read.tier !== original.tier) throw new Error(`tier mismatch`);
    if (read.projectId !== original.projectId) throw new Error(`projectId mismatch`);
    if (JSON.stringify(read.tags) !== JSON.stringify(original.tags))
      throw new Error(`tags mismatch`);
  },
);
