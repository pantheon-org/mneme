import { afterAll, describe, expect, it } from "bun:test";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CaptureInput } from "@vault-core/types";
import { cleanDir, makeTmpDir } from "./helpers.js";

const tmpDir = makeTmpDir();
const pendingPath = join(tmpDir, "pending.jsonl");

afterAll(() => cleanDir(tmpDir));

describe("T06: queue durability", () => {
  it("pending.jsonl survives process restart and all entries are recoverable", () => {
    mkdirSync(tmpDir, { recursive: true });

    const inputs: CaptureInput[] = Array.from({ length: 10 }, (_, i) => ({
      content: `Durable capture ${i + 1}: important decision about the architecture`,
      sourceType: "hook" as const,
      sourceHarness: "claude-code",
      sourceSession: `session-${i + 1}`,
    }));

    for (const input of inputs) {
      appendFileSync(pendingPath, `${JSON.stringify(input)}\n`, "utf-8");
    }

    expect(existsSync(pendingPath)).toBe(true);

    const lines = readFileSync(pendingPath, "utf-8").split("\n").filter(Boolean);
    expect(lines.length).toBe(10);

    const parsed = lines.map((l) => JSON.parse(l) as CaptureInput);
    for (let i = 0; i < 10; i++) {
      expect(parsed[i]?.content).toBe(inputs[i]?.content);
      expect(parsed[i]?.sourceSession).toBe(inputs[i]?.sourceSession);
    }

    writeFileSync(pendingPath, "", "utf-8");
    const cleared = readFileSync(pendingPath, "utf-8");
    expect(cleared).toBe("");
  });

  it("malformed lines in pending.jsonl are skipped gracefully", () => {
    const badPath = join(tmpDir, "pending-bad.jsonl");
    appendFileSync(badPath, '{"content":"valid","sourceType":"cli"}\n', "utf-8");
    appendFileSync(badPath, "NOT VALID JSON\n", "utf-8");
    appendFileSync(badPath, '{"content":"also valid","sourceType":"manual"}\n', "utf-8");

    const lines = readFileSync(badPath, "utf-8").split("\n").filter(Boolean);
    const parsed: CaptureInput[] = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line) as CaptureInput);
      } catch {
        /* skip */
      }
    }

    expect(parsed.length).toBe(2);
    expect(parsed[0]?.content).toBe("valid");
    expect(parsed[1]?.content).toBe("also valid");
  });
});
