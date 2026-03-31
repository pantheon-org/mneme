import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CaptureInput } from "@vault-core/types";

const PENDING_PATH = join(homedir(), ".vault-core", "pending.jsonl");
const VAULT_CORE_DIR = join(homedir(), ".vault-core");

const noop = () => undefined;

const makeFakeDeps = () => ({
  sweep: { scan: mock(() => []) },
  embedder: { embed: mock(async () => [[]]), dimensions: 4 },
  scorer: { score: mock(async () => null) },
  writer: {
    resolveFilePath: mock(() => "/tmp/fake.md"),
    write: mock(noop),
  },
  db: {
    upsert: mock(noop),
    upsertVector: mock(noop),
    getByIds: mock(() => []),
    bm25Search: mock(() => []),
    knnSearch: mock(() => []),
    getByTier: mock(() => []),
  },
  audit: { append: mock(noop) },
});

describe("CaptureQueue concurrent writes", () => {
  let originalContent: string | null = null;

  beforeEach(() => {
    mkdirSync(VAULT_CORE_DIR, { recursive: true });
    if (existsSync(PENDING_PATH)) {
      originalContent = readFileSync(PENDING_PATH, "utf-8");
    } else {
      originalContent = null;
    }
    writeFileSync(PENDING_PATH, "", "utf-8");
  });

  afterEach(() => {
    if (originalContent !== null) {
      writeFileSync(PENDING_PATH, originalContent, "utf-8");
    } else if (existsSync(PENDING_PATH)) {
      rmSync(PENDING_PATH);
    }
  });

  it("does not interleave JSONL lines when capture() is called concurrently", async () => {
    const { CaptureQueue } = await import("./queue.js");
    const deps = makeFakeDeps();
    const queue = new CaptureQueue(
      deps.sweep as never,
      deps.embedder as never,
      deps.scorer as never,
      deps.writer as never,
      deps.db as never,
      deps.audit as never,
    );

    const concurrency = 20;
    const inputs: CaptureInput[] = Array.from({ length: concurrency }, (_, i) => ({
      content: `concurrent capture ${i}`,
      sourceType: "manual" as const,
    }));

    for (const input of inputs) queue.capture(input);

    queue.destroy();
    await Bun.sleep(200);

    const raw = readFileSync(PENDING_PATH, "utf-8");
    const lines = raw.split("\n").filter(Boolean);

    expect(lines.length).toBe(concurrency);

    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      const parsed = JSON.parse(line) as Record<string, unknown>;
      expect(typeof parsed.content).toBe("string");
    }
  });
});
