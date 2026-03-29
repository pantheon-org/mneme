# ADR-012: TypeScript Strict Mode with exactOptionalPropertyTypes and noUncheckedIndexedAccess

**Status**: Accepted

## Context

The system reads and writes Markdown front-matter and JSON structures. Missing fields and unchecked array accesses are common sources of silent data corruption that standard TypeScript strictness does not catch.

## Decision

All packages use TypeScript with:
- `"strict": true` — enables all standard strict checks
- `"exactOptionalPropertyTypes": true` — distinguishes `{ a?: string }` (absent) from `{ a: string | undefined }` (present but undefined)
- `"noUncheckedIndexedAccess": true` — array index access and record lookups return `T | undefined`, forcing null checks

## Consequences

- Serialisation/deserialisation bugs are caught at compile time rather than silently producing `undefined` at runtime
- Code is more verbose — indexed access requires explicit undefined checks
- `noUncheckedIndexedAccess` interacts poorly with some common patterns (e.g. `arr[0]` must be guarded); developers must be aware of this
- External library types may be incompatible with `exactOptionalPropertyTypes` — type assertions may occasionally be needed at boundaries
