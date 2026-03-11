import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import type { CaptureInput, MemoryCandidate } from "@vault-core/types";
import { ContextSweep } from "../../../capture/sweep.js";
import type { VaultWorld } from "./world.js";

Before({ tags: "@T08" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T08" }, function (this: VaultWorld) {
  this.cleanup();
});

const sweep = new ContextSweep();
let t08Content = "";
let t08Candidates: MemoryCandidate[] = [];
let t08Input: CaptureInput | null = null;

const makeInput = (content: string, forceCapture = false): CaptureInput => ({
  content,
  sourceType: "hook",
  sourceHarness: "test",
  ...(forceCapture ? { hints: { forceCapture: true } } : {}),
});

Given("content containing the phrase {string}", function (this: VaultWorld, phrase: string) {
  t08Content = `I want to explain this: ${phrase} a particular approach for this module.`;
});

Given("content {string}", function (this: VaultWorld, content: string) {
  t08Content = content;
});

Given("content with a force-capture hint", function (this: VaultWorld) {
  t08Content = "This is content that should be captured.";
  t08Input = makeInput(t08Content, true);
});

Given("content containing 3 or more bullet points", function (this: VaultWorld) {
  t08Content =
    "Here are the key points:\n- First important item\n- Second important item\n- Third important item\n";
});

Given("content containing 2 bullet points", function (this: VaultWorld) {
  t08Content = "Two things:\n- First item\n- Second item\n";
});

When("the content is scanned for signals", function (this: VaultWorld) {
  t08Candidates = sweep.scan(t08Input ?? makeInput(t08Content));
  t08Input = null;
});

Then("at least 1 candidate is produced", function (this: VaultWorld) {
  if (t08Candidates.length < 1)
    throw new Error(`Expected ≥1 candidate, got ${t08Candidates.length}`);
});

Then("the candidate content matches the original content", function (this: VaultWorld) {
  if (!t08Candidates[0]) throw new Error("No candidate");
  if (t08Candidates[0].content !== t08Content) throw new Error("Candidate content mismatch");
});

Then("the candidate content contains a constraint keyword", function (this: VaultWorld) {
  if (!t08Candidates[0]) throw new Error("No candidate");
  const content = t08Candidates[0].content.toLowerCase();
  const hasConstraint =
    content.includes("never") ||
    content.includes("must not") ||
    content.includes("always") ||
    content.includes("constraint");
  if (!hasConstraint) throw new Error("Candidate missing constraint keyword");
});

Then("{int} candidates are produced", function (this: VaultWorld, expected: number) {
  if (t08Candidates.length !== expected)
    throw new Error(`Expected ${expected} candidates, got ${t08Candidates.length}`);
});

Then("exactly 1 candidate is produced", function (this: VaultWorld) {
  if (t08Candidates.length !== 1)
    throw new Error(`Expected 1 candidate, got ${t08Candidates.length}`);
});

Then("the candidate has a confidence of {float}", function (this: VaultWorld, confidence: number) {
  const signal = t08Candidates[0]?.signals?.[0];
  if (!signal) throw new Error("No signal on candidate");
  if (signal.confidence !== confidence)
    throw new Error(`Expected confidence ${confidence}, got ${signal.confidence}`);
});
