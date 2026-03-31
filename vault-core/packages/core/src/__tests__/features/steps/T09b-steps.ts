import { mkdirSync } from "node:fs";
import { Given, Then, When } from "@cucumber/cucumber";
import type { RankedMemory } from "@vault-core/types";
import { HybridRetriever } from "../../../retrieval/retriever.js";
import type { Embedder } from "../../../scoring/embedder.js";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

const makeEmb9b = (seed: number): number[] =>
  Array.from({ length: 4 }, (_, i) => Math.sin((seed + i) * 0.3));

let t09bResults: RankedMemory[] = [];
let t09bOverlapId = "";

Given(
  "an index database with 5 memories with both text and vector content",
  function (this: VaultWorld) {
    mkdirSync(this.vaultPath, { recursive: true });
    const db = new IndexDB(this.indexPath);
    const writer = new VaultWriter(this.vaultPath);

    const overlapMem = makeMemory({
      summary: "typescript bun runtime tooling",
      content: "typescript bun runtime tooling details",
      embedding: makeEmb9b(0),
    });
    overlapMem.filePath = writer.resolveFilePath(overlapMem);
    writer.write(overlapMem);
    db.upsert(overlapMem);
    db.upsertVector(overlapMem.id, makeEmb9b(0));
    t09bOverlapId = overlapMem.id;

    for (let i = 1; i < 5; i++) {
      const mem = makeMemory({
        summary: `unrelated memory ${i}`,
        content: `unrelated content ${i}`,
        embedding: makeEmb9b(i * 10),
      });
      mem.filePath = writer.resolveFilePath(mem);
      writer.write(mem);
      db.upsert(mem);
      db.upsertVector(mem.id, makeEmb9b(i * 10));
    }
    db.close();
  },
);

When(
  "memories are retrieved with both BM25 and vector embeddings for query {string}",
  async function (this: VaultWorld, query: string) {
    const db = new IndexDB(this.indexPath);
    const vecEmb: Embedder = {
      embed: async (ts: string[]) => ts.map(() => makeEmb9b(0)),
      dimensions: 4,
    };
    t09bResults = await new HybridRetriever(db, vecEmb).retrieve({ text: query });
    db.close();
  },
);

Then(
  "the memory present in both BM25 and vector results ranks highest",
  function (this: VaultWorld) {
    if (t09bResults.length === 0) throw new Error("No results returned");
    const topResult = t09bResults[0];
    if (!topResult) throw new Error("No top result");
    if (topResult.memory.id !== t09bOverlapId) {
      throw new Error(
        `Expected overlap memory (${t09bOverlapId}) to rank first, got ${topResult.memory.id}`,
      );
    }
    if (topResult.bm25Rank === 0 || topResult.vectorRank === 0) {
      throw new Error("Top result should have non-zero bm25Rank and vectorRank (RRF overlap)");
    }
  },
);
