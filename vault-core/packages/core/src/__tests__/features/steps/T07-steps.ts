import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { Injector } from "../../../retrieval/injector.js";
import { makeMemory, makeRankedMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T07" }, function (this: VaultWorld) {
  this.setup();
});
After({ tags: "@T07" }, function (this: VaultWorld) {
  this.cleanup();
});

const injector = new Injector();
let t07IncludedSentinelCount = 0;

Given("20 ranked memories each with 600 characters of content", function (this: VaultWorld) {
  this.rankedMems = Array.from({ length: 20 }, () =>
    makeRankedMemory(
      makeMemory({ summary: "A moderately long summary", content: "A".repeat(600) }),
      0.5,
    ),
  );
});

When(
  "the injector formats memories with a budget of {int} tokens",
  function (this: VaultWorld, budget: number) {
    const block = injector.format(this.rankedMems, budget);
    this.memoriesIncluded = block.memoriesIncluded;
    this.tokenEstimate = block.tokenEstimate;
    this.markdown = block.markdown;
  },
);

Then("at least 1 memory is included", function (this: VaultWorld) {
  if (this.memoriesIncluded < 1)
    throw new Error(`Expected ≥1 included, got ${this.memoriesIncluded}`);
});

Then("the token estimate is at most {int}", function (this: VaultWorld, max: number) {
  if (this.tokenEstimate > max) throw new Error(`tokenEstimate ${this.tokenEstimate} > ${max}`);
});

Given("a single memory with 2000 characters of content and score 1.0", function (this: VaultWorld) {
  this.rankedMems = [
    makeRankedMemory(
      makeMemory({ summary: "Very important decision", content: "B".repeat(2000) }),
      1.0,
    ),
  ];
});

Then("{int} memories are included", function (this: VaultWorld, expected: number) {
  if (this.memoriesIncluded !== expected)
    throw new Error(`Expected ${expected} included, got ${this.memoriesIncluded}`);
});

Then("the token estimate is {int}", function (this: VaultWorld, expected: number) {
  if (this.tokenEstimate !== expected)
    throw new Error(`Expected tokenEstimate ${expected}, got ${this.tokenEstimate}`);
});

Given("no ranked memories", function (this: VaultWorld) {
  this.rankedMems = [];
});

Then("the markdown output is empty", function (this: VaultWorld) {
  if (this.markdown !== "")
    throw new Error(`Expected empty markdown, got: ${this.markdown.slice(0, 50)}`);
});

Given("5 ranked memories each containing a unique sentinel phrase", function (this: VaultWorld) {
  this.rankedMems = Array.from({ length: 5 }, (_, i) =>
    makeRankedMemory(
      makeMemory({
        summary: `Memory ${i + 1}`,
        content: `COMPLETE_SENTINEL_PHRASE_${i + 1} ${"X".repeat(200)}`,
      }),
      1.0 - i * 0.1,
    ),
  );
});

When(
  "the injector formats sentinel memories with a budget of 300 tokens",
  function (this: VaultWorld) {
    const block = injector.format(this.rankedMems, 300);
    this.memoriesIncluded = block.memoriesIncluded;
    this.markdown = block.markdown;
    t07IncludedSentinelCount = block.memoriesIncluded;
  },
);

Then("included sentinels appear in the markdown output", function (this: VaultWorld) {
  for (let i = 0; i < t07IncludedSentinelCount; i++) {
    if (!this.markdown.includes(`COMPLETE_SENTINEL_PHRASE_${i + 1}`)) {
      throw new Error(`Sentinel ${i + 1} missing from output`);
    }
  }
});

Then("excluded sentinels do not appear in the markdown output", function (this: VaultWorld) {
  for (let i = t07IncludedSentinelCount; i < 5; i++) {
    if (this.markdown.includes(`COMPLETE_SENTINEL_PHRASE_${i + 1}`)) {
      throw new Error(`Excluded sentinel ${i + 1} found in output`);
    }
  }
});
