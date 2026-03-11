import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Memory, MemoryCategory, MemoryScope } from "@vault-core/types";
import type { IndexDB } from "../storage/index-db.js";
import type { Adjudicator } from "./adjudicator.js";

const QUEUE_PATH = join(homedir(), ".vault-core", "consolidation-queue.jsonl");
const CLUSTER_THRESHOLD = 0.3;
const MIN_CLUSTER_SIZE = 3;

export interface ConsolidationProposal {
  id: string;
  status: "pending" | "approved" | "rejected";
  sourceMemoryIds: string[];
  proposedContent: string;
  proposedSummary: string;
  proposedTags: string[];
  proposedCategory: MemoryCategory;
  proposedScope: MemoryScope;
  createdAt: string;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) ** 2;
    normB += (b[i] ?? 0) ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clusterByEmbedding(memories: Memory[]): Memory[][] {
  const assigned = new Set<string>();
  const clusters: Memory[][] = [];

  for (const mem of memories) {
    if (assigned.has(mem.id) || !mem.embedding?.length) continue;
    const cluster: Memory[] = [mem];
    assigned.add(mem.id);

    for (const other of memories) {
      if (assigned.has(other.id) || !other.embedding?.length) continue;
      const dist = 1 - cosine(mem.embedding, other.embedding);
      if (dist < CLUSTER_THRESHOLD) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    if (cluster.length >= MIN_CLUSTER_SIZE) clusters.push(cluster);
  }

  return clusters;
}

export class Proposer {
  constructor(
    private readonly db: IndexDB,
    private readonly adjudicator: Adjudicator,
  ) {
    mkdirSync(dirname(QUEUE_PATH), { recursive: true });
  }

  async propose(projectId?: string): Promise<ConsolidationProposal[]> {
    const episodics = this.db.getByTier("episodic", projectId, true);
    const clusters = clusterByEmbedding(episodics);
    const proposals: ConsolidationProposal[] = [];

    for (const cluster of clusters) {
      const proposal = await this.adjudicator.consolidate(cluster);
      if (!proposal) continue;
      proposals.push(proposal);
      appendFileSync(QUEUE_PATH, `${JSON.stringify(proposal)}\n`, "utf-8");
    }

    return proposals;
  }
}
