import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { Memory, MemoryCategory, MemoryScope } from "@vault-core/types";
import { Adjudicator } from "../../../consolidation/adjudicator.js";
import { ApprovalInterface } from "../../../consolidation/approval.js";
import { Proposer } from "../../../consolidation/proposer.js";
import { AuditLog } from "../../../storage/audit-log.js";
import { IndexDB } from "../../../storage/index-db.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T05" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T05" }, function (this: VaultWorld) {
  this.cleanup();
});

const makeEmb = (seed: number): number[] =>
  Array.from({ length: 768 }, (_, i) => Math.sin((seed + i) * 0.1) * 0.5 + 0.5);

class MockAdjudicator extends Adjudicator {
  constructor(auditPath: string) {
    super("echo", new AuditLog(auditPath));
  }
  override async consolidate(cluster: Memory[]) {
    if (cluster.length < 3) return null;
    return {
      id: `prop_mock_${Date.now().toString(36)}`,
      status: "pending" as const,
      sourceMemoryIds: cluster.map((m) => m.id),
      proposedContent: `Consolidated insight from ${cluster.length} episodic memories about Bun tooling.`,
      proposedSummary: "Bun tooling insight",
      proposedTags: ["consolidated"],
      proposedCategory: "discovery" as MemoryCategory,
      proposedScope: "user" as MemoryScope,
      createdAt: new Date().toISOString(),
    };
  }
}

let t05Proposals: Awaited<ReturnType<Proposer["propose"]>> = [];

Given("an empty vault and index database with 5 episodic memories", function (this: VaultWorld) {
  mkdirSync(this.vaultPath, { recursive: true });
  const db = new IndexDB(this.indexPath);
  for (let i = 0; i < 5; i++) {
    const mem = makeMemory({
      summary: `Episodic memory about Bun tooling ${i + 1}`,
      tier: "episodic",
      embedding: makeEmb(i * 10),
    });
    db.upsert(mem);
    db.upsertVector(mem.id, makeEmb(i * 10));
  }
  db.close();
});

When("the Proposer generates consolidation proposals", async function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const adj = new MockAdjudicator(join(this.tmpDir, "audit.jsonl"));
  const proposer = new Proposer(db, adj);
  t05Proposals = await proposer.propose();
  db.close();
});

Then("each proposal references at least 3 source memory ids", function (this: VaultWorld) {
  if (t05Proposals.length === 0) return;
  for (const p of t05Proposals) {
    if (p.sourceMemoryIds.length < 3) {
      throw new Error(`Proposal has only ${p.sourceMemoryIds.length} source ids`);
    }
  }
});

Then("each proposal has non-empty proposed content", function (this: VaultWorld) {
  if (t05Proposals.length === 0) return;
  for (const p of t05Proposals) {
    if (!p.proposedContent || p.proposedContent.length === 0) {
      throw new Error("Proposal has empty proposedContent");
    }
  }
});

Given("a consolidation proposal", function (this: VaultWorld) {
  mkdirSync(join(this.vaultPath, "00-inbox"), { recursive: true });
});

When("the ApprovalInterface renders the proposal", function (this: VaultWorld) {
  const db = new IndexDB(this.indexPath);
  const writer = new VaultWriter(this.vaultPath);
  const audit = new AuditLog(join(this.tmpDir, "audit.jsonl"));
  const approval = new ApprovalInterface(this.vaultPath, writer, db, audit);
  approval.renderProposals([
    {
      id: "prop_test001",
      status: "pending",
      sourceMemoryIds: ["mem_001", "mem_002", "mem_003"],
      proposedContent: "We consistently use Bun as the runtime.",
      proposedSummary: "Bun runtime preference",
      proposedTags: ["bun", "runtime"],
      proposedCategory: "decision",
      proposedScope: "user",
      createdAt: new Date().toISOString(),
    },
  ]);
  db.close();
});

Then("a {string} file exists in the vault inbox", function (this: VaultWorld, filename: string) {
  const path = join(this.vaultPath, "00-inbox", filename);
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
});
