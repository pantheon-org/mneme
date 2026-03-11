import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CaptureInput } from "@vault-core/types";
import type { Embedder } from "../scoring/embedder.js";
import type { Scorer } from "../scoring/scorer.js";
import type { AuditLog } from "../storage/audit-log.js";
import type { IndexDB } from "../storage/index-db.js";
import type { VaultWriter } from "../storage/vault-writer.js";
import { buildMemory } from "./build-memory.js";
import type { ContextSweep } from "./sweep.js";
import { inferCategory } from "./sweep.js";

const PENDING_PATH = join(homedir(), ".vault-core", "pending.jsonl");
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 500;

export class CaptureQueue {
  private readonly queue: CaptureInput[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sweep: ContextSweep,
    private readonly embedder: Embedder,
    private readonly scorer: Scorer,
    private readonly writer: VaultWriter,
    private readonly db: IndexDB,
    private readonly audit: AuditLog,
  ) {
    this.replayPending();
    this.timer = setInterval(() => {
      void this.processBatch();
    }, BATCH_INTERVAL_MS);
    if (this.timer.unref) this.timer.unref();
  }

  capture(input: CaptureInput): void {
    this.queue.push(input);
    appendFileSync(PENDING_PATH, `${JSON.stringify(input)}\n`, "utf-8");
  }

  private replayPending(): void {
    if (!existsSync(PENDING_PATH)) return;
    const raw = readFileSync(PENDING_PATH, "utf-8");
    writeFileSync(PENDING_PATH, "", "utf-8");
    const lines = raw.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        this.queue.push(JSON.parse(line) as CaptureInput);
      } catch {
        /* skip malformed */
      }
    }
  }

  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, BATCH_SIZE);

    for (const input of batch) {
      const candidates = this.sweep.scan(input);
      if (candidates.length === 0) continue;

      const candidate = candidates[0];
      if (!candidate) continue;

      const texts = [candidate.content];
      let embedding: number[] | undefined;
      try {
        const vecs = await this.embedder.embed(texts);
        embedding = vecs[0];
        if (embedding) candidate.embedding = embedding;
      } catch {
        // embedding failed — proceed without vector
      }

      const now = new Date().toISOString();
      const scored = await this.scorer.score(candidate, now);
      if (scored === null) continue;

      const memory = buildMemory(candidate.input, scored.composite, embedding);
      const filePath = this.writer.resolveFilePath(memory);
      memory.filePath = filePath;
      this.writer.write(memory);
      this.db.upsert(memory);
      if (embedding) this.db.upsertVector(memory.id, embedding);
      const auditEntry: Parameters<AuditLog["append"]>[0] = {
        ts: now,
        op: "capture",
        memoryId: memory.id,
      };
      if (input.sourceSession) auditEntry.sessionId = input.sourceSession;
      if (input.sourceHarness) auditEntry.harness = input.sourceHarness;
      this.audit.append(auditEntry);
    }

    if (this.queue.length === 0) {
      writeFileSync(PENDING_PATH, "", "utf-8");
    }
  }

  async flush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }

  destroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }
}

export { inferCategory };
