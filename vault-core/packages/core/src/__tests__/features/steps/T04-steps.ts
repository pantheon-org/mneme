import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { IndexDB } from "../../../storage/index-db.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T04" }, function (this: VaultWorld) {
  this.setup();
});

After({ tags: "@T04" }, function (this: VaultWorld) {
  this.cleanup();
});

const makeEmbedding = (base: number, noise = 0): number[] =>
  Array.from({ length: 768 }, (_, i) => base + noise * (i % 2 === 0 ? 0.05 : -0.05));

let t04Results: ReturnType<IndexDB["knnSearch"]>;
let t04Bm25Results: ReturnType<IndexDB["bm25Search"]>;

Given("an index database with a memory that has an embedding", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const mem = makeMemory({ summary: "Embedding test memory" });
  mem.embedding = makeEmbedding(0.5);
  db.upsert(mem);
  db.upsertVector(mem.id, mem.embedding);
  db.close();
});

When("knnSearch is called for that memory", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  t04Results = db.knnSearch(makeEmbedding(0.5, 1), 10);
  db.close();
});

Then("the result is an array", function (this: VaultWorld) {
  if (!Array.isArray(t04Results)) throw new Error("knnSearch result is not an array");
});

Given("an empty index database", function (this: VaultWorld) {});

When("I upsert a memory with a vector embedding", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const mem = makeMemory();
  mem.embedding = makeEmbedding(0.3);
  db.upsert(mem);
  try {
    db.upsertVector(mem.id, mem.embedding ?? []);
    this.threwError = false;
  } catch {
    this.threwError = true;
  }
  db.close();
});

Then("no error is thrown", function (this: VaultWorld) {
  if (this.threwError) throw new Error("upsertVector threw an error");
});

Given("an index database with a memory about {string}", function (this: VaultWorld, topic: string) {
  const dir = mkdtempSync(join(tmpdir(), "vault-bdd-t04-"));
  const db = new IndexDB(join(dir, "index.db"));
  const mem = makeMemory({
    summary: `Use ${topic} for the index database storage layer`,
    content: `We decided to use bun:sqlite because it requires no native addons and ships with Bun.`,
  });
  db.upsert(mem);
  db.close();
  this.indexPath = join(dir, "index.db");
});

When("BM25 search is performed for {string}", function (this: VaultWorld, query: string) {
  const db = new IndexDB(this.indexPath);
  t04Bm25Results = db.bm25Search(query, 10);
  db.close();
});

Then("at least 1 result is returned", function (this: VaultWorld) {
  if (t04Bm25Results.length < 1)
    throw new Error(`Expected at least 1 result, got ${t04Bm25Results.length}`);
});
