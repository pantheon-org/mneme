import { describe, expect, it } from "bun:test";
import type { CaptureInput } from "@vault-core/types";
import { ContextSweep } from "./sweep.js";

const makeInput = (content: string, hints?: CaptureInput["hints"]): CaptureInput => ({
  content,
  sourceType: "manual",
  ...(hints !== undefined ? { hints } : {}),
});

describe("ContextSweep", () => {
  const sweep = new ContextSweep();

  describe("scan", () => {
    it("returns empty array when content has no signals above threshold", () => {
      expect(sweep.scan(makeInput("just some random text"))).toEqual([]);
    });

    it("returns a candidate when forceCapture hint is set", () => {
      const result = sweep.scan(makeInput("anything", { forceCapture: true }));
      expect(result).toHaveLength(1);
      expect(result[0]?.signals).toContainEqual(
        expect.objectContaining({ type: "caller", label: "force-capture", confidence: 1.0 }),
      );
    });

    it("includes hint-tier signal when tier hint is provided", () => {
      const result = sweep.scan(makeInput("decided to use postgres", { tier: "semantic" }));
      expect(result[0]?.signals).toContainEqual(
        expect.objectContaining({ label: "hint-tier:semantic", confidence: 0.8 }),
      );
    });

    it("includes hint-category signal when category hint is provided", () => {
      const result = sweep.scan(makeInput("decided to use postgres", { category: "decision" }));
      expect(result[0]?.signals).toContainEqual(
        expect.objectContaining({ label: "hint-category:decision", confidence: 0.8 }),
      );
    });

    it("detects decision keyword with confidence 0.7", () => {
      const result = sweep.scan(makeInput("We decided to use Bun as runtime"));
      expect(result).toHaveLength(1);
      expect(result[0]?.signals).toContainEqual(
        expect.objectContaining({ type: "keyword", label: "decision-keyword", confidence: 0.7 }),
      );
    });

    it("detects constraint keyword", () => {
      expect(
        sweep.scan(makeInput("This must never be called from main thread"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "constraint-keyword" }));
    });

    it("detects bugfix keyword", () => {
      expect(
        sweep.scan(makeInput("Fixed a regression in the auth flow"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "bugfix-keyword" }));
    });

    it("detects pattern keyword", () => {
      expect(
        sweep.scan(makeInput("The architecture follows a layered pattern"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "pattern-keyword" }));
    });

    it("detects discovery keyword", () => {
      expect(
        sweep.scan(makeInput("Turns out bun:sqlite is 3x faster than better-sqlite3"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "discovery-keyword" }));
    });

    it("detects preference keyword", () => {
      expect(
        sweep.scan(makeInput("I prefer functional style over class-based"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "preference-keyword" }));
    });

    it("detects enumeration structural rule for 3+ bullet lines", () => {
      expect(
        sweep.scan(makeInput("- item one\n- item two\n- item three\n"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "enumeration" }));
    });

    it("does not trigger enumeration for fewer than 3 bullet lines", () => {
      const signals = sweep.scan(makeInput("- item one\n- item two\n"))[0]?.signals ?? [];
      expect(signals.some((s) => s.label === "enumeration")).toBe(false);
    });

    it("detects correction structural rule", () => {
      expect(
        sweep.scan(makeInput("actually we should use GET not POST here"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "correction" }));
    });

    it("detects tool-error structural rule", () => {
      expect(
        sweep.scan(makeInput("Process failed with ENOENT: no such file"))[0]?.signals,
      ).toContainEqual(expect.objectContaining({ label: "tool-error" }));
    });

    it("passes content and input through to candidate", () => {
      const input = makeInput("We decided to migrate to PostgreSQL");
      const result = sweep.scan(input);
      expect(result[0]?.content).toBe(input.content);
      expect(result[0]?.input).toBe(input);
    });
  });
});
