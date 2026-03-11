import { describe, expect, it } from "bun:test";
import type { CaptureInput } from "@vault-core/types";
import { ContextSweep } from "../../capture/sweep.js";

/**
 * Feature: Capture Signal Detection
 *
 * As an AI coding agent
 * I want the system to detect meaningful signals in conversational content
 * So that only high-value information is captured to memory
 */

const sweep = new ContextSweep();

function input(content: string, hints?: CaptureInput["hints"]): CaptureInput {
  return {
    content,
    sourceType: "hook",
    sourceHarness: "opencode",
    ...(hints !== undefined ? { hints } : {}),
  };
}

describe("Feature: Capture Signal Detection", () => {
  describe("Scenario: Agent expresses an architectural decision", () => {
    it("Given content containing a decision keyword, When scanned, Then a candidate is produced with decision signal", () => {
      const content = "We decided to use PostgreSQL as the primary database";
      const candidates = sweep.scan(input(content));
      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.signals.some((s) => s.label === "decision-keyword")).toBe(true);
    });

    it("Given content containing a decision keyword, When scanned, Then candidate content matches input", () => {
      const content = "We decided to use PostgreSQL as the primary database";
      const candidates = sweep.scan(input(content));
      expect(candidates[0]!.content).toBe(content);
    });
  });

  describe("Scenario: Agent records a hard constraint", () => {
    it("Given content expressing a must-not constraint, When scanned, Then a candidate is produced", () => {
      const content = "You must never call this function from the main thread";
      const candidates = sweep.scan(input(content));
      expect(candidates.length).toBeGreaterThan(0);
    });

    it("Given content expressing a hard constraint, When scanned, Then constraint signal is present", () => {
      const content = "You must never call this function from the main thread";
      const candidates = sweep.scan(input(content));
      expect(candidates[0]!.signals.some((s) => s.label === "constraint-keyword")).toBe(true);
    });
  });

  describe("Scenario: Agent documents a bug fix", () => {
    it("Given content describing a fix, When scanned, Then bugfix signal is detected", () => {
      const content = "Fixed the off-by-one error in the pagination cursor";
      const candidates = sweep.scan(input(content));
      expect(candidates[0]!.signals.some((s) => s.label === "bugfix-keyword")).toBe(true);
    });
  });

  describe("Scenario: Noise content below threshold is rejected", () => {
    it("Given generic filler content with no signals, When scanned, Then no candidates are produced", () => {
      const content = "okay sounds good";
      const candidates = sweep.scan(input(content));
      expect(candidates).toHaveLength(0);
    });

    it("Given a simple affirmation, When scanned, Then no candidates are produced", () => {
      const candidates = sweep.scan(input("yes"));
      expect(candidates).toHaveLength(0);
    });
  });

  describe("Scenario: Force-capture hint bypasses threshold", () => {
    it("Given trivial content with forceCapture hint, When scanned, Then a candidate is produced", () => {
      const candidates = sweep.scan(input("okay", { forceCapture: true }));
      expect(candidates).toHaveLength(1);
    });

    it("Given forceCapture hint, When scanned, Then signal confidence is 1.0", () => {
      const candidates = sweep.scan(input("okay", { forceCapture: true }));
      const forceSignal = candidates[0]!.signals.find((s) => s.label === "force-capture");
      expect(forceSignal!.confidence).toBe(1.0);
    });
  });

  describe("Scenario: Enumerated list triggers structural signal", () => {
    it("Given content with 3+ bullet points, When scanned, Then enumeration signal is detected", () => {
      const content =
        "Key design choices:\n- Use Bun for speed\n- Use SQLite for storage\n- Use TypeScript strict mode\n";
      const candidates = sweep.scan(input(content));
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]!.signals.some((s) => s.label === "enumeration")).toBe(true);
    });

    it("Given content with only 2 bullet points, When scanned, Then enumeration signal is absent", () => {
      const content = "- item one\n- item two\n";
      const candidates = sweep.scan(input(content));
      const signals = candidates[0]?.signals ?? [];
      expect(signals.some((s) => s.label === "enumeration")).toBe(false);
    });
  });

  describe("Scenario: Tool error output is captured", () => {
    it("Given content containing an error message, When scanned, Then tool-error signal is detected", () => {
      const content = "Error: ENOENT: no such file or directory, open '/tmp/vault'";
      const candidates = sweep.scan(input(content));
      expect(candidates[0]!.signals.some((s) => s.label === "tool-error")).toBe(true);
    });
  });

  describe("Scenario: Agent corrects a previous statement", () => {
    it("Given content expressing a correction, When scanned, Then correction signal is detected", () => {
      const content = "Actually we should be using GET not POST for this endpoint";
      const candidates = sweep.scan(input(content));
      expect(candidates[0]!.signals.some((s) => s.label === "correction")).toBe(true);
    });
  });
});
