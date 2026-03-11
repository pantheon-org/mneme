import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Memory } from "@vault-core/types";
import { parse } from "yaml";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export class VaultReader {
  read(filePath: string): Memory {
    const raw = readFileSync(filePath, "utf-8");
    const match = FRONTMATTER_RE.exec(raw);
    if (!match) throw new Error(`No frontmatter in ${filePath}`);

    const fm = parse(match[1] ?? "") as Record<string, unknown>;
    const content = (match[2] as string).trim();

    const updatedMs = Date.parse(fm.updated_at as string);
    const mtime = statSync(filePath).mtimeMs;
    let humanEditedAt = (fm.human_edited_at as string | null) ?? null;

    if (mtime > updatedMs + 1000 && humanEditedAt === null) {
      humanEditedAt = new Date(mtime).toISOString();
      patchHumanEditedAt(filePath, raw, humanEditedAt);
    }

    const mem: Memory = {
      id: fm.id as string,
      tier: fm.tier as Memory["tier"],
      scope: fm.scope as Memory["scope"],
      category: fm.category as Memory["category"],
      status: fm.status as Memory["status"],
      summary: fm.summary as string,
      content,
      tags: (fm.tags as string[]) ?? [],
      strength: fm.strength as number,
      importanceScore: fm.importance_score as number,
      frequencyCount: fm.frequency_count as number,
      sourceType: fm.source_type as Memory["sourceType"],
      capturedAt: fm.captured_at as string,
      updatedAt: fm.updated_at as string,
      humanEditedAt,
      filePath,
    };
    const projectId = fm.project_id as string | null;
    if (projectId !== null) mem.projectId = projectId;
    const sourceHarness = fm.source_harness as string | null;
    if (sourceHarness !== null) mem.sourceHarness = sourceHarness;
    const sourceSession = fm.source_session as string | null;
    if (sourceSession !== null) mem.sourceSession = sourceSession;
    return mem;
  }
}

function patchHumanEditedAt(filePath: string, raw: string, value: string): void {
  const patched = raw.replace(/^(human_edited_at:\s*)null$/m, `$1${value}`);
  if (patched === raw) return;
  const tmp = join(tmpdir(), `vault-patch-${Date.now()}.tmp`);
  writeFileSync(tmp, patched, "utf-8");
  renameSync(tmp, filePath);
}
