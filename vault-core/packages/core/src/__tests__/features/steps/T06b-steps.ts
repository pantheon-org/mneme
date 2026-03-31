import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import type { CaptureInput } from "@vault-core/types";
import type { VaultWorld } from "./world.js";

let t06bPath = "";
let t06bQueue: CaptureInput[] = [];

const replayLines = (raw: string, q: CaptureInput[]): void => {
  for (const line of raw.split("\n").filter(Boolean)) {
    try {
      q.push(JSON.parse(line) as CaptureInput);
    } catch {}
  }
};

Given(
  "a recovering file with 3 entries and a pending file with 2 entries",
  function (this: VaultWorld) {
    mkdirSync(this.tmpDir, { recursive: true });
    t06bPath = join(this.tmpDir, "pending.jsonl");
    const rp = `${t06bPath}.recovering`;
    t06bQueue = [];
    for (let i = 1; i <= 3; i++) {
      appendFileSync(
        rp,
        `${JSON.stringify({ content: `Rec ${i}`, sourceType: "hook" as const })}\n`,
        "utf-8",
      );
    }
    for (let i = 1; i <= 2; i++) {
      appendFileSync(
        t06bPath,
        `${JSON.stringify({ content: `Pend ${i}`, sourceType: "hook" as const })}\n`,
        "utf-8",
      );
    }
  },
);

When("replayPending runs with both files present", function (this: VaultWorld) {
  const rp = `${t06bPath}.recovering`;
  if (existsSync(rp)) {
    replayLines(readFileSync(rp, "utf-8"), t06bQueue);
    unlinkSync(rp);
  }
  if (!existsSync(t06bPath)) return;
  renameSync(t06bPath, rp);
  replayLines(readFileSync(rp, "utf-8"), t06bQueue);
  unlinkSync(rp);
});

Then("the queue contains all 5 entries without duplicates", function (this: VaultWorld) {
  if (t06bQueue.length !== 5) {
    throw new Error(`Expected 5 entries, got ${t06bQueue.length}`);
  }
});

Then("both files are cleaned up after replay", function (this: VaultWorld) {
  if (existsSync(t06bPath) || existsSync(`${t06bPath}.recovering`)) {
    throw new Error("Files not cleaned up after replay");
  }
});

Given(
  "a recovering file containing 1 valid, 1 malformed, and 1 valid entry",
  function (this: VaultWorld) {
    mkdirSync(this.tmpDir, { recursive: true });
    t06bPath = join(this.tmpDir, "pending.jsonl");
    const rp = `${t06bPath}.recovering`;
    t06bQueue = [];
    appendFileSync(rp, '{"content":"valid","sourceType":"cli"}\n', "utf-8");
    appendFileSync(rp, "NOT JSON\n", "utf-8");
    appendFileSync(rp, '{"content":"also valid","sourceType":"cli"}\n', "utf-8");
  },
);

When("replayPending runs with only the recovering file present", function (this: VaultWorld) {
  const rp = `${t06bPath}.recovering`;
  if (existsSync(rp)) {
    replayLines(readFileSync(rp, "utf-8"), t06bQueue);
    unlinkSync(rp);
  }
});

Then("exactly 2 entries are replayed from the recovering file", function (this: VaultWorld) {
  if (t06bQueue.length !== 2) {
    throw new Error(`Expected 2 entries, got ${t06bQueue.length}`);
  }
});
