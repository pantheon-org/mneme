import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import type { Memory, MemoryCategory, MemoryScope } from "@vault-core/types";
import type { AuditLog } from "../storage/audit-log.js";
import type { ConsolidationProposal } from "./proposer.js";
import { validCategory, validScope } from "./validation-helpers.js";

const execFileAsync = promisify(execFile);
const INFERENCE_TIMEOUT_MS = 30_000;

export interface ConflictResolution {
  action: "keep_existing" | "keep_incoming" | "merge";
  rationale: string;
  mergedContent?: string;
}

interface ConsolidationResult {
  proposedContent?: string;
  proposedSummary?: string;
  proposedTags?: string[];
  proposedCategory?: MemoryCategory;
  proposedScope?: MemoryScope;
}

interface ConflictResult {
  action?: "keep_existing" | "keep_incoming" | "merge";
  rationale?: string;
  mergedContent?: string;
}

export class Adjudicator {
  constructor(
    private readonly inferenceCommand: string,
    private readonly audit: AuditLog,
  ) {}

  async resolveConflict(existing: Memory, incoming: Memory): Promise<ConflictResolution> {
    const payload = JSON.stringify({
      task: "conflict_resolution",
      existing: { id: existing.id, summary: existing.summary, content: existing.content },
      incoming: { id: incoming.id, summary: incoming.summary, content: incoming.content },
      instruction:
        "Decide whether to keep the existing memory, replace with incoming, or merge them. Return JSON with action, rationale, and optionally mergedContent.",
    });

    const raw = (await this.callInference(payload)) as ConflictResult;
    const resolution: ConflictResolution = {
      action: raw.action ?? "keep_existing",
      rationale: raw.rationale ?? "inference unavailable",
    };
    if (raw.mergedContent) resolution.mergedContent = raw.mergedContent;

    this.audit.append({
      ts: new Date().toISOString(),
      op: "adjudicate",
      memoryId: incoming.id,
      detail: JSON.stringify({
        type: "conflict",
        existingId: existing.id,
        resolution: resolution.action,
      }),
    });

    return resolution;
  }

  async consolidate(cluster: Memory[]): Promise<ConsolidationProposal | null> {
    const payload = JSON.stringify({
      task: "consolidation",
      memories: cluster.map((m) => ({ id: m.id, summary: m.summary, content: m.content })),
      instruction:
        "Synthesise these episodic memories into a single semantic memory. Return JSON with proposedContent, proposedSummary, proposedTags (array), proposedCategory, proposedScope.",
    });

    const raw = (await this.callInference(payload)) as ConsolidationResult;
    if (!raw.proposedContent) return null;

    const proposal: ConsolidationProposal = {
      id: `prop_${randomUUID()}`,
      status: "pending",
      sourceMemoryIds: cluster.map((m) => m.id),
      proposedContent: raw.proposedContent,
      proposedSummary: raw.proposedSummary ?? raw.proposedContent.slice(0, 120).replace(/\n/g, " "),
      proposedTags: raw.proposedTags ?? [],
      proposedCategory: validCategory(raw.proposedCategory),
      proposedScope: validScope(raw.proposedScope ?? cluster[0]?.scope),
      createdAt: new Date().toISOString(),
    };

    this.audit.append({
      ts: proposal.createdAt,
      op: "consolidate",
      detail: JSON.stringify({ proposalId: proposal.id, sourceCount: cluster.length }),
    });

    return proposal;
  }

  private async callInference(payload: string): Promise<Record<string, unknown>> {
    try {
      const parts = this.inferenceCommand.split(/\s+/);
      const [cmd, ...args] = parts as [string, ...string[]];
      const { stdout } = await execFileAsync(cmd, [...args, payload], {
        timeout: INFERENCE_TIMEOUT_MS,
      });
      return JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
