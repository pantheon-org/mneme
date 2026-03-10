export interface VaultCoreConfig {
  vault_path: string
  index_path: string
  harness: string
  inference_command: string
  embedding_model: string
  capture_threshold: number
  top_k_retrieval: number
  scoring_weights: {
    recency: number
    frequency: number
    importance: number
    utility: number
    novelty: number
    confidence: number
    interference: number
  }
  vault_structure: {
    inbox: string
    episodic: string
    semantic: string
    procedural: string
    archive: string
  }
}
