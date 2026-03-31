import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaptureInput } from "@vault-core/types";
import { CaptureQueue } from "./queue.js";

const makeInput = (): CaptureInput => ({
  content: "test content about a decision",
  sourceType: "manual",
  sourceSession: "sess-1",
  enqueuedAt: new Date().toISOString(),
});

const noop = () => undefined;

const makeDeps = () => ({
  sweep: { scan: () => [] },
  embedder: { embed: async () => [] as number[][], dimensions: 4 },
  scorer: { score: async () => null },
  writer: { resolveFilePath: () => "/tmp/x.md", write: noop },
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

describe("CaptureQueue.flush()", () => {
  let tmpDir: string;
  let pendingPath: string;
  let queue: CaptureQueue;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "queue-flush-test-"));
    pendingPath = join(tmpDir, "pending.jsonl");
    const deps = makeDeps();
    queue = new CaptureQueue(
      deps.sweep as never,
      deps.embedder as never,
      deps.scorer as never,
      deps.writer as never,
      deps.db as never,
      deps.audit as never,
      pendingPath,
    );
  });

  afterEach(() => {
    queue.destroy();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("resolves immediately when queue is empty", async () => {
    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it("resolves after draining queued items", async () => {
    queue.capture(makeInput());
    queue.capture(makeInput());
    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it("calls Bun.sleep when processBatch makes no progress", async () => {
    type Internal = { processBatch: () => Promise<void> };
    const internal = queue as unknown as Internal;

    const origProcessBatch = internal.processBatch.bind(queue);
    let callCount = 0;
    internal.processBatch = mock(async () => {
      callCount++;
      if (callCount < 3) return;
      await origProcessBatch();
    });

    queue.capture(makeInput());

    const sleepCalls: number[] = [];
    const origSleep = Bun.sleep.bind(Bun);
    const sleepSpy = mock(async (ms: number) => {
      sleepCalls.push(ms);
      return origSleep(1);
    });
    (Bun as unknown as { sleep: typeof sleepSpy }).sleep = sleepSpy;

    await queue.flush();

    expect(sleepCalls.length).toBeGreaterThan(0);
    expect(sleepCalls[0]).toBe(10);

    (Bun as unknown as { sleep: typeof origSleep }).sleep = origSleep;
  });
});
