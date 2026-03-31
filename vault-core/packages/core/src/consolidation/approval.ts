import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Memory } from "@vault-core/types";
import { parse, stringify } from "yaml";
import type { AuditLog } from "../storage/audit-log.js";
import type { IndexDB } from "../storage/index-db.js";
import type { VaultWriter } from "../storage/vault-writer.js";
import type { ConsolidationProposal } from "./consolidation-proposal.js";
import { validCategory, validScope } from "./validation-helpers.js";

const PROPOSALS_FILE = "00-inbox/consolidation-proposals.md";

export class ApprovalInterface {
  constructor(
    private readonly vaultPath: string,
    private readonly writer: VaultWriter,
    private readonly db: IndexDB,
    private readonly audit: AuditLog,
  ) {}

  renderProposals(proposals: ConsolidationProposal[]): void {
    if (proposals.length === 0) return;
    const blocks = proposals.map((p) => {
      const fm = stringify({
        proposal_id: p.id,
        status: p.status,
        source_memory_ids: p.sourceMemoryIds,
        proposed_category: p.proposedCategory,
        proposed_scope: p.proposedScope,
        proposed_tags: p.proposedTags,
        created_at: p.createdAt,
      }).trimEnd();
      return `---\n${fm}\n---\n\n${p.proposedContent}\n`;
    });
    const filePath = join(this.vaultPath, PROPOSALS_FILE);
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, blocks.join("\n---separator---\n"), "utf-8");
    renameSync(tmp, filePath);
  }

  applyApproved(): { approved: number; rejected: number } {
    const filePath = join(this.vaultPath, PROPOSALS_FILE);
    if (!existsSync(filePath)) return { approved: 0, rejected: 0 };
    const blocks = readFileSync(filePath, "utf-8").split("\n---separator---\n").filter(Boolean);
    let approved = 0;
    let rejected = 0;
    const now = new Date().toISOString();
    const pendingBlocks: string[] = [];
    for (const block of blocks) {
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(block.trim());
      if (!match) continue;
      const fm = parse(match[1] ?? "") as Record<string, unknown>;
      const content = (match[2] as string).trim();
      const status = fm.status as string;
      if (status === "approved") {
        this.writeSemanticNote(fm, content, now);
        const sourceIds = (fm.source_memory_ids as string[]) ?? [];
        for (const id of sourceIds) this.markSuperseded(id, now);
        approved++;
      } else if (status === "rejected") {
        this.audit.append({
          ts: now,
          op: "consolidate",
          detail: JSON.stringify({ decision: "rejected", proposalId: fm.proposal_id }),
        });
        rejected++;
      } else {
        pendingBlocks.push(block);
      }
    }
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, pendingBlocks.join("\n---separator---\n"), "utf-8");
    renameSync(tmp, filePath);
    return { approved, rejected };
  }

  private writeSemanticNote(fm: Record<string, unknown>, content: string, now: string): void {
    const memory: Memory = {
      id: `mem_${randomUUID()}`,
      tier: "semantic",
      scope: validScope(fm.proposed_scope),
      category: validCategory(fm.proposed_category),
      status: "active",
      summary: content.slice(0, 120).replace(/\n/g, " "),
      content,
      tags: (fm.proposed_tags as string[]) ?? [],
      strength: 1.0,
      importanceScore: 0.9,
      frequencyCount: 1,
      sourceType: "cli",
      capturedAt: now,
      updatedAt: now,
      humanEditedAt: null,
      filePath: "",
    };
    memory.filePath = this.writer.resolveFilePath(memory);
    this.writer.write(memory);
    this.db.upsert(memory);
    this.audit.append({ ts: now, op: "consolidate", memoryId: memory.id });
  }

  private markSuperseded(id: string, now: string): void {
    this.db.updateStatus(id, "superseded");
    const memory = this.db.getById(id);
    if (memory?.humanEditedAt) return;
    if (memory?.filePath) {
      const raw = readFileSync(memory.filePath, "utf-8");
      const patched = raw.replace(/^(status:\s*)active$/m, "$1superseded");
      if (patched !== raw) {
        writeFileSync(`${memory.filePath}.tmp`, patched, "utf-8");
        renameSync(`${memory.filePath}.tmp`, memory.filePath);
      }
    }
    this.audit.append({ ts: now, op: "supersede", memoryId: id });
  }
}
