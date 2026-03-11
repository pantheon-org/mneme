import { describe, expect, it } from "bun:test";
import type { CaptureInput } from "@vault-core/types";
import { ContextSweep, inferCategory } from "./sweep.js";

function makeInput(content: string, hints?: CaptureInput["hints"]): CaptureInput {
  return { content, sourceType: "manual", ...(hints !== undefined ? { hints } : {}) };
}

describe("ContextSweep", () => {
  const sweep = new ContextSweep();

  describe("scan", () => {
    it("returns empty array when content has no signals above threshold", () => {
      const result = sweep.scan(makeInput("just some random text"));
      expect(result).toEqual([]);
    });

    it("returns a candidate when forceCapture hint is set", () => {
      const result = sweep.scan(makeInput("anything", { forceCapture: true }));
      expect(result).toHaveLength(1);
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ type: "caller", label: "force-capture", confidence: 1.0 }),
      );
    });

    it("includes hint-tier signal when tier hint is provided", () => {
      const result = sweep.scan(makeInput("decided to use postgres", { tier: "semantic" }));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "hint-tier:semantic", confidence: 0.8 }),
      );
    });

    it("includes hint-category signal when category hint is provided", () => {
      const result = sweep.scan(makeInput("decided to use postgres", { category: "decision" }));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "hint-category:decision", confidence: 0.8 }),
      );
    });

    it("detects decision keyword with confidence 0.7", () => {
      const result = sweep.scan(makeInput("We decided to use Bun as runtime"));
      expect(result).toHaveLength(1);
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ type: "keyword", label: "decision-keyword", confidence: 0.7 }),
      );
    });

    it("detects constraint keyword", () => {
      const result = sweep.scan(makeInput("This must never be called from main thread"));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "constraint-keyword" }),
      );
    });

    it("detects bugfix keyword", () => {
      const result = sweep.scan(makeInput("Fixed a regression in the auth flow"));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "bugfix-keyword" }),
      );
    });

    it("detects pattern keyword", () => {
      const result = sweep.scan(makeInput("The architecture follows a layered pattern"));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "pattern-keyword" }),
      );
    });

    it("detects discovery keyword", () => {
      const result = sweep.scan(makeInput("Turns out bun:sqlite is 3x faster than better-sqlite3"));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "discovery-keyword" }),
      );
    });

    it("detects preference keyword", () => {
      const result = sweep.scan(makeInput("I prefer functional style over class-based"));
      expect(result[0]!.signals).toContainEqual(
        expect.objectContaining({ label: "preference-keyword" }),
      );
    });

    it("detects enumeration structural rule for 3+ bullet lines", () => {
      const content = "- item one\n- item two\n- item three\n";
      const result = sweep.scan(makeInput(content));
      expect(result[0]!.signals).toContainEqual(expect.objectContaining({ label: "enumeration" }));
    });

    it("does not trigger enumeration for fewer than 3 bullet lines", () => {
      const content = "- item one\n- item two\n";
      const result = sweep.scan(makeInput(content));
      const signals = result[0]?.signals ?? [];
      expect(signals.some((s) => s.label === "enumeration")).toBe(false);
    });

    it("detects correction structural rule", () => {
      const result = sweep.scan(makeInput("actually we should use GET not POST here"));
      expect(result[0]!.signals).toContainEqual(expect.objectContaining({ label: "correction" }));
    });

    it("detects tool-error structural rule", () => {
      const result = sweep.scan(makeInput("Process failed with ENOENT: no such file"));
      expect(result[0]!.signals).toContainEqual(expect.objectContaining({ label: "tool-error" }));
    });

    it("passes content and input through to candidate", () => {
      const input = makeInput("We decided to migrate to PostgreSQL");
      const result = sweep.scan(input);
      expect(result[0]!.content).toBe(input.content);
      expect(result[0]!.input).toBe(input);
    });
  });
});

describe("inferCategory", () => {
  it("returns discovery when no keyword signals present", () => {
    expect(inferCategory([])).toBe("discovery");
    expect(inferCategory([{ type: "structural", label: "enumeration", confidence: 0.5 }])).toBe(
      "discovery",
    );
  });

  it("maps decision-keyword to decision", () => {
    expect(inferCategory([{ type: "keyword", label: "decision-keyword", confidence: 0.7 }])).toBe(
      "decision",
    );
  });

  it("maps constraint-keyword to constraint", () => {
    expect(inferCategory([{ type: "keyword", label: "constraint-keyword", confidence: 0.7 }])).toBe(
      "constraint",
    );
  });

  it("maps bugfix-keyword to bugfix", () => {
    expect(inferCategory([{ type: "keyword", label: "bugfix-keyword", confidence: 0.65 }])).toBe(
      "bugfix",
    );
  });

  it("maps pattern-keyword to pattern", () => {
    expect(inferCategory([{ type: "keyword", label: "pattern-keyword", confidence: 0.6 }])).toBe(
      "pattern",
    );
  });

  it("maps preference-keyword to preference", () => {
    expect(
      inferCategory([{ type: "keyword", label: "preference-keyword", confidence: 0.55 }]),
    ).toBe("preference");
  });

  it("picks highest-confidence keyword signal when multiple present", () => {
    const signals = [
      { type: "keyword" as const, label: "preference-keyword", confidence: 0.55 },
      { type: "keyword" as const, label: "decision-keyword", confidence: 0.7 },
    ];
    expect(inferCategory(signals)).toBe("decision");
  });

  it("returns discovery for unknown label prefix", () => {
    expect(inferCategory([{ type: "keyword", label: "discovery-keyword", confidence: 0.6 }])).toBe(
      "discovery",
    );
  });
});
