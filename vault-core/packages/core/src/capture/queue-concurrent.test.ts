import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaptureInput } from "@vault-core/types";
import { CaptureQueue } from "./queue.js";

const noop = () => undefined;

const makeFakeDeps = () => ({
  sweep: { scan: () => [] },
  embedder: { embed: async () => [[]] as number[][], dimensions: 4 },
  scorer: { score: async () => null },
  writer: { resolveFilePath: () => "/tmp/fake.md", write: noop },
  db: {
    upsert: noop,
    upsertVector: noop,
    getByIds: () => [],
    bm25Search: () => [],
    knnSearch: () => [],
    getByTier: () => [],
  },
  audit: { append: noop },
});

describe("CaptureQueue concurrent writes", () => {
  let tmpDir: string;
  let pendingPath: string;
  let queue: CaptureQueue;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "queue-test-"));
    pendingPath = join(tmpDir, "pending.jsonl");
  });

  afterEach(() => {
    queue.destroy();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not interleave JSONL lines when capture() is called concurrently", () => {
    const deps = makeFakeDeps();
    queue = new CaptureQueue(
      deps.sweep as never,
      deps.embedder as never,
      deps.scorer as never,
      deps.writer as never,
      deps.db as never,
      deps.audit as never,
      pendingPath,
    );

    const concurrency = 20;
    const inputs: CaptureInput[] = Array.from({ length: concurrency }, (_, i) => ({
      content: `concurrent capture ${i}`,
      sourceType: "manual" as const,
    }));

    for (const input of inputs) queue.capture(input);

    const raw = readFileSync(pendingPath, "utf-8");
    const lines = raw.split("\n").filter(Boolean);

    expect(lines.length).toBe(concurrency);

    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      const parsed = JSON.parse(line) as Record<string, unknown>;
      expect(typeof parsed.content).toBe("string");
    }
  });
});
