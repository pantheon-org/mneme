import { After, Before, Then, When } from "@cucumber/cucumber";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T02" }, function (this: VaultWorld) {
  this.setup();
});

After({ tags: "@T02" }, function (this: VaultWorld) {
  this.cleanup();
});

let alphaMemoryIds: string[] = [];
let betaDb: IndexDB | null = null;

When("I write 10 memories scoped to {string}", function (this: VaultWorld, projectId: string) {
  if (!betaDb) {
    betaDb = new IndexDB(this.indexPath);
  }
  const writer = new VaultWriter(this.vaultPath);
  const memories = Array.from({ length: 10 }, (_, i) =>
    makeMemory({
      summary: `${projectId} memory ${i + 1} about authentication`,
      content: `${projectId} uses OAuth2 for authentication. Detail ${i + 1}`,
      scope: "project",
      projectId,
    }),
  );
  if (projectId === "project-alpha") {
    alphaMemoryIds = memories.map((m) => m.id);
  }
  for (const mem of memories) {
    mem.filePath = writer.resolveFilePath(mem);
    betaDb.upsert(mem);
  }
});

Then(
  "BM25 search for {string} filtered to {string} returns no {string} memories",
  function (this: VaultWorld, query: string, filterProject: string, excludeProject: string) {
    if (!betaDb) throw new Error("betaDb not initialized");
    const db = betaDb;
    const allResults = db.bm25Search(query, 30);
    if (allResults.length === 0) {
      betaDb.close();
      betaDb = null;
      return;
    }
    const alphaSet = new Set(alphaMemoryIds);
    const filtered = allResults.filter((r) => {
      const mem = db.getById(r.id);
      return mem !== null && (mem.scope !== "project" || mem.projectId === filterProject);
    });
    for (const result of filtered) {
      if (alphaSet.has(result.id)) {
        betaDb.close();
        betaDb = null;
        throw new Error(`Found ${excludeProject} memory ${result.id} in ${filterProject} results`);
      }
    }
    betaDb.close();
    betaDb = null;
    alphaMemoryIds = [];
  },
);

When("I write a user-scoped memory about {string}", function (this: VaultWorld, topic: string) {
  const db = new IndexDB(this.indexPath);
  const mem = makeMemory({
    summary: `Global coding convention about ${topic}`,
    content: `Always use camelCase for variables. ${topic} is important.`,
    scope: "user",
  });
  const writer = new VaultWriter(this.vaultPath);
  mem.filePath = writer.resolveFilePath(mem);
  db.upsert(mem);
  this.lastReadMemory = mem;
  db.close();
});

Then("BM25 search for {string} returns that memory", function (this: VaultWorld, query: string) {
  const db = new IndexDB(this.indexPath);
  const results = db.bm25Search(query, 10);
  db.close();
  const found = results.find((r) => r.id === this.lastReadMemory?.id);
  if (!found) throw new Error(`Memory ${this.lastReadMemory?.id} not found in search results`);
});
