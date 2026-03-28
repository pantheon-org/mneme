import { mkdirSync } from "node:fs";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { RankedMemory } from "@vault-core/types";
import { Injector } from "../../../retrieval/injector.js";
import { HybridRetriever } from "../../../retrieval/retriever.js";
import type { Embedder } from "../../../scoring/embedder.js";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, makeRankedMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T09" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T09" }, function (this: VaultWorld) {
  this.cleanup();
});

const injector = new Injector();
const nullEmb: Embedder = { embed: async (ts: string[]) => ts.map(() => []), dimensions: 768 };
let t09Results: RankedMemory[] = [],
  t09HumanId = "",
  t09NormalId = "";

Given(
  "an index database with a human-edited memory and a normal memory",
  function (this: VaultWorld) {
    mkdirSync(this.vaultPath, { recursive: true });
    const db = new IndexDB(this.indexPath);
    const writer = new VaultWriter(this.vaultPath);
    const humanMem = makeMemory({
      summary: "Human-edited memory",
      humanEditedAt: new Date().toISOString(),
    });
    const normalMem = makeMemory({ summary: "Normal memory about vault core" });
    for (const mem of [humanMem, normalMem]) {
      mem.filePath = writer.resolveFilePath(mem);
      writer.write(mem);
      db.upsert(mem);
    }
    t09HumanId = humanMem.id;
    t09NormalId = normalMem.id;
    db.close();
  },
);

When("memories are retrieved for query {string}", async function (this: VaultWorld, query: string) {
  const db = new IndexDB(this.indexPath);
  t09Results = await new HybridRetriever(db, nullEmb).retrieve({ text: query });
  db.close();
});

Then(
  "the human-edited memory ranks before the normal memory if both are returned",
  function (this: VaultWorld) {
    const hIdx = t09Results.findIndex((m) => m.memory.id === t09HumanId);
    const nIdx = t09Results.findIndex((m) => m.memory.id === t09NormalId);
    if (hIdx !== -1 && nIdx !== -1 && hIdx >= nIdx) {
      throw new Error(`Expected human-edited (idx ${hIdx}) before normal (idx ${nIdx})`);
    }
  },
);

Given("50 ranked memories", function (this: VaultWorld) {
  this.rankedMems = Array.from({ length: 50 }, () =>
    makeRankedMemory(makeMemory({ summary: "Ranked memory", content: "X".repeat(100) }), 0.5),
  );
});

When(
  "the injector formats {int} memories with a budget of {int} tokens",
  function (this: VaultWorld, _n: number, budget: number) {
    const block = injector.format(this.rankedMems, budget);
    this.memoriesIncluded = block.memoriesIncluded;
    this.tokenEstimate = block.tokenEstimate;
    this.markdown = block.markdown;
  },
);

Then("fewer than {int} memories are included", function (this: VaultWorld, limit: number) {
  if (this.memoriesIncluded >= limit)
    throw new Error(`Expected fewer than ${limit}, got ${this.memoriesIncluded}`);
});

Given("no ranked memories for retrieval ranking", function (this: VaultWorld) {
  this.rankedMems = [];
});

Then("the markdown output for retrieval ranking is empty", function (this: VaultWorld) {
  if (this.markdown !== "") throw new Error("Expected empty markdown");
});

Given("an index database with several memories", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
  const db = new IndexDB(this.indexPath);
  const writer = new VaultWriter(this.vaultPath);
  const mems = Array.from({ length: 5 }, (_, i) =>
    makeMemory({ summary: `Memory ${i}`, content: `Content ${i}` }),
  );
  for (const mem of mems) {
    mem.filePath = writer.resolveFilePath(mem);
    writer.write(mem);
    db.upsert(mem);
  }
  db.close();
});

When("memories are retrieved with topK of {int}", async function (this: VaultWorld, topK: number) {
  const db = new IndexDB(this.indexPath);
  t09Results = await new HybridRetriever(db, nullEmb).retrieve({ text: "memory", topK });
  db.close();
});

Then("at most {int} results are returned", function (this: VaultWorld, max: number) {
  if (t09Results.length > max)
    throw new Error(`Expected ≤${max} results, got ${t09Results.length}`);
});
