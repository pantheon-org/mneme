import type { Memory } from "@vault-core/types";

export const rowToMemory = (row: Record<string, unknown>): Memory => {
  const mem: Memory = {
    id: row.id as string,
    tier: row.tier as Memory["tier"],
    scope: row.scope as Memory["scope"],
    category: row.category as Memory["category"],
    status: row.status as Memory["status"],
    summary: row.summary as string,
    content: row.content as string,
    tags: JSON.parse(row.tags as string) as string[],
    strength: row.strength as number,
    importanceScore: (row.importance_score as number) ?? 0,
    frequencyCount: (row.frequency_count as number) ?? 0,
    sourceType: (row.source_type as Memory["sourceType"]) ?? "manual",
    capturedAt: row.captured_at as string,
    updatedAt: row.updated_at as string,
    humanEditedAt: (row.human_edited_at as string | null) ?? null,
    filePath: row.file_path as string,
  };
  const projectId = row.project_id as string | null;
  if (projectId !== null) mem.projectId = projectId;
  return mem;
};
