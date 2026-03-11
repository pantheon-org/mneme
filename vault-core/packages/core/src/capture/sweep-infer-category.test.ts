import { describe, expect, it } from "bun:test";
import { inferCategory } from "./sweep.js";

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
