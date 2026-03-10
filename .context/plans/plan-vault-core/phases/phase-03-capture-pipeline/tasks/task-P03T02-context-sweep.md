# P03T02 — context-sweep

## Phase

03 — capture-pipeline

## Goal

Implement `ContextSweep` — a fast, synchronous pre-filter that scans raw content for detection signals using three layers (keyword patterns, structural signals, caller hints) without calling inference. Returns `MemoryCandidate[]` or `[]` if nothing exceeds the pre-filter threshold.

## File to create/modify

```
packages/core/src/capture/sweep.ts
```

## Implementation

```typescript
import type { CaptureInput, DetectionSignal, MemoryCandidate } from '@vault-core/types'

const KEYWORD_PATTERNS: Array<{ pattern: RegExp; label: string; confidence: number }> = [
  { pattern: /\bdecided?\b|\bchose?\b|\bgoing with\b/i,         label: 'decision',    confidence: 0.7 },
  { pattern: /\bnever\b|\balways\b|\bmust\b|\bshould not\b/i,   label: 'constraint',  confidence: 0.65 },
  { pattern: /\bfixed\b|\bthe (issue|bug|problem) was\b/i,      label: 'bugfix',      confidence: 0.75 },
  { pattern: /\bpattern\b|\bapproach\b|\bconvention\b/i,        label: 'pattern',     confidence: 0.55 },
  { pattern: /\bdiscovered?\b|\bfound out\b|\blearned?\b/i,     label: 'discovery',   confidence: 0.6 },
  { pattern: /\bprefer\b|\blike to\b|\balways use\b/i,          label: 'preference',  confidence: 0.55 },
]

const STRUCTURAL_PATTERNS: Array<{ pattern: RegExp; label: string; confidence: number }> = [
  { pattern: /^(1\.|[-*])\s.{20,}/m,                           label: 'enumeration', confidence: 0.5 },
  { pattern: /\bcorrection\b|\bactually\b|\bwait,?\b/i,        label: 'correction',  confidence: 0.65 },
  { pattern: /error.*\n.*fix|tool.*fail/i,                      label: 'tool-error',  confidence: 0.7 },
]

const PRE_FILTER_THRESHOLD = 0.45

export class ContextSweep {
  scan(input: CaptureInput): MemoryCandidate[] {
    const signals: DetectionSignal[] = []

    // Layer 1: keyword patterns
    for (const { pattern, label, confidence } of KEYWORD_PATTERNS) {
      if (pattern.test(input.content)) {
        signals.push({ type: 'keyword', label, confidence })
      }
    }

    // Layer 2: structural signals
    for (const { pattern, label, confidence } of STRUCTURAL_PATTERNS) {
      if (pattern.test(input.content)) {
        signals.push({ type: 'structural', label, confidence })
      }
    }

    // Layer 3: caller hints (highest confidence, always trusted)
    if (input.hints?.forceCapture) {
      signals.push({ type: 'caller', label: 'forced', confidence: 1.0 })
    } else if (input.hints?.tier || input.hints?.category) {
      signals.push({ type: 'caller', label: 'hinted', confidence: 0.8 })
    }

    const maxConfidence = signals.reduce((m, s) => Math.max(m, s.confidence), 0)
    if (maxConfidence < PRE_FILTER_THRESHOLD) return []

    return [{ content: input.content, signals, input }]
  }
}
```

## Notes

- No inference calls — this runs synchronously in the hook's main thread and must be near-instant
- Keyword patterns are intentionally minimal; they target coding-context signals only
- `forceCapture: true` in `CaptureHints` bypasses the threshold entirely

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  const { ContextSweep } = require('./packages/core/dist/capture/sweep.js')
  const sweep = new ContextSweep()
  const hits = sweep.scan({ content: 'We decided to use SQLite over Postgres', sourceType: 'cli' })
  console.assert(hits.length > 0, 'expected a candidate for decision signal')
  const misses = sweep.scan({ content: 'Hello world', sourceType: 'cli' })
  console.assert(misses.length === 0, 'expected no candidates for generic text')
  console.log('ContextSweep OK')
"
```
