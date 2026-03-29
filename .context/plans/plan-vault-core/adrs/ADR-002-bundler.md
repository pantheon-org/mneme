# ADR-002: Bun Build as Bundler

**Status**: Accepted

## Context

The monorepo produces multiple output artefacts: a CLI binary, hook scripts, and a plugin. These need to be compiled and bundled for distribution. Using `tsc --build` alone emits raw `.js` files that still require the full `node_modules` tree at runtime — unsuitable for hook scripts and CLI binaries that need to be self-contained or fast to start. A bundler also removes the need for consumers to manage inter-package symlinks.

`esbuild` and `rollup` are common options but require additional tooling. Bun ships a built-in bundler (`bun build`) that is natively compatible with the Bun runtime and requires zero additional dependencies.

## Decision

Use `bun build` as the bundler for all packages. Each package defines its own `build` script invoking `bun build` with appropriate entry points and output targets.

`tsc` is retained for type-checking only (`bun run typecheck` — `tsc --noEmit`). It does not produce output artefacts.

## Consequences

- Bundled outputs are self-contained — no `node_modules` resolution at runtime
- `bun build` natively handles TypeScript, so no separate transpile step
- Import extensions (`.js` vs `.ts`) are resolved by the bundler — developers do not need to write `.js` in source imports
- Type checking remains a separate step (`tsc --noEmit`) and must be run explicitly before merging
- Bun bundler behaviour may differ from Node.js bundlers for edge cases (dynamic `require`, native addons); these must be validated per package
