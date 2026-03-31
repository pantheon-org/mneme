import {
  appendFile,
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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

const PENDING_PATH = join(homedir(), ".vault-core", "pending.jsonl");
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 500;

export class CaptureQueue {
  private readonly queue: CaptureInput[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

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
    const entry: CaptureInput = { ...input, enqueuedAt: new Date().toISOString() };
    this.queue.push(entry);
    void appendFile(PENDING_PATH, `${JSON.stringify(entry)}\n`, "utf-8", () => undefined);
  }

  private replayPending(): void {
    const recoveryPath = `${PENDING_PATH}.recovering`;
    if (existsSync(recoveryPath)) {
      this.replayFromFile(recoveryPath);
      unlinkSync(recoveryPath);
    }
    if (!existsSync(PENDING_PATH)) return;
    renameSync(PENDING_PATH, recoveryPath);
    this.replayFromFile(recoveryPath);
    unlinkSync(recoveryPath);
  }

  private replayFromFile(path: string): void {
    const raw = readFileSync(path, "utf-8");
    for (const line of raw.split("\n").filter(Boolean)) {
      try {
        this.queue.push(JSON.parse(line) as CaptureInput);
      } catch {}
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    try {
      const batch = this.queue.splice(0, BATCH_SIZE);

      for (const input of batch) {
        const candidates = this.sweep.scan(input);
        if (candidates.length === 0) continue;

        const candidate = candidates[0];
        if (!candidate) continue;

        let embedding: number[] | undefined;
        try {
          const vecs = await this.embedder.embed([candidate.content]);
          embedding = vecs[0];
          if (embedding) candidate.embedding = embedding;
        } catch {}

        const capturedAt = input.enqueuedAt ?? new Date().toISOString();
        const scored = await this.scorer.score(candidate);
        if (scored === null) continue;

        const memory = buildMemory(candidate.input, scored.composite, embedding);
        memory.filePath = this.writer.resolveFilePath(memory);
        this.writer.write(memory);
        this.db.upsert(memory);
        if (embedding) this.db.upsertVector(memory.id, embedding);
        const auditEntry: Parameters<AuditLog["append"]>[0] = {
          ts: capturedAt,
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
    } finally {
      this.processing = false;
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
