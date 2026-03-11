export type MemoryTier = "episodic" | "semantic" | "procedural";
export type MemoryScope = "user" | "project";
export type MemoryStatus = "active" | "superseded" | "archived";
export type MemoryCategory =
  | "decision"
  | "constraint"
  | "pattern"
  | "bugfix"
  | "discovery"
  | "preference";

export interface Memory {
  id: string;
  tier: MemoryTier;
  scope: MemoryScope;
  category: MemoryCategory;
  status: MemoryStatus;
  summary: string;
  content: string;
  tags: string[];
  projectId?: string;
  strength: number;
  importanceScore: number;
  frequencyCount: number;
  sourceType: "hook" | "cli" | "manual";
  sourceHarness?: string;
  sourceSession?: string;
  capturedAt: string;
  updatedAt: string;
  humanEditedAt?: string | null;
  filePath: string;
  embedding?: number[];
}
