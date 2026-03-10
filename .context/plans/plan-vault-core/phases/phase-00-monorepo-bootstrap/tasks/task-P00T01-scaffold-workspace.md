# P00T01 — scaffold-workspace

## Phase

00 — monorepo-bootstrap

## Goal

Create the Bun workspace root with root `package.json` (workspaces field + all scripts), and empty package directories for the five packages.

## File to create/modify

```
vault-core/
├── package.json
└── packages/
    ├── types/
    ├── core/
    ├── cli/
    ├── hook-claude-code/
    └── hook-opencode/
```

## Implementation

```bash
mkdir vault-core && cd vault-core
bun init -y
```

Root `package.json` (Bun workspaces are declared in `package.json`, no separate workspace file):
```json
{
  "name": "vault-core-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build":          "bun --filter '*' run build",
    "dev":            "bun --filter '*' run dev",
    "test":           "bun test",
    "typecheck":      "bun --filter '*' run typecheck",
    "install:hooks":  "bun --filter @vault-core/hook-claude-code run install-hooks && bun --filter @vault-core/hook-opencode run install-plugin",
    "install:skills": "bun run scripts/install-skills.ts",
    "install:cli":    "bun --filter @vault-core/cli run install-global"
  }
}
```

Each package `package.json` uses workspace protocol for internal deps:
```json
{
  "dependencies": {
    "@vault-core/types": "workspace:*"
  }
}
```

## Notes

- No `pnpm-workspace.yaml` — Bun reads `"workspaces"` directly from root `package.json`
- `bun install` resolves workspace links automatically — no `bun link` needed for internal packages
- `packages/cli/package.json` needs `"bin": { "vault-cli": "./dist/index.js" }`
- Install scripts can be `.ts` files — Bun runs TypeScript natively without compilation
- Use `bun:sqlite` (built-in) instead of `bun:sqlite` — zero native dependency, no compilation step

## Verification

```sh
bun install && echo "workspace linked OK"
ls packages/types packages/core packages/cli packages/hook-claude-code packages/hook-opencode
```
