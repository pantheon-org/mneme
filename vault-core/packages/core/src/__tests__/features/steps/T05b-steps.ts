import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import { ApprovalInterface } from "../../../consolidation/approval.js";
import { AuditLog } from "../../../storage/audit-log.js";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import type { VaultWorld } from "./world.js";

Given("a vault inbox with an existing consolidation proposal", function (this: VaultWorld) {
  mkdirSync(join(this.vaultPath, "00-inbox"), { recursive: true });
  const db = new IndexDB(this.indexPath);
  const writer = new VaultWriter(this.vaultPath);
  const audit = new AuditLog(join(this.tmpDir, "audit.jsonl"));
  const approval = new ApprovalInterface(this.vaultPath, writer, db, audit);
  approval.renderProposals([
    {
      id: "prop_existing_001",
      status: "pending",
      sourceMemoryIds: ["mem_001"],
      proposedContent: "First proposal content.",
      proposedSummary: "First proposal",
      proposedTags: ["existing"],
      proposedCategory: "decision",
      proposedScope: "user",
      createdAt: new Date().toISOString(),
    },
  ]);
  db.close();
});

When("the ApprovalInterface renders a second proposal", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const writer = new VaultWriter(this.vaultPath);
  const audit = new AuditLog(join(this.tmpDir, "audit.jsonl"));
  const approval = new ApprovalInterface(this.vaultPath, writer, db, audit);
  approval.renderProposals([
    {
      id: "prop_new_002",
      status: "pending",
      sourceMemoryIds: ["mem_002"],
      proposedContent: "Second proposal content.",
      proposedSummary: "Second proposal",
      proposedTags: ["new"],
      proposedCategory: "decision",
      proposedScope: "user",
      createdAt: new Date().toISOString(),
    },
  ]);
  db.close();
});

const readProposalBlocks = (vaultPath: string): string[] => {
  const filePath = join(vaultPath, "00-inbox", "consolidation-proposals.md");
  if (!existsSync(filePath)) throw new Error("consolidation-proposals.md not found");
  return readFileSync(filePath, "utf-8").split("\n---separator---\n").filter(Boolean);
};

Then(
  "the vault inbox file contains {int} proposal blocks",
  function (this: VaultWorld, count: number) {
    const blocks = readProposalBlocks(this.vaultPath);
    if (blocks.length !== count) {
      throw new Error(`Expected ${count} proposal blocks but found ${blocks.length}`);
    }
  },
);

Then("the first proposal block has id {string}", function (this: VaultWorld, id: string) {
  const blocks = readProposalBlocks(this.vaultPath);
  if (!blocks[0]?.includes(`proposal_id: ${id}`)) {
    throw new Error(`Expected first block to have id "${id}"`);
  }
});

Then("the second proposal block has id {string}", function (this: VaultWorld, id: string) {
  const blocks = readProposalBlocks(this.vaultPath);
  if (!blocks[1]?.includes(`proposal_id: ${id}`)) {
    throw new Error(`Expected second block to have id "${id}"`);
  }
});
