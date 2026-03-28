# P00T02 — tsconfig-base

## Phase

00 — monorepo-bootstrap

## Goal

Create `tsconfig.base.json` at the repo root and per-package `tsconfig.json` files that extend it, enabling strict TypeScript compilation across all packages.

## File to create/modify

```
vault-core/
├── tsconfig.base.json
└── packages/
    ├── types/tsconfig.json
    ├── core/tsconfig.json
    ├── cli/tsconfig.json
    ├── hook-claude-code/tsconfig.json
    └── hook-opencode/tsconfig.json
```

## Implementation

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

Per-package `tsconfig.json` (example for `packages/core`):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

## Notes

- `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are intentionally strict — downstream code must handle `undefined` correctly
- Each package's `outDir` resolves relative to its own `tsconfig.json`, so `dist/` ends up inside each package directory

## Verification

```sh
bun run typecheck
# should exit 0 with no errors across all packages
```
