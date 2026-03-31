import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { Memory } from "@vault-core/types";
import type { VaultReader } from "../../../storage/vault-reader.js";
import type { VaultWriter } from "../../../storage/vault-writer.js";

export class VaultWorld extends World {
  tmpDir: string = "";
  vaultPath: string = "";
  indexPath: string = "";

  t03Writer: VaultWriter | null = null;
  t03Reader: VaultReader | null = null;
  t03FilePath: string = "";

  lastReadMemory: Memory | null = null;
  searchResults: Memory[] = [];
  retrievalResults: string[] = [];
  rankedMems: { memory: Memory; score: number; bm25Rank: number; vectorRank: number }[] = [];
  markdown: string = "";
  memoriesIncluded: number = 0;
  tokenEstimate: number = 0;
  threwError: boolean = false;
  firstHumanEditedAt: string | null = null;

  setup(): void {
    this.tmpDir = mkdtempSync(join(tmpdir(), "vault-bdd-"));
    this.vaultPath = join(this.tmpDir, "vault");
    this.indexPath = join(this.tmpDir, "index.db");
  }

  cleanup(): void {
    try {
      rmSync(this.tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

setWorldConstructor(VaultWorld);

let seq = 0;

export const makeMemory = (overrides: Partial<Memory> = {}): Memory => {
  const id = `mem_bdd${(++seq).toString().padStart(3, "0")}`;
  const now = new Date().toISOString();
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
  };
};

export const makeRankedMemory = (mem: Memory, score = 0.5) => ({
  memory: mem,
  score,
  bm25Rank: score * 0.5,
  vectorRank: score * 0.5,
});
