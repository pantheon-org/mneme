import type { MemoryCategory, MemoryScope } from "@vault-core/types";

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
