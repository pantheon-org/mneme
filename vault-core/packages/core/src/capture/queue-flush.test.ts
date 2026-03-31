import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { CaptureInput } from "@vault-core/types";
import type { Embedder } from "../scoring/embedder.js";
import type { Scorer } from "../scoring/scorer.js";
import type { AuditLog } from "../storage/audit-log.js";
import type { IndexDB } from "../storage/index-db.js";
import type { VaultWriter } from "../storage/vault-writer.js";
import type { ContextSweep } from "./sweep.js";

mock.module("node:fs", () => ({
  appendFile: mock((_p: unknown, _d: unknown, _e: unknown, cb: () => void) => cb()),
  existsSync: mock(() => false),
  readFileSync: mock(() => ""),
  renameSync: mock(() => undefined),
  unlinkSync: mock(() => undefined),
  writeFileSync: mock(() => undefined),
}));

const { CaptureQueue } = await import("./queue.js");

const makeInput = (): CaptureInput => ({
  content: "test content about a decision",
  sourceType: "manual",
  sourceSession: "sess-1",
  enqueuedAt: new Date().toISOString(),
});

const noop = () => undefined;

const makeMocks = () => ({
  sweep: { scan: mock(() => []) } as unknown as ContextSweep,
  embedder: { embed: mock(async () => []) } as unknown as Embedder,
  scorer: { score: mock(async () => null) } as unknown as Scorer,
  writer: { resolveFilePath: mock(() => "/tmp/x.md"), write: mock(noop) } as unknown as VaultWriter,
  db: { upsert: mock(noop), upsertVector: mock(noop) } as unknown as IndexDB,
  audit: { append: mock(noop) } as unknown as AuditLog,
});

describe("CaptureQueue.flush()", () => {
  let queue: InstanceType<typeof CaptureQueue>;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    queue = new CaptureQueue(
      mocks.sweep,
      mocks.embedder,
      mocks.scorer,
      mocks.writer,
      mocks.db,
      mocks.audit,
    );
  });

  afterEach(() => {
    queue.destroy();
  });

  it("resolves immediately when queue is empty", async () => {
    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it("resolves after draining queued items", async () => {
    queue.capture(makeInput());
    queue.capture(makeInput());
    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it("back-off yields when processBatch does no work due to in-flight guard", async () => {
    type Internal = { processBatch: () => Promise<void>; processing: boolean };
    const internal = queue as unknown as Internal;

    internal.processing = true;
    queue.capture(makeInput());

    let backOffOccurred = false;
    const origSleep = Bun.sleep.bind(Bun);
    const sleepSpy = mock(async (ms: number) => {
      backOffOccurred = true;
      internal.processing = false;
      return origSleep(ms);
    });
    (Bun as unknown as { sleep: typeof sleepSpy }).sleep = sleepSpy;

    await queue.flush();

    expect(backOffOccurred).toBe(true);

    (Bun as unknown as { sleep: typeof origSleep }).sleep = origSleep;
  });
});
