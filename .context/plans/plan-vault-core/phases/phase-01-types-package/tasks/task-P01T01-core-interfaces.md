# P01T01 — core-interfaces

## Phase

01 — types-package

## Goal

Define all shared TypeScript interfaces and types in `packages/types/src/` — the single source of truth for every data shape used across the monorepo.

## File to create/modify

```
packages/types/src/
├── memory.ts       — Memory, MemoryTier, MemoryScope, MemoryStatus, MemoryCategory
├── capture.ts      — CaptureInput, CaptureHints, MemoryCandidate, DetectionSignal
├── scoring.ts      — ImportanceScore, ScoringWeights
├── vault.ts        — VaultCoreConfig, VaultDestination, AuditEntry
├── retrieval.ts    — RetrievalQuery, RankedMemory, InjectionBlock
└── index.ts        — re-exports all of the above
```

## Implementation

Key interfaces (abridged — implement all fields as specified in the project plan):

```typescript
// memory.ts
export type MemoryTier = 'episodic' | 'semantic' | 'procedural'
export type MemoryScope = 'user' | 'project'
export type MemoryStatus = 'active' | 'superseded' | 'archived'
export type MemoryCategory = 'decision' | 'constraint' | 'pattern' | 'bugfix' | 'discovery' | 'preference'

export interface Memory {
  id: string
  tier: MemoryTier
  scope: MemoryScope
  category: MemoryCategory
  status: MemoryStatus
  summary: string
  content: string
  tags: string[]
  projectId?: string
  strength: number
  importanceScore: number
  frequencyCount: number
  sourceType: 'hook' | 'cli' | 'manual'
  sourceHarness?: string
  sourceSession?: string
  capturedAt: string   // ISO 8601
  updatedAt: string    // ISO 8601
  humanEditedAt?: string | null
  filePath: string     // absolute path in vault
  embedding?: number[]
}
```

```typescript
// capture.ts
export interface CaptureInput {
  content: string
  hints?: CaptureHints
  sourceType: 'hook' | 'cli' | 'manual'
  sourceHarness?: string
  sourceSession?: string
  projectId?: string
}

export interface CaptureHints {
  tier?: MemoryTier
  category?: MemoryCategory
  tags?: string[]
  forceCapture?: boolean
}

export interface DetectionSignal {
  type: 'keyword' | 'structural' | 'caller'
  label: string
  confidence: number
}

export interface MemoryCandidate {
  content: string
  signals: DetectionSignal[]
  input: CaptureInput
  embedding?: number[]
}
```

```typescript
// scoring.ts
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

export interface ScoringWeights {
  recency: number
  frequency: number
  importance: number
  utility: number
  novelty: number
  confidence: number
  interference: number
}
```

```typescript
// retrieval.ts
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
```

## Notes

- Zero runtime code in this package — interfaces and type aliases only
- `consolidation.ts` is optional; `ConsolidationProposal` interface can be added here if needed by Phase 05

## Verification

```sh
bun --filter @vault-core/types run typecheck
# must exit 0
```
