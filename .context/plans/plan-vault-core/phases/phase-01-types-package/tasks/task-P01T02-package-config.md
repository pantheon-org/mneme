# P01T02 — package-config

## Phase

01 — types-package

## Goal

Configure `packages/types/package.json` with correct name, exports map, and build script so downstream packages can import from `@vault-core/types` using standard NodeNext resolution.

## File to create/modify

```
packages/types/package.json
packages/types/tsconfig.json
```

## Implementation

`packages/types/package.json`:
```json
{
  "name": "@vault-core/types",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  }
}
```

`packages/types/tsconfig.json`:
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

- No runtime dependencies
- `"private": true` — not publishable to npm registry, only linkable within the monorepo
- `exports` map is required for NodeNext module resolution used by downstream packages

## Verification

```sh
bun --filter @vault-core/types run build
# must exit 0 and produce dist/index.js + dist/index.d.ts
ls packages/types/dist/index.js packages/types/dist/index.d.ts
```
