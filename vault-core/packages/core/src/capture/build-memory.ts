import { randomUUID } from "node:crypto";
import type { CaptureInput, Memory, MemoryScope, MemoryTier } from "@vault-core/types";

export const buildMemory = (
  input: CaptureInput,
  compositeScore: number,
  embedding?: number[],
): Memory => {
  const id = `mem_${randomUUID()}`;
  const tier: MemoryTier = input.hints?.tier ?? "episodic";
  const scope: MemoryScope = input.projectId ? "project" : "user";
  const now = new Date().toISOString();

  const mem: Memory = {
    id,
    tier,
    scope,
    category: input.hints?.category ?? "discovery",
    status: "active",
    summary: input.content.slice(0, 120).replace(/\n/g, " "),
    content: input.content,
    tags: input.hints?.tags ?? [],
    strength: compositeScore,
    importanceScore: compositeScore,
    frequencyCount: 1,
    sourceType: input.sourceType,
    capturedAt: now,
    updatedAt: now,
    humanEditedAt: null,
    filePath: "",
  };

  if (input.projectId) mem.projectId = input.projectId;
  if (input.sourceHarness) mem.sourceHarness = input.sourceHarness;
  if (input.sourceSession) mem.sourceSession = input.sourceSession;
  if (embedding) mem.embedding = embedding;

  return mem;
};
