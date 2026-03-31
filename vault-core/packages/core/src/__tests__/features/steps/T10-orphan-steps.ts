import { mkdirSync, rmSync } from "node:fs";
import { Given, Then } from "@cucumber/cucumber";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Given(
  "a vault with one memory indexed but its file deleted from disk",
  function (this: VaultWorld) {
    mkdirSync(this.vaultPath, { recursive: true });
    const writer = new VaultWriter(this.vaultPath);
    const db = new IndexDB(this.indexPath);
    const mem = makeMemory({ summary: "orphaned memory" });
    mem.filePath = writer.resolveFilePath(mem);
    writer.write(mem);
    db.upsert(mem);
    db.close();
    rmSync(mem.filePath);
    this.lastReadMemory = mem;
  },
);

Then("the orphaned memory is absent from the SQLite index", function (this: VaultWorld) {
  if (!this.lastReadMemory) throw new Error("No memory stored in world");
  const db = new IndexDB(this.indexPath);
  const found = db.getById(this.lastReadMemory.id);
  db.close();
  if (found !== null)
    throw new Error(`Orphaned memory ${this.lastReadMemory.id} should be deleted`);
});
