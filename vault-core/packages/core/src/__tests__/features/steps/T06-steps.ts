import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { CaptureInput } from "@vault-core/types";
import type { VaultWorld } from "./world.js";

Before({ tags: "@T06" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T06" }, function (this: VaultWorld) {
  this.cleanup();
});

let t06Inputs: CaptureInput[] = [];
let t06PendingPath: string = "";
let t06ParsedEntries: CaptureInput[] = [];

Given("a pending.jsonl file with 10 capture entries", function (this: VaultWorld) {
  mkdirSync(this.tmpDir, { recursive: true });
  t06PendingPath = join(this.tmpDir, "pending.jsonl");
  t06Inputs = Array.from({ length: 10 }, (_, i) => ({
    content: `Durable capture ${i + 1}: important decision about the architecture`,
    sourceType: "hook" as const,
    sourceHarness: "claude-code",
    sourceSession: `session-${i + 1}`,
  }));
  for (const input of t06Inputs) {
    appendFileSync(t06PendingPath, `${JSON.stringify(input)}\n`, "utf-8");
  }
});

When("the file is read back as JSONL", function (this: VaultWorld) {
  const lines = readFileSync(t06PendingPath, "utf-8").split("\n").filter(Boolean);
  t06ParsedEntries = lines.map((l) => JSON.parse(l) as CaptureInput);
});

Then(
  "all 10 entries are parsed with matching content and sourceSession",
  function (this: VaultWorld) {
    if (!existsSync(t06PendingPath)) throw new Error("pending.jsonl does not exist");
    if (t06ParsedEntries.length !== 10) {
      throw new Error(`Expected 10 entries, got ${t06ParsedEntries.length}`);
    }
    for (let i = 0; i < 10; i++) {
      if (t06ParsedEntries[i]?.content !== t06Inputs[i]?.content) {
        throw new Error(`content mismatch at index ${i}`);
      }
      if (t06ParsedEntries[i]?.sourceSession !== t06Inputs[i]?.sourceSession) {
        throw new Error(`sourceSession mismatch at index ${i}`);
      }
    }
  },
);

Then("the file can be cleared", function (this: VaultWorld) {
  writeFileSync(t06PendingPath, "", "utf-8");
  const cleared = readFileSync(t06PendingPath, "utf-8");
  if (cleared !== "") throw new Error("File was not cleared");
});

Given(
  "a pending.jsonl file with 1 valid entry, 1 malformed entry, and 1 valid entry",
  function (this: VaultWorld) {
    mkdirSync(this.tmpDir, { recursive: true });
    t06PendingPath = join(this.tmpDir, "pending-bad.jsonl");
    appendFileSync(t06PendingPath, '{"content":"valid","sourceType":"cli"}\n', "utf-8");
    appendFileSync(t06PendingPath, "NOT VALID JSON\n", "utf-8");
    appendFileSync(t06PendingPath, '{"content":"also valid","sourceType":"manual"}\n', "utf-8");
  },
);

When("the file is parsed skipping malformed lines", function (this: VaultWorld) {
  const lines = readFileSync(t06PendingPath, "utf-8").split("\n").filter(Boolean);
  t06ParsedEntries = [];
  for (const line of lines) {
    try {
      t06ParsedEntries.push(JSON.parse(line) as CaptureInput);
    } catch {}
  }
});

Then("exactly 2 entries are successfully parsed", function (this: VaultWorld) {
  if (t06ParsedEntries.length !== 2) {
    throw new Error(`Expected 2 parsed entries, got ${t06ParsedEntries.length}`);
  }
});
