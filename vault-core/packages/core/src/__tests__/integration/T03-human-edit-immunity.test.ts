import { describe, it, expect, afterAll } from "bun:test"
import { appendFileSync, utimesSync } from "node:fs"
import { join } from "node:path"
import { VaultWriter } from "../../storage/vault-writer.js"
import { VaultReader } from "../../storage/vault-reader.js"
import { makeTmpDir, cleanDir, makeMemory } from "./helpers.js"

const tmpDir = makeTmpDir()
const vaultPath = join(tmpDir, "vault")

afterAll(() => cleanDir(tmpDir))

describe("T03: human-edit immunity", () => {
  it("detects external file modification and sets humanEditedAt on next read", () => {
    const writer = new VaultWriter(vaultPath)
    const reader = new VaultReader()

    const pastDate = new Date(Date.now() - 120_000).toISOString()
    const mem = makeMemory({
      summary: "Memory that will be human-edited",
      content: "Original content before human edit.",
      updatedAt: pastDate,
      capturedAt: pastDate,
    })
    mem.filePath = writer.resolveFilePath(mem)
    writer.write(mem)

    // Force mtime to match updatedAt so first read sees no edit
    const pastTime = new Date(Date.parse(pastDate))
    utimesSync(mem.filePath, pastTime, pastTime)

    const firstRead = reader.read(mem.filePath)
    expect(firstRead.humanEditedAt).toBeNull()

    appendFileSync(mem.filePath, "\n<!-- human note: reviewed and correct -->", "utf-8")
    const futureTime = new Date(Date.now() + 2000)
    utimesSync(mem.filePath, futureTime, futureTime)

    const secondRead = reader.read(mem.filePath)
    expect(secondRead.humanEditedAt).not.toBeNull()
    expect(typeof secondRead.humanEditedAt).toBe("string")
  })

  it("preserves humanEditedAt across subsequent reads once set", () => {
    const writer = new VaultWriter(vaultPath)
    const reader = new VaultReader()

    const pastDate = new Date(Date.now() - 120_000).toISOString()
    const mem = makeMemory({
      summary: "Memory to verify humanEditedAt persistence",
      content: "Content that gets human-edited.",
      updatedAt: pastDate,
      capturedAt: pastDate,
    })
    mem.filePath = writer.resolveFilePath(mem)
    writer.write(mem)

    const pastTime2 = new Date(Date.parse(pastDate))
    utimesSync(mem.filePath, pastTime2, pastTime2)
    reader.read(mem.filePath) // first read — no edit yet

    appendFileSync(mem.filePath, "\n<!-- edited -->", "utf-8")
    utimesSync(mem.filePath, new Date(Date.now() + 2000), new Date(Date.now() + 2000))

    const read1 = reader.read(mem.filePath)
    expect(read1.humanEditedAt).not.toBeNull()

    const read2 = reader.read(mem.filePath)
    expect(read2.humanEditedAt).toBe(read1.humanEditedAt)
  })
})
