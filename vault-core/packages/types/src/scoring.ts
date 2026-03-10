export interface ScoringWeights {
  recency: number
  frequency: number
  importance: number
  utility: number
  novelty: number
  confidence: number
  interference: number
}

export interface ImportanceScore {
  recency: number
  frequency: number
  importance: number
  utility: number
  novelty: number
  confidence: number
  interference: number
  composite: number
}
