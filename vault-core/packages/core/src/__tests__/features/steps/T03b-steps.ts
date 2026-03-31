import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import { stringify } from "yaml";
import { ApprovalInterface } from "../../../consolidation/approval.js";
import { AuditLog } from "../../../storage/audit-log.js";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

let t03HeFilePath = "";
let t03HeContent = "";

Given("a human-edited memory stored in the vault and index", function (this: VaultWorld) {
  const writer = new VaultWriter(this.vaultPath);
  const now = new Date().toISOString();
  const mem = makeMemory({ summary: "Human-edited memory" });
  mem.filePath = writer.resolveFilePath(mem);
  writer.write(mem);
  mem.humanEditedAt = now;
  const db = new IndexDB(this.indexPath);
  db.upsert(mem);
  db.close();
  t03HeFilePath = mem.filePath;
  t03HeContent = readFileSync(mem.filePath, "utf-8");
  this.lastReadMemory = mem;
});

When("applyApproved is called for a proposal referencing that memory", function (this: VaultWorld) {
  if (!this.lastReadMemory) throw new Error("lastReadMemory not set");
  const mem = this.lastReadMemory;
  const fm = stringify({
    proposal_id: "prop_t03",
    status: "approved",
    source_memory_ids: [mem.id],
    proposed_category: "discovery",
    proposed_scope: "user",
    proposed_tags: [],
    created_at: new Date().toISOString(),
  }).trimEnd();
  mkdirSync(join(this.vaultPath, "00-inbox"), { recursive: true });
  writeFileSync(
    join(this.vaultPath, "00-inbox", "consolidation-proposals.md"),
    `---\n${fm}\n---\n\nConsolidated.\n`,
    "utf-8",
  );
  const db = new IndexDB(this.indexPath);
  new ApprovalInterface(
    this.vaultPath,
    new VaultWriter(this.vaultPath),
    db,
    new AuditLog(join(this.tmpDir, "audit.jsonl")),
  ).applyApproved();
  db.close();
});

Then("the vault file for the human-edited memory is not modified", function (this: VaultWorld) {
  const after = readFileSync(t03HeFilePath, "utf-8");
  if (after !== t03HeContent) throw new Error("applyApproved modified a human-edited vault file");
});
