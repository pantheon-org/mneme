import type { DetectionSignal, MemoryCategory } from "@vault-core/types";

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
