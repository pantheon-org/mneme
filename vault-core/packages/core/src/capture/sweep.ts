import type {
  CaptureInput,
  DetectionSignal,
  MemoryCandidate,
  MemoryCategory,
} from "@vault-core/types";
import { KEYWORD_RULES, STRUCTURAL_RULES } from "./sweep-rules.js";

const PRE_FILTER_THRESHOLD = 0.45;

export class ContextSweep {
  scan(input: CaptureInput): MemoryCandidate[] {
    const signals: DetectionSignal[] = [];

    if (input.hints?.forceCapture) {
      signals.push({ type: "caller", label: "force-capture", confidence: 1.0 });
    }
    if (input.hints?.tier) {
      signals.push({ type: "caller", label: `hint-tier:${input.hints.tier}`, confidence: 0.8 });
    }
    if (input.hints?.category) {
      signals.push({
        type: "caller",
        label: `hint-category:${input.hints.category}`,
        confidence: 0.8,
      });
    }

    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(input.content)) {
        signals.push({ type: "keyword", label: rule.label, confidence: rule.confidence });
      }
    }

    for (const rule of STRUCTURAL_RULES) {
      if (rule.pattern.test(input.content)) {
        signals.push({ type: "structural", label: rule.label, confidence: rule.confidence });
      }
    }

    const maxConfidence = signals.reduce((m, s) => Math.max(m, s.confidence), 0);
    if (maxConfidence < PRE_FILTER_THRESHOLD) return [];

    return [{ content: input.content, signals, input }];
  }
}

export const inferCategory = (signals: DetectionSignal[]): MemoryCategory => {
  const keywordSignals = signals.filter((s) => s.type === "keyword");
  if (keywordSignals.length === 0) return "discovery";

  const best = keywordSignals.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
  const label = best.label;

  if (label.startsWith("decision")) return "decision";
  if (label.startsWith("constraint")) return "constraint";
  if (label.startsWith("bugfix")) return "bugfix";
  if (label.startsWith("pattern")) return "pattern";
  if (label.startsWith("preference")) return "preference";
  return "discovery";
};
