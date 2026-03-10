import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { CaptureInput, Memory, MemoryScope, MemoryTier } from "@vault-core/types"
import type { ContextSweep } from "./sweep.js"
import { inferCategory } from "./sweep.js"
import type { Embedder } from "../scoring/embedder.js"
import type { Scorer } from "../scoring/scorer.js"
import type { VaultWriter } from "../storage/vault-writer.js"
import type { IndexDB } from "../storage/index-db.js"
import type { AuditLog } from "../storage/audit-log.js"

const PENDING_PATH = join(homedir(), ".vault-core", "pending.jsonl")
const BATCH_SIZE = 10
const BATCH_INTERVAL_MS = 500

export class CaptureQueue {
  private readonly queue: CaptureInput[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly sweep: ContextSweep,
    private readonly embedder: Embedder,
    private readonly scorer: Scorer,
    private readonly writer: VaultWriter,
    private readonly db: IndexDB,
    private readonly audit: AuditLog,
  ) {
    this.replayPending()
    this.timer = setInterval(() => {
      void this.processBatch()
    }, BATCH_INTERVAL_MS)
    if (this.timer.unref) this.timer.unref()
  }

  capture(input: CaptureInput): void {
    this.queue.push(input)
    appendFileSync(PENDING_PATH, JSON.stringify(input) + "\n", "utf-8")
  }

  private replayPending(): void {
    if (!existsSync(PENDING_PATH)) return
    const lines = readFileSync(PENDING_PATH, "utf-8").split("\n").filter(Boolean)
    for (const line of lines) {
      try {
        this.queue.push(JSON.parse(line) as CaptureInput)
      } catch {
        // malformed line — skip
      }
    }
    writeFileSync(PENDING_PATH, "", "utf-8")
  }

  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return
    const batch = this.queue.splice(0, BATCH_SIZE)

    for (const input of batch) {
      const candidates = this.sweep.scan(input)
      if (candidates.length === 0) continue

      const candidate = candidates[0]!

      const texts = [candidate.content]
      let embedding: number[] | undefined
      try {
        const vecs = await this.embedder.embed(texts)
        embedding = vecs[0]
        if (embedding) candidate.embedding = embedding
      } catch {
        // embedding failed — proceed without vector
      }

      const now = new Date().toISOString()
      const scored = await this.scorer.score(candidate, now)
      if (scored === null) continue

      const memory = buildMemory(candidate.input, scored.composite, embedding)
      const filePath = this.writer.resolveFilePath(memory)
      memory.filePath = filePath
      this.writer.write(memory)
      this.db.upsert(memory)
      if (embedding) this.db.upsertVector(memory.id, embedding)
      const auditEntry: Parameters<AuditLog["append"]>[0] = {
        ts: now,
        op: "capture",
        memoryId: memory.id,
      }
      if (input.sourceSession) auditEntry.sessionId = input.sourceSession
      if (input.sourceHarness) auditEntry.harness = input.sourceHarness
      this.audit.append(auditEntry)
    }

    if (this.queue.length === 0) {
      writeFileSync(PENDING_PATH, "", "utf-8")
    }
  }

  destroy(): void {
    if (this.timer !== null) clearInterval(this.timer)
  }
}

function buildMemory(
  input: CaptureInput,
  compositeScore: number,
  embedding?: number[],
): Memory {
  const id = `mem_${Date.now().toString(36)}`
  const tier: MemoryTier = input.hints?.tier ?? "episodic"
  const scope: MemoryScope = input.projectId ? "project" : "user"
  const now = new Date().toISOString()

  const mem: Memory = {
    id,
    tier,
    scope,
    category: input.hints?.category ?? "discovery",
    status: "active",
    summary: input.content.slice(0, 120).replace(/\n/g, " "),
    content: input.content,
    tags: input.hints?.tags ?? [],
    strength: compositeScore,
    importanceScore: compositeScore,
    frequencyCount: 1,
    sourceType: input.sourceType,
    capturedAt: now,
    updatedAt: now,
    humanEditedAt: null,
    filePath: "",
  }

  if (input.projectId) mem.projectId = input.projectId
  if (input.sourceHarness) mem.sourceHarness = input.sourceHarness
  if (input.sourceSession) mem.sourceSession = input.sourceSession
  if (embedding) mem.embedding = embedding

  return mem
}

export { inferCategory }
