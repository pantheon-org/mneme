import type { MemoryTier, MemoryCategory } from "./memory.js"

export interface CaptureHints {
  tier?: MemoryTier
  category?: MemoryCategory
  tags?: string[]
  forceCapture?: boolean
}

export interface CaptureInput {
  content: string
  hints?: CaptureHints
  sourceType: "hook" | "cli" | "manual"
  sourceHarness?: string
  sourceSession?: string
  projectId?: string
}

export interface DetectionSignal {
  type: "keyword" | "structural" | "caller"
  label: string
  confidence: number
}

export interface MemoryCandidate {
  content: string
  signals: DetectionSignal[]
  input: CaptureInput
  embedding?: number[]
}
