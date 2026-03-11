import { describe, it, expect } from "bun:test"
import { Injector } from "../../retrieval/injector.js"
import { makeMemory, makeRankedMemory } from "./helpers.js"

const injector = new Injector()

describe("T07: token budget", () => {
  it("respects maxTokens — tokenEstimate does not exceed budget by more than 20%", () => {
    const memories = Array.from({ length: 20 }, () =>
      makeRankedMemory(makeMemory({
        summary: "A moderately long summary about a technical decision in the codebase",
        content: "A".repeat(600),
      }), 0.5)
    )

    const block = injector.format(memories, 500)
    expect(block.memoriesIncluded).toBeGreaterThan(0)
    expect(block.tokenEstimate).toBeLessThanOrEqual(600)
  })

  it("always includes the first memory even if it exceeds the token budget", () => {
    const bigMemory = makeRankedMemory(makeMemory({
      summary: "Very important decision that must always be included",
      content: "B".repeat(2000),
    }), 1.0)

    const block = injector.format([bigMemory], 100)
    expect(block.memoriesIncluded).toBe(1)
    expect(block.markdown.length).toBeGreaterThan(0)
  })

  it("returns empty block for empty input", () => {
    const block = injector.format([], 500)
    expect(block.markdown).toBe("")
    expect(block.memoriesIncluded).toBe(0)
    expect(block.tokenEstimate).toBe(0)
  })

  it("does not truncate mid-note — each included memory is complete", () => {
    const sentinel = "COMPLETE_SENTINEL_PHRASE"
    const memories = Array.from({ length: 5 }, (_, i) =>
      makeRankedMemory(makeMemory({
        summary: `Memory ${i + 1}`,
        content: `${sentinel}_${i + 1} ${"X".repeat(200)}`,
      }), 1.0 - i * 0.1)
    )

    const block = injector.format(memories, 300)
    const included = block.memoriesIncluded

    for (let i = 0; i < included; i++) {
      expect(block.markdown).toContain(`${sentinel}_${i + 1}`)
    }
    for (let i = included; i < 5; i++) {
      expect(block.markdown).not.toContain(`${sentinel}_${i + 1}`)
    }
  })
})
