import { describe, expect, it } from "bun:test";
import type { Memory, RankedMemory } from "@vault-core/types";
import { Injector } from "./injector.js";

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "mem_test001",
    tier: "episodic",
    scope: "user",
    category: "decision",
    status: "active",
    summary: "Use Bun as the runtime",
    content: "We decided to use Bun because of its speed and native SQLite support.",
    tags: [],
    strength: 0.8,
    importanceScore: 0.7,
    frequencyCount: 1,
    sourceType: "manual",
    capturedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    humanEditedAt: null,
    filePath: "",
    ...overrides,
  };
}

function makeRanked(overrides: Partial<Memory> = {}, score = 0.8): RankedMemory {
  return { memory: makeMemory(overrides), score, bm25Rank: score, vectorRank: score };
}

describe("Injector", () => {
  const injector = new Injector();

  describe("format", () => {
    it("returns empty block when memories array is empty", () => {
      const result = injector.format([]);
      expect(result.markdown).toBe("");
      expect(result.tokenEstimate).toBe(0);
      expect(result.memoriesIncluded).toBe(0);
    });

    it("formats a single memory with category, summary, date, scope and strength", () => {
      const rm = makeRanked();
      const result = injector.format([rm]);
      expect(result.markdown).toContain("**[decision]**");
      expect(result.markdown).toContain("Use Bun as the runtime");
      expect(result.markdown).toContain("2026-01-01");
      expect(result.markdown).toContain("scope: user");
      expect(result.markdown).toContain("strength: 0.80");
    });

    it("includes content in formatted output", () => {
      const rm = makeRanked();
      const result = injector.format([rm]);
      expect(result.markdown).toContain("We decided to use Bun");
    });

    it("truncates content to 500 characters", () => {
      const longContent = "x".repeat(1000);
      const rm = makeRanked({ content: longContent });
      const result = injector.format([rm]);
      expect(result.markdown).toContain("x".repeat(500));
      expect(result.markdown).not.toContain("x".repeat(501));
    });

    it("excludes first memory when its content exceeds the token budget", () => {
      const rm = makeRanked({ content: "a".repeat(100_000) });
      const result = injector.format([rm], 1);
      expect(result.memoriesIncluded).toBe(0);
    });

    it("stops adding memories when token budget is exceeded", () => {
      const memories = Array.from({ length: 20 }, (_, i) =>
        makeRanked({ id: `mem_${i}`, content: "a".repeat(500), summary: `Memory ${i}` }),
      );
      const result = injector.format(memories, 100);
      expect(result.memoriesIncluded).toBeLessThan(20);
    });

    it("includes all memories when budget is large enough", () => {
      const memories = [makeRanked(), makeRanked({ id: "mem_test002", summary: "Another memory" })];
      const result = injector.format(memories, 2000);
      expect(result.memoriesIncluded).toBe(2);
    });

    it("tokenEstimate is ceil(markdown.length / 4)", () => {
      const rm = makeRanked();
      const result = injector.format([rm]);
      expect(result.tokenEstimate).toBe(Math.ceil(result.markdown.length / 4));
    });

    it("sections are joined with double newline", () => {
      const memories = [
        makeRanked({ summary: "First" }),
        makeRanked({ id: "mem_test002", summary: "Second" }),
      ];
      const result = injector.format(memories, 2000);
      expect(result.markdown).toContain("\n\n");
    });
  });
});
