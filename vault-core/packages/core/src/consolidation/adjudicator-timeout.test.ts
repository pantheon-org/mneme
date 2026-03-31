import { describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuditLog } from "../storage/audit-log.js";
import { Adjudicator } from "./adjudicator.js";

const makeAudit = async (): Promise<AuditLog> => {
  const dir = join(tmpdir(), `audit-test-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return new AuditLog(join(dir, "audit.jsonl"));
};

describe("Adjudicator.callInference timeout", () => {
  it("resolves to {} when subprocess exceeds timeout", async () => {
    const adj = new Adjudicator("sleep 10", await makeAudit(), 100);
    const start = Date.now();
    const result = await adj.resolveConflict(
      {
        id: "a",
        tier: "episodic",
        scope: "user",
        category: "decision",
        status: "active",
        summary: "A",
        content: "A content",
        tags: [],
        strength: 0.5,
        importanceScore: 0.5,
        frequencyCount: 1,
        sourceType: "manual",
        capturedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        humanEditedAt: null,
        filePath: "",
      },
      {
        id: "b",
        tier: "episodic",
        scope: "user",
        category: "decision",
        status: "active",
        summary: "B",
        content: "B content",
        tags: [],
        strength: 0.5,
        importanceScore: 0.5,
        frequencyCount: 1,
        sourceType: "manual",
        capturedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        humanEditedAt: null,
        filePath: "",
      },
    );
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
    expect(result.action).toBe("keep_existing");
    expect(result.rationale).toBe("inference unavailable");
  });
});
