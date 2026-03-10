import type {
  CaptureInput,
  MemoryCandidate,
  DetectionSignal,
  MemoryCategory,
} from "@vault-core/types"

const PRE_FILTER_THRESHOLD = 0.45

interface KeywordRule {
  pattern: RegExp
  category: MemoryCategory
  label: string
  confidence: number
}

const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /\b(decided?|decision|chose|choosing|going with)\b/i, category: "decision", label: "decision-keyword", confidence: 0.7 },
  { pattern: /\b(must|required|constraint|cannot|never|always|forbidden)\b/i, category: "constraint", label: "constraint-keyword", confidence: 0.7 },
  { pattern: /\b(bug|fix(ed)?|regression|broken|workaround)\b/i, category: "bugfix", label: "bugfix-keyword", confidence: 0.65 },
  { pattern: /\b(pattern|convention|approach|architecture|structure)\b/i, category: "pattern", label: "pattern-keyword", confidence: 0.6 },
  { pattern: /\b(discovered?|found|realized|noticed|turns out)\b/i, category: "discovery", label: "discovery-keyword", confidence: 0.6 },
  { pattern: /\b(prefer(red|s)?|like|dislike|favor|avoid)\b/i, category: "preference", label: "preference-keyword", confidence: 0.55 },
]

interface StructuralRule {
  pattern: RegExp
  label: string
  confidence: number
}

const STRUCTURAL_RULES: StructuralRule[] = [
  { pattern: /^(\s*[-*]\s.+\n){3,}/m, label: "enumeration", confidence: 0.5 },
  { pattern: /\b(actually|instead|rather than|not .{1,30} but)\b/i, label: "correction", confidence: 0.55 },
  { pattern: /error|exception|failed|stack trace|ENOENT|EPERM/i, label: "tool-error", confidence: 0.65 },
]

export class ContextSweep {
  scan(input: CaptureInput): MemoryCandidate[] {
    const signals: DetectionSignal[] = []

    if (input.hints?.forceCapture) {
      signals.push({ type: "caller", label: "force-capture", confidence: 1.0 })
    }
    if (input.hints?.tier) {
      signals.push({ type: "caller", label: `hint-tier:${input.hints.tier}`, confidence: 0.8 })
    }
    if (input.hints?.category) {
      signals.push({ type: "caller", label: `hint-category:${input.hints.category}`, confidence: 0.8 })
    }

    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(input.content)) {
        signals.push({ type: "keyword", label: rule.label, confidence: rule.confidence })
      }
    }

    for (const rule of STRUCTURAL_RULES) {
      if (rule.pattern.test(input.content)) {
        signals.push({ type: "structural", label: rule.label, confidence: rule.confidence })
      }
    }

    const maxConfidence = signals.reduce((m, s) => Math.max(m, s.confidence), 0)
    if (maxConfidence < PRE_FILTER_THRESHOLD) return []

    return [{ content: input.content, signals, input }]
  }
}

export function inferCategory(signals: DetectionSignal[]): MemoryCategory {
  const keywordSignals = signals.filter((s) => s.type === "keyword")
  if (keywordSignals.length === 0) return "discovery"

  const best = keywordSignals.reduce((a, b) => (a.confidence >= b.confidence ? a : b))
  const label = best.label

  if (label.startsWith("decision")) return "decision"
  if (label.startsWith("constraint")) return "constraint"
  if (label.startsWith("bugfix")) return "bugfix"
  if (label.startsWith("pattern")) return "pattern"
  if (label.startsWith("preference")) return "preference"
  return "discovery"
}
