import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import type { Memory } from "@vault-core/types";
import { Adjudicator } from "../../../consolidation/adjudicator.js";
import { Proposer } from "../../../consolidation/proposer.js";
import { AuditLog } from "../../../storage/audit-log.js";
import { IndexDB } from "../../../storage/index-db.js";
import { makeMemory, type VaultWorld } from "./world.js";

class AlwaysNullAdjudicator extends Adjudicator {
  constructor(auditPath: string) {
    super("echo", new AuditLog(auditPath));
  }
  override async consolidate(_cluster: Memory[]) {
    return null;
  }
}

let t05cNullProposals: Awaited<ReturnType<Proposer["propose"]>> = [];
let t05cThrew = false;

Given("episodic memories prepared for null-adjudicator testing", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
  const db = new IndexDB(this.indexPath);
  for (let i = 0; i < 3; i++) {
    db.upsert(makeMemory({ tier: "episodic" }));
  }
  db.close();
});

When(
  "the Proposer runs with an adjudicator that returns null for every cluster",
  async function (this: VaultWorld) {
    t05cThrew = false;
    try {
      const db = new IndexDB(this.indexPath);
      const adj = new AlwaysNullAdjudicator(join(this.tmpDir, "audit.jsonl"));
      const proposer = new Proposer(db, adj);
      t05cNullProposals = await proposer.propose();
      db.close();
    } catch {
      t05cThrew = true;
    }
  },
);

Then("the proposal run completes without error", function (this: VaultWorld) {
  if (t05cThrew) throw new Error("Proposer threw an error when adjudicator returned null");
});

Then("zero proposals are returned", function (this: VaultWorld) {
  if (t05cNullProposals.length !== 0) {
    throw new Error(`Expected 0 proposals, got ${t05cNullProposals.length}`);
  }
});
