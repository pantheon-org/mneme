import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Memory } from "@vault-core/types";
import { stringify } from "yaml";

const TIER_DIR: Record<string, string> = {
  episodic: "01-episodic",
  semantic: "02-semantic",
  procedural: "03-procedural",
  archive: "04-archive",
};

export class VaultWriter {
  constructor(private readonly vaultPath: string) {}

  write(memory: Memory): void {
    if (memory.humanEditedAt !== null && memory.humanEditedAt !== undefined) return;
    const filePath = this.resolveFilePath(memory);
    mkdirSync(dirname(filePath), { recursive: true });
    const content = renderMarkdown(memory);
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, content, "utf-8");
    renameSync(tmp, filePath);
  }

  resolveFilePath(memory: Memory): string {
    const dir = TIER_DIR[memory.tier] ?? "00-inbox";
    const slug = memory.id.replace("mem_", "");
    return join(this.vaultPath, dir, `${slug}.md`);
  }
}

const renderMarkdown = (memory: Memory): string => {
  const frontmatter: Record<string, unknown> = {
    id: memory.id,
    tier: memory.tier,
    scope: memory.scope,
    category: memory.category,
    status: memory.status,
    summary: memory.summary,
    tags: memory.tags,
    project_id: memory.projectId ?? null,
    strength: memory.strength,
    importance_score: memory.importanceScore,
    frequency_count: memory.frequencyCount,
    source_type: memory.sourceType,
    source_harness: memory.sourceHarness ?? null,
    source_session: memory.sourceSession ?? null,
    captured_at: memory.capturedAt,
    updated_at: memory.updatedAt,
    human_edited_at: memory.humanEditedAt ?? null,
  };
  return `---\n${stringify(frontmatter).trimEnd()}\n---\n\n${memory.content}\n`;
};
