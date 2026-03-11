import { appendFileSync, utimesSync } from "node:fs";
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

let t03Writer: VaultWriter;
let t03Reader: VaultReader;
let t03FilePath: string = "";

Given("a memory written to the vault with an old modification time", function (this: VaultWorld) {
  t03Writer = new VaultWriter(this.vaultPath);
  t03Reader = new VaultReader();
  const pastDate = new Date(Date.now() - 120_000).toISOString();
  const mem = makeMemory({
    summary: "Memory that will be human-edited",
    content: "Original content before human edit.",
    updatedAt: pastDate,
    capturedAt: pastDate,
  });
  mem.filePath = t03Writer.resolveFilePath(mem);
  t03Writer.write(mem);
  const pastTime = new Date(Date.parse(pastDate));
  utimesSync(mem.filePath, pastTime, pastTime);
  t03FilePath = mem.filePath;
  this.firstHumanEditedAt = null;
});

When(
  "the vault file is modified externally with a new modification time",
  function (this: VaultWorld) {
    const firstRead = t03Reader.read(t03FilePath);
    if (firstRead.humanEditedAt !== null) {
      throw new Error("Expected first read (before edit) humanEditedAt to be null");
    }
    appendFileSync(t03FilePath, "\n<!-- human note: reviewed and correct -->", "utf-8");
    const futureTime = new Date(Date.now() + 2000);
    utimesSync(t03FilePath, futureTime, futureTime);
  },
);

Then("reading the memory sets humanEditedAt to a non-null value", function (this: VaultWorld) {
  const read = t03Reader.read(t03FilePath);
  if (read.humanEditedAt === null) throw new Error("humanEditedAt should not be null after edit");
  if (typeof read.humanEditedAt !== "string") throw new Error("humanEditedAt should be a string");
});

Given("a memory written to the vault", function (this: VaultWorld) {
  t03Writer = new VaultWriter(this.vaultPath);
  t03Reader = new VaultReader();
  const pastDate = new Date(Date.now() - 120_000).toISOString();
  const mem = makeMemory({
    summary: "Memory to verify humanEditedAt persistence",
    content: "Content that gets human-edited.",
    updatedAt: pastDate,
    capturedAt: pastDate,
  });
  mem.filePath = t03Writer.resolveFilePath(mem);
  t03Writer.write(mem);
  const pastTime = new Date(Date.parse(pastDate));
  utimesSync(mem.filePath, pastTime, pastTime);
  t03FilePath = mem.filePath;
});

When("the vault file is modified externally", function (this: VaultWorld) {
  appendFileSync(t03FilePath, "\n<!-- edited -->", "utf-8");
  utimesSync(t03FilePath, new Date(Date.now() + 2000), new Date(Date.now() + 2000));
});

When("the memory is read once to detect the edit", function (this: VaultWorld) {
  const read1 = t03Reader.read(t03FilePath);
  this.firstHumanEditedAt = read1.humanEditedAt ?? null;
});

Then("reading the memory again returns the same humanEditedAt value", function (this: VaultWorld) {
  const read2 = t03Reader.read(t03FilePath);
  if (read2.humanEditedAt !== this.firstHumanEditedAt) {
    throw new Error(`humanEditedAt changed: ${this.firstHumanEditedAt} !== ${read2.humanEditedAt}`);
  }
});
