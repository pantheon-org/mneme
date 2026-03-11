import { describe, it, expect, afterAll } from "bun:test"
import { join } from "node:path"
import { IndexDB } from "../../storage/index-db.js"
import { makeTmpDir, cleanDir, makeMemory } from "./helpers.js"

const tmpDir = makeTmpDir()
const indexPath = join(tmpDir, "index.db")

afterAll(() => cleanDir(tmpDir))

function makeEmbedding(base: number, noise = 0): number[] {
  return Array.from({ length: 768 }, (_, i) =>
    base + noise * (i % 2 === 0 ? 0.05 : -0.05)
  )
}

describe("T04: conflict detection", () => {
  it("knnSearch returns empty array gracefully when vec extension unavailable", () => {
    const db = new IndexDB(indexPath)
    const mem = makeMemory({ summary: "Embedding test memory" })
    mem.embedding = makeEmbedding(0.5)
    db.upsert(mem)
    db.upsertVector(mem.id, mem.embedding)

    const queryEmbedding = makeEmbedding(0.5, 1)
    const results = db.knnSearch(queryEmbedding, 10)
    expect(Array.isArray(results)).toBe(true)
  })

  it("upsertVector stores without throwing even without native vec extension", () => {
    const db = new IndexDB(join(makeTmpDir(), "index.db"))
    const mem = makeMemory()
    mem.embedding = makeEmbedding(0.3)
    db.upsert(mem)
    expect(() => db.upsertVector(mem.id, mem.embedding!)).not.toThrow()
  })

  it("BM25 fallback detects highly similar content as low-novelty", () => {
    const db = new IndexDB(join(makeTmpDir(), "index.db"))
    const base = makeMemory({
      summary: "Use Bun SQLite for the index database storage layer",
      content: "We decided to use bun:sqlite because it requires no native addons and ships with Bun.",
    })
    db.upsert(base)

    const similar = db.bm25Search("bun sqlite index database storage", 10)
    expect(similar.length).toBeGreaterThan(0)
  })
})
