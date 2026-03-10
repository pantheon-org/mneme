import type { RankedMemory, InjectionBlock } from "@vault-core/types"

const CHARS_PER_TOKEN = 4
const CONTENT_PREVIEW_CHARS = 500

function formatMemory(rm: RankedMemory): string {
  const date = rm.memory.capturedAt.slice(0, 10)
  const header = `**[${rm.memory.category}]** ${rm.memory.summary} _(${date})_`
  const meta = `scope: ${rm.memory.scope} | strength: ${rm.memory.strength.toFixed(2)}`
  const body = rm.memory.content.slice(0, CONTENT_PREVIEW_CHARS)
  return `${header}\n${meta}\n\n${body}`
}

export class Injector {
  format(memories: RankedMemory[], maxTokens = 2000): InjectionBlock {
    if (memories.length === 0) {
      return { markdown: "", tokenEstimate: 0, memoriesIncluded: 0 }
    }

    const sections: string[] = []
    let charCount = 0
    const maxChars = maxTokens * CHARS_PER_TOKEN

    for (const rm of memories) {
      const section = formatMemory(rm)
      const sectionChars = section.length + 2 // +2 for "\n\n" separator

      if (sections.length > 0 && charCount + sectionChars > maxChars) break

      sections.push(section)
      charCount += sectionChars
    }

    const markdown = sections.join("\n\n")
    return {
      markdown,
      tokenEstimate: Math.ceil(markdown.length / CHARS_PER_TOKEN),
      memoriesIncluded: sections.length,
    }
  }
}
