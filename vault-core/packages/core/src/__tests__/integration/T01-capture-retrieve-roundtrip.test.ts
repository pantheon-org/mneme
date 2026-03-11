import { describe, it, expect, afterAll } from "bun:test"
import { join } from "node:path"
import { IndexDB } from "../../storage/index-db.js"
import { VaultWriter } from "../../storage/vault-writer.js"
import { VaultReader } from "../../storage/vault-reader.js"
import { makeTmpDir, cleanDir, makeMemory } from "./helpers.js"

const tmpDir = makeTmpDir()
const vaultPath = join(tmpDir, "vault")
const indexPath = join(tmpDir, "index.db")

afterAll(() => cleanDir(tmpDir))

describe("T01: capture-retrieve roundtrip", () => {
  it("writes 20 memories and BM25 search returns results for a matching query", () => {
    const db = new IndexDB(indexPath)
    const writer = new VaultWriter(vaultPath)

    const memories = [
      makeMemory({ summary: "Use SQLite for the local index database", content: "We decided to use bun:sqlite for the SQLite index because it is built into Bun and avoids native addons." }),
      makeMemory({ summary: "Postgres is the production database", content: "Production uses Postgres 15 with connection pooling via pgBouncer." }),
      makeMemory({ summary: "Database migration strategy", content: "All database schema changes must go through versioned migration files using the drizzle-orm migration runner." }),
      ...Array.from({ length: 17 }, (_, i) =>
        makeMemory({ summary: `Unrelated memory ${i + 1}`, content: `This memory is about something completely different like CSS or networking ${i + 1}` })
      ),
    ]

    for (const mem of memories) {
      mem.filePath = writer.resolveFilePath(mem)
      writer.write(mem)
      db.upsert(mem)
    }

    const results = db.bm25Search("database SQLite Postgres", 10)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.id).toMatch(/^mem_/)
  })

  it("round-trips a memory through VaultWriter and VaultReader identically", () => {
    const writer = new VaultWriter(vaultPath)
    const reader = new VaultReader()

    const mem = makeMemory({
      summary: "Round-trip test memory",
      content: "This content should survive a write/read cycle unchanged.",
      tags: ["test", "roundtrip"],
      tier: "semantic",
      scope: "project",
      projectId: "proj-test",
    })
    mem.filePath = writer.resolveFilePath(mem)
    writer.write(mem)

    const read = reader.read(mem.filePath)
    expect(read.id).toBe(mem.id)
    expect(read.summary).toBe(mem.summary)
    expect(read.content).toBe(mem.content)
    expect(read.tags).toEqual(mem.tags)
    expect(read.tier).toBe(mem.tier)
    expect(read.projectId).toBe(mem.projectId)
  })
})
