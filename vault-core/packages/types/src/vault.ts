import type { ScoringWeights } from "./scoring.js"

export interface VaultStructure {
  inbox: string
  episodic: string
  semantic: string
  procedural: string
  archive: string
}

export interface VaultCoreConfig {
  vault_path: string
  index_path: string
  harness: string
  inference_command: string
  embedding_model: string
  capture_threshold: number
  top_k_retrieval: number
  scoring_weights: ScoringWeights
  vault_structure: VaultStructure
}

export interface VaultDestination {
  dir: string
  filename: string
  fullPath: string
}

export interface AuditEntry {
  timestamp: string
  action: "capture" | "retrieve" | "consolidate" | "archive" | "edit"
  memoryId?: string
  details?: string
}
