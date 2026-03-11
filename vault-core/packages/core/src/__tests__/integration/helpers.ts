import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Memory } from "@vault-core/types"

export function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "vault-test-"))
}

export function cleanDir(dir: string): void {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
}

let seq = 0
export function makeMemory(overrides: Partial<Memory> = {}): Memory {
  const id = `mem_test${(++seq).toString().padStart(3, "0")}`
  const now = new Date().toISOString()
  return {
    id,
    tier: "episodic",
    scope: "user",
    category: "discovery",
    status: "active",
    summary: `Test memory ${id}`,
    content: `Content for ${id}`,
    tags: [],
    strength: 0.8,
    importanceScore: 0.7,
    frequencyCount: 1,
    sourceType: "manual",
    capturedAt: now,
    updatedAt: now,
    humanEditedAt: null,
    filePath: "",
    ...overrides,
  }
}

export function makeRankedMemory(mem: Memory, score = 0.5) {
  return { memory: mem, score, bm25Rank: score * 0.5, vectorRank: score * 0.5 }
}
