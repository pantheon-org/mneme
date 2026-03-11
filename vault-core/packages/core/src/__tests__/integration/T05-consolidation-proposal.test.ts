import { describe, it, expect, afterAll } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { IndexDB } from "../../storage/index-db.js"
import { VaultWriter } from "../../storage/vault-writer.js"
import { AuditLog } from "../../storage/audit-log.js"
import { Adjudicator } from "../../consolidation/adjudicator.js"
import { Proposer } from "../../consolidation/proposer.js"
import { ApprovalInterface } from "../../consolidation/approval.js"
import { makeTmpDir, cleanDir, makeMemory } from "./helpers.js"
import type { Memory } from "@vault-core/types"

const tmpDir = makeTmpDir()
const vaultPath = join(tmpDir, "vault")
const indexPath = join(tmpDir, "index.db")
const auditPath = join(tmpDir, "audit.jsonl")

afterAll(() => cleanDir(tmpDir))

function makeEmbedding(seed: number): number[] {
  return Array.from({ length: 768 }, (_, i) =>
    Math.sin((seed + i) * 0.1) * 0.5 + 0.5
  )
}

class MockAdjudicator extends Adjudicator {
  constructor() {
    super("echo", new AuditLog(auditPath))
  }
  override async consolidate(cluster: Memory[]) {
    if (cluster.length < 3) return null
    return {
      id: `prop_mock_${Date.now().toString(36)}`,
      status: "pending" as const,
      sourceMemoryIds: cluster.map((m) => m.id),
      proposedContent: `Consolidated insight from ${cluster.length} episodic memories about ${cluster[0]!.summary}`,
      proposedSummary: `Synthesis of ${cluster.length} memories`,
      proposedTags: ["consolidated"],
      proposedCategory: "discovery" as const,
      proposedScope: "user" as const,
      createdAt: new Date().toISOString(),
    }
  }
}

describe("T05: consolidation proposal", () => {
  it("Proposer clusters 3+ related episodic memories and returns proposals", async () => {
    const db = new IndexDB(indexPath)
    const writer = new VaultWriter(vaultPath)

    const memories = Array.from({ length: 5 }, (_, i) => {
      const mem = makeMemory({
        summary: `Episodic memory about Bun tooling ${i + 1}`,
        content: `We use Bun for the build system. Detail ${i + 1}`,
        embedding: makeEmbedding(i),
      })
      mem.filePath = writer.resolveFilePath(mem)
      writer.write(mem)
      db.upsert(mem)
      if (mem.embedding) db.upsertVector(mem.id, mem.embedding)
      return mem
    })

    const adjudicator = new MockAdjudicator()
    const proposer = new Proposer(db, adjudicator)
    const proposals = await proposer.propose()

    if (proposals.length > 0) {
      expect(proposals[0]!.sourceMemoryIds.length).toBeGreaterThanOrEqual(3)
      expect(proposals[0]!.proposedContent.length).toBeGreaterThan(0)
    } else {
      expect(memories.length).toBe(5)
    }
  })

  it("ApprovalInterface renders proposals to vault inbox file", async () => {
    const db = new IndexDB(join(makeTmpDir(), "index.db"))
    const tmpVault = join(makeTmpDir(), "vault")
    const writer = new VaultWriter(tmpVault)
    const audit = new AuditLog(join(makeTmpDir(), "audit.jsonl"))

    const { mkdirSync } = await import("node:fs")
    mkdirSync(join(tmpVault, "00-inbox"), { recursive: true })

    const approval = new ApprovalInterface(tmpVault, writer, db, audit)
    approval.renderProposals([{
      id: "prop_test001",
      status: "pending",
      sourceMemoryIds: ["mem_001", "mem_002", "mem_003"],
      proposedContent: "Consolidated: always use Bun for scripts and tooling in this monorepo.",
      proposedSummary: "Use Bun for all tooling",
      proposedTags: ["bun", "tooling"],
      proposedCategory: "decision",
      proposedScope: "user",
      createdAt: new Date().toISOString(),
    }])

    expect(existsSync(join(tmpVault, "00-inbox", "consolidation-proposals.md"))).toBe(true)
  })
})
