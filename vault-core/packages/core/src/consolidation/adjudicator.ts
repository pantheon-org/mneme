import { randomUUID } from "node:crypto";
import type { Memory, MemoryCategory, MemoryScope } from "@vault-core/types";
import type { AuditLog } from "../storage/audit-log.js";
import type { ConsolidationProposal } from "./consolidation-proposal.js";
import { validCategory, validScope } from "./validation-helpers.js";

const parseCommand = (cmd: string): string[] => {
  const result: string[] = [];
  const re = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;
  for (;;) {
    const m = re.exec(cmd);
    if (m === null) break;
    result.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return result;
};

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

const INFERENCE_TIMEOUT_MS = 30_000;

export class Adjudicator {
  constructor(
    private readonly inferenceCommand: string,
    private readonly audit: AuditLog,
    private readonly timeoutMs: number = INFERENCE_TIMEOUT_MS,
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
      const [cmd, ...args] = parseCommand(this.inferenceCommand);
      if (!cmd) return {};
      const proc = Bun.spawn([cmd, ...args], {
        stdin: Buffer.from(payload, "utf-8"),
        stdout: "pipe",
        stderr: "ignore",
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => {
          proc.kill();
          reject(new Error("inference timeout"));
        }, this.timeoutMs),
      );
      const stdout = await Promise.race([new Response(proc.stdout).text(), timeout]);
      const exit = await proc.exited;
      if (exit !== 0) return {};
      return JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
