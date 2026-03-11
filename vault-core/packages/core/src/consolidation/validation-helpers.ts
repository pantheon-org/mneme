import type { MemoryCategory, MemoryScope } from "@vault-core/types";

export const VALID_CATEGORIES: MemoryCategory[] = [
  "decision",
  "constraint",
  "pattern",
  "bugfix",
  "discovery",
  "preference",
];
export const VALID_SCOPES: MemoryScope[] = ["user", "project"];

export const validCategory = (v: unknown): MemoryCategory => {
  if (typeof v === "string" && (VALID_CATEGORIES as string[]).includes(v))
    return v as MemoryCategory;
  return "discovery";
};

export const validScope = (v: unknown): MemoryScope => {
  if (typeof v === "string" && (VALID_SCOPES as string[]).includes(v)) return v as MemoryScope;
  return "user";
};
