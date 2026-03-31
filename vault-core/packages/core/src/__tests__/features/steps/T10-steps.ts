import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { IndexDB } from "../../../storage/index-db.js";
import { reconcile } from "../../../storage/index-db-reconcile.js";
import { VaultReader } from "../../../storage/vault-reader.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T10" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T10" }, function (this: VaultWorld) {
  this.cleanup();
});

let t10ReconcileResult: { inserted: number; deleted: number } = { inserted: 0, deleted: 0 };

Given("a vault with one memory file and an empty SQLite index", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
  const writer = new VaultWriter(this.vaultPath);
  const mem = makeMemory({ summary: "crash recovery test" });
  mem.filePath = writer.resolveFilePath(mem);
  writer.write(mem);
  this.lastReadMemory = mem;
});

When("reconcile is called with the vault path", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const reader = new VaultReader();
  t10ReconcileResult = reconcile(db, reader, this.vaultPath);
  db.close();
});

Then("the memory is present in the SQLite index", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  if (!this.lastReadMemory) throw new Error("No memory stored in world");
  const found = db.getById(this.lastReadMemory.id);
  db.close();
  if (found === null) throw new Error(`Memory ${this.lastReadMemory.id} not found in index`);
});

Then(
  "reconcile returns inserted count of {int} and deleted count of {int}",
  function (this: VaultWorld, expectedInserted: number, expectedDeleted: number) {
    if (t10ReconcileResult.inserted !== expectedInserted) {
      throw new Error(`Expected inserted ${expectedInserted}, got ${t10ReconcileResult.inserted}`);
    }
    if (t10ReconcileResult.deleted !== expectedDeleted) {
      throw new Error(`Expected deleted ${expectedDeleted}, got ${t10ReconcileResult.deleted}`);
    }
  },
);

Given(
  "a vault with one memory file and an SQLite index containing that memory",
  function (this: VaultWorld) {
    mkdirSync(this.vaultPath, { recursive: true });
    const writer = new VaultWriter(this.vaultPath);
    const db = new IndexDB(this.indexPath);
    const mem = makeMemory({ summary: "already indexed memory" });
    mem.filePath = writer.resolveFilePath(mem);
    writer.write(mem);
    db.upsert(mem);
    db.close();
    this.lastReadMemory = mem;
  },
);

Given("a vault containing one written memory", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
  const writer = new VaultWriter(this.vaultPath);
  const mem = makeMemory({ summary: "vault write before crash" });
  mem.filePath = writer.resolveFilePath(mem);
  writer.write(mem);
  this.lastReadMemory = mem;
});

Given(
  "the SQLite index is empty, simulating a crash after vault write but before DB upsert",
  function (this: VaultWorld) {
    const db = new IndexDB(this.indexPath);
    db.close();
  },
);

When("vault-cli index rebuild is simulated via reconcile", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const reader = new VaultReader();
  t10ReconcileResult = reconcile(db, reader, this.vaultPath);
  db.close();
});

Then("the memory is searchable in the SQLite index", function (this: VaultWorld) {
  if (!this.lastReadMemory) throw new Error("No memory stored in world");
  const db = new IndexDB(this.indexPath);
  const results = db.bm25Search("vault write before crash", 5);
  db.close();
  if (results.length === 0) throw new Error("Expected at least 1 BM25 result after reconcile");
  if (!results.some((r) => r.id === this.lastReadMemory?.id)) {
    throw new Error(`Memory ${this.lastReadMemory.id} not found in BM25 results`);
  }
});

Given("a vault with one valid memory file and one malformed md file", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
  const writer = new VaultWriter(this.vaultPath);
  const mem = makeMemory({ summary: "valid memory for malformed test" });
  mem.filePath = writer.resolveFilePath(mem);
  writer.write(mem);
  this.lastReadMemory = mem;
  const badPath = join(this.vaultPath, "01-episodic", "not-valid.md");
  writeFileSync(badPath, "no frontmatter here just garbage", "utf-8");
});

Then("only the valid memory is present in the SQLite index", function (this: VaultWorld) {
  if (!this.lastReadMemory) throw new Error("No memory stored in world");
  const db = new IndexDB(this.indexPath);
  const found = db.getById(this.lastReadMemory.id);
  const total = db.rowCount();
  db.close();
  if (found === null) throw new Error(`Valid memory ${this.lastReadMemory.id} not found in index`);
  if (total !== 1) throw new Error(`Expected 1 row in index, got ${total}`);
});
