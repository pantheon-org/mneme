import type { Memory } from "./memory.js"

export interface RetrievalQuery {
  text: string
  projectId?: string
  topK?: number
  maxTokens?: number
  minStrength?: number
}

export interface RankedMemory {
  memory: Memory
  score: number
  bm25Rank: number
  vectorRank: number
}

export interface InjectionBlock {
  markdown: string
  tokenEstimate: number
  memoriesIncluded: number
}
