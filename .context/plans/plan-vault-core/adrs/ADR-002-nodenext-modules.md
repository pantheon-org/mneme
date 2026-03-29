# ADR-002: NodeNext Module System with .js Extensions

**Status**: Accepted

## Context

TypeScript projects must choose a module resolution strategy. `CommonJS` is legacy; `Bundler` mode hides resolution errors that appear at runtime. ES modules require explicit file extensions for correct Node.js/Bun resolution at runtime.

## Decision

Use `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` in `tsconfig.json`. All intra-package imports must use `.js` extensions even when the source file is `.ts`.

```typescript
import { sweep } from "./sweep.js";
```

## Consequences

- TypeScript correctly validates that imports will resolve at runtime
- No bundler required — the compiled output runs directly under Bun/Node
- Developers must remember to write `.js` in imports for `.ts` source files (counter-intuitive but correct)
- Inter-package imports use the package name (`@vault-core/types`) resolved via `tsconfig` project references
