import { appendFile } from "node:fs";
import type { Memory } from "@vault-core/types";
import type { IndexDB } from "../storage/index-db.js";
import type { Adjudicator } from "./adjudicator.js";
import type { ConsolidationProposal } from "./consolidation-proposal.js";

const COSINE_THRESHOLD = 0.85;
const MIN_CLUSTER_SIZE = 3;

const cosine = (a: number[], b: number[]): number => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] as number) * (b[i] as number);
    na += (a[i] as number) ** 2;
    nb += (b[i] as number) ** 2;
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
};

const centroid = (embeddings: number[][]): number[] => {
  if (embeddings.length === 0) return [];
  const dims = embeddings[0]?.length ?? 0;
  const sum = new Array<number>(dims).fill(0);
  for (const e of embeddings) {
    for (let i = 0; i < dims; i++) sum[i] = (sum[i] ?? 0) + (e[i] ?? 0);
  }
  return sum.map((v) => v / embeddings.length);
};

const clusterByEmbedding = (memories: Memory[]): Memory[][] => {
  const withEmbedding = memories.filter((m) => m.embedding && m.embedding.length > 0);
  const clusters: Memory[][] = [];

  for (const mem of withEmbedding) {
    let placed = false;
    for (const cluster of clusters) {
      const clusterEmbeddings = cluster.map((m) => m.embedding as number[]);
      const c = centroid(clusterEmbeddings);
      if (cosine(mem.embedding as number[], c) >= COSINE_THRESHOLD) {
        cluster.push(mem);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([mem]);
  }

  return clusters.filter((c) => c.length >= MIN_CLUSTER_SIZE);
};

export class Proposer {
  constructor(
    private readonly db: IndexDB,
    private readonly adjudicator: Adjudicator,
    private readonly queuePath = "",
  ) {}

  async propose(projectId?: string): Promise<ConsolidationProposal[]> {
    const episodic = this.db.getByTier("episodic", projectId, true);
    const clusters = clusterByEmbedding(episodic);

    const proposals: ConsolidationProposal[] = [];

    for (const cluster of clusters) {
      const proposal = await this.adjudicator.consolidate(cluster);
      if (!proposal) continue;
      if (this.queuePath) {
        void appendFile(this.queuePath, `${JSON.stringify(proposal)}\n`, "utf-8", () => undefined);
      }
      proposals.push(proposal);
    }

    return proposals;
  }
}
