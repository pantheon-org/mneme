import type { RankedMemory } from "@vault-core/types";

export function formatSearchResults(results: RankedMemory[]): string {
  return results
    .map((r, i) => {
      const date = r.memory.capturedAt.slice(0, 10);
      const preview = r.memory.content.slice(0, 200).replace(/\n/g, " ");
      return [
        `${i + 1}. [${r.memory.category}] ${r.memory.summary} (${date})`,
        `   tier: ${r.memory.tier} | strength: ${r.memory.strength.toFixed(2)} | score: ${r.score.toFixed(4)}`,
        `   ${preview}`,
      ].join("\n");
    })
    .join("\n\n");
}
