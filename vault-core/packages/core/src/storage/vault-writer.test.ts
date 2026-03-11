import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Memory } from "@vault-core/types";
import { VaultWriter } from "./vault-writer.js";

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "vault-writer-test-"));
}

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "mem_abc123",
    tier: "episodic",
    scope: "user",
    category: "decision",
    status: "active",
    summary: "Use NodeNext module resolution",
    content: "We chose NodeNext to allow .js extensions in imports.",
    tags: ["typescript", "modules"],
    strength: 0.9,
    importanceScore: 0.75,
    frequencyCount: 2,
    sourceType: "hook",
    sourceHarness: "opencode",
    sourceSession: "sess_001",
    projectId: "proj_xyz",
    capturedAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    humanEditedAt: null,
    filePath: "",
    ...overrides,
  };
}

describe("VaultWriter", () => {
  const tmpDir = makeTmpDir();

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("resolveFilePath", () => {
    const writer = new VaultWriter(tmpDir);

    it("places episodic memories in 01-episodic directory", () => {
      const mem = makeMemory({ tier: "episodic", id: "mem_abc123" });
      expect(writer.resolveFilePath(mem)).toBe(join(tmpDir, "01-episodic", "abc123.md"));
    });

    it("places semantic memories in 02-semantic directory", () => {
      const mem = makeMemory({ tier: "semantic", id: "mem_abc123" });
      expect(writer.resolveFilePath(mem)).toBe(join(tmpDir, "02-semantic", "abc123.md"));
    });

    it("places procedural memories in 03-procedural directory", () => {
      const mem = makeMemory({ tier: "procedural", id: "mem_abc123" });
      expect(writer.resolveFilePath(mem)).toBe(join(tmpDir, "03-procedural", "abc123.md"));
    });

    it("strips the mem_ prefix from the filename", () => {
      const mem = makeMemory({ id: "mem_uniqueid" });
      expect(writer.resolveFilePath(mem)).toContain("uniqueid.md");
      expect(writer.resolveFilePath(mem)).not.toContain("mem_uniqueid");
    });
  });

  describe("write", () => {
    const writer = new VaultWriter(tmpDir);

    it("writes a markdown file with YAML frontmatter to the resolved path", () => {
      const mem = makeMemory();
      writer.write(mem);
      const filePath = writer.resolveFilePath(mem);
      const raw = readFileSync(filePath, "utf-8");
      expect(raw).toContain("---");
      expect(raw).toContain("id: mem_abc123");
    });

    it("includes all frontmatter fields", () => {
      const mem = makeMemory();
      writer.write(mem);
      const filePath = writer.resolveFilePath(mem);
      const raw = readFileSync(filePath, "utf-8");
      expect(raw).toContain("tier: episodic");
      expect(raw).toContain("scope: user");
      expect(raw).toContain("category: decision");
      expect(raw).toContain("status: active");
      expect(raw).toContain("strength: 0.9");
      expect(raw).toContain("source_type: hook");
      expect(raw).toContain("source_harness: opencode");
      expect(raw).toContain("project_id: proj_xyz");
    });

    it("includes memory content after frontmatter", () => {
      const mem = makeMemory();
      writer.write(mem);
      const filePath = writer.resolveFilePath(mem);
      const raw = readFileSync(filePath, "utf-8");
      expect(raw).toContain("We chose NodeNext to allow .js extensions in imports.");
    });

    it("writes atomically (no leftover .tmp file)", () => {
      const mem = makeMemory({ id: "mem_atomic" });
      writer.write(mem);
      const filePath = writer.resolveFilePath(mem);
      expect(() => readFileSync(`${filePath}.tmp`)).toThrow();
    });

    it("creates parent directory if it does not exist", () => {
      const subDir = join(tmpDir, "deep-test");
      const writer2 = new VaultWriter(subDir);
      const mem = makeMemory({ id: "mem_deeptest" });
      writer2.write(mem);
      const filePath = writer2.resolveFilePath(mem);
      const raw = readFileSync(filePath, "utf-8");
      expect(raw).toContain("id: mem_deeptest");
    });
  });
});
