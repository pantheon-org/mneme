import type { MemoryCategory } from "@vault-core/types";

export interface KeywordRule {
  pattern: RegExp;
  category: MemoryCategory;
  label: string;
  confidence: number;
}

export const KEYWORD_RULES: KeywordRule[] = [
  {
    pattern: /\b(decided?|decision|chose|choosing|going with)\b/i,
    category: "decision",
    label: "decision-keyword",
    confidence: 0.7,
  },
  {
    pattern: /\b(must|required|constraint|cannot|never|always|forbidden)\b/i,
    category: "constraint",
    label: "constraint-keyword",
    confidence: 0.7,
  },
  {
    pattern: /\b(bug|fix(ed)?|regression|broken|workaround)\b/i,
    category: "bugfix",
    label: "bugfix-keyword",
    confidence: 0.65,
  },
  {
    pattern: /\b(pattern|convention|approach|architecture|structure)\b/i,
    category: "pattern",
    label: "pattern-keyword",
    confidence: 0.6,
  },
  {
    pattern: /\b(discovered?|found|realized|noticed|turns out)\b/i,
    category: "discovery",
    label: "discovery-keyword",
    confidence: 0.6,
  },
  {
    pattern: /\b(prefer(red|s)?|like|dislike|favor|avoid)\b/i,
    category: "preference",
    label: "preference-keyword",
    confidence: 0.55,
  },
];

export interface StructuralRule {
  pattern: RegExp;
  label: string;
  confidence: number;
}

export const STRUCTURAL_RULES: StructuralRule[] = [
  { pattern: /^(\s*[-*]\s.+\n){3,}/m, label: "enumeration", confidence: 0.5 },
  {
    pattern: /\b(actually|instead|rather than|not .{1,30} but)\b/i,
    label: "correction",
    confidence: 0.55,
  },
  {
    pattern: /error|exception|failed|stack trace|ENOENT|EPERM/i,
    label: "tool-error",
    confidence: 0.65,
  },
];
