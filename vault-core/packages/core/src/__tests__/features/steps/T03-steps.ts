import { appendFileSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { VaultReader } from "../../../storage/vault-reader.js";
import { VaultWriter } from "../../../storage/vault-writer.js";
import { makeMemory, type VaultWorld } from "./world.js";

Before({ tags: "@T03" }, function (this: VaultWorld) {
  this.setup();
});

After({ tags: "@T03" }, function (this: VaultWorld) {
  this.cleanup();
});

Given("a memory written to the vault with an old modification time", function (this: VaultWorld) {
  this.t03Writer = new VaultWriter(this.vaultPath);
  this.t03Reader = new VaultReader();
  const pastDate = new Date(Date.now() - 120_000).toISOString();
  const mem = makeMemory({
    summary: "Memory that will be human-edited",
    content: "Original content before human edit.",
    updatedAt: pastDate,
    capturedAt: pastDate,
  });
  mem.filePath = this.t03Writer.resolveFilePath(mem);
  this.t03Writer.write(mem);
  const pastTime = new Date(Date.parse(pastDate));
  utimesSync(mem.filePath, pastTime, pastTime);
  this.t03FilePath = mem.filePath;
  this.firstHumanEditedAt = null;
});

When(
  "the vault file is modified externally with a new modification time",
  function (this: VaultWorld) {
    const firstRead = this.t03Reader!.read(this.t03FilePath);
    if (firstRead.humanEditedAt !== null) {
      throw new Error("Expected first read (before edit) humanEditedAt to be null");
    }
    appendFileSync(this.t03FilePath, "\n<!-- human note: reviewed and correct -->", "utf-8");
    const futureTime = new Date(Date.now() + 2000);
    utimesSync(this.t03FilePath, futureTime, futureTime);
  },
);

Then("reading the memory sets humanEditedAt to a non-null value", function (this: VaultWorld) {
  const read = this.t03Reader!.read(this.t03FilePath);
  if (read.humanEditedAt === null) throw new Error("humanEditedAt should not be null after edit");
  if (typeof read.humanEditedAt !== "string") throw new Error("humanEditedAt should be a string");
});

Given("a memory written to the vault", function (this: VaultWorld) {
  this.t03Writer = new VaultWriter(this.vaultPath);
  this.t03Reader = new VaultReader();
  const pastDate = new Date(Date.now() - 120_000).toISOString();
  const mem = makeMemory({
    summary: "Memory to verify humanEditedAt persistence",
    content: "Content that gets human-edited.",
    updatedAt: pastDate,
    capturedAt: pastDate,
  });
  mem.filePath = this.t03Writer.resolveFilePath(mem);
  this.t03Writer.write(mem);
  const pastTime = new Date(Date.parse(pastDate));
  utimesSync(mem.filePath, pastTime, pastTime);
  this.t03FilePath = mem.filePath;
});

When("the vault file is modified externally", function (this: VaultWorld) {
  appendFileSync(this.t03FilePath, "\n<!-- edited -->", "utf-8");
  utimesSync(this.t03FilePath, new Date(Date.now() + 2000), new Date(Date.now() + 2000));
});

When("the memory is read once to detect the edit", function (this: VaultWorld) {
  const read1 = this.t03Reader!.read(this.t03FilePath);
  this.firstHumanEditedAt = read1.humanEditedAt ?? null;
});

Then("reading the memory again returns the same humanEditedAt value", function (this: VaultWorld) {
  const read2 = this.t03Reader!.read(this.t03FilePath);
  if (read2.humanEditedAt !== this.firstHumanEditedAt) {
    throw new Error(`humanEditedAt changed: ${this.firstHumanEditedAt} !== ${read2.humanEditedAt}`);
  }
});

When(
  "the memory is read once so humanEditedAt is detected and persisted",
  function (this: VaultWorld) {
    const read = this.t03Reader!.read(this.t03FilePath);
    this.firstHumanEditedAt = read.humanEditedAt ?? null;
    if (this.firstHumanEditedAt === null) {
      throw new Error("Expected humanEditedAt to be detected after external edit");
    }
  },
);

When(
  "the memory is re-written by another session with an older mtime",
  function (this: VaultWorld) {
    const raw = readFileSync(this.t03FilePath, "utf-8");
    const stat = statSync(this.t03FilePath);
    const tmp = `${this.t03FilePath}.tmp2`;
    writeFileSync(tmp, raw, "utf-8");
    utimesSync(tmp, stat.atime, new Date(stat.mtimeMs - 10_000));
    writeFileSync(this.t03FilePath, raw, "utf-8");
    utimesSync(this.t03FilePath, stat.atime, new Date(stat.mtimeMs - 10_000));
  },
);

Then(
  "reading the memory again still returns the original humanEditedAt value",
  function (this: VaultWorld) {
    const read = this.t03Reader!.read(this.t03FilePath);
    if (read.humanEditedAt !== this.firstHumanEditedAt) {
      throw new Error(
        `humanEditedAt changed after re-write: expected ${this.firstHumanEditedAt}, got ${read.humanEditedAt}`,
      );
    }
  },
);
