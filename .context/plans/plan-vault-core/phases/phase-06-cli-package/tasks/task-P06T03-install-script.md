# P06T03 — install-script

## Phase

06 — cli-package

## Goal

Implement the `install-global` script that runs `bun link` inside `packages/cli`, making `vault-cli` available globally from any directory. Must be idempotent.

## File to create/modify

```
packages/cli/package.json  (scripts.install-global already declared in P06T01)
```

## Implementation

The `install-global` script is already declared as `"install-global": "bun link"` in `packages/cli/package.json`.

The root `install:cli` workspace script calls it:
```json
"install:cli": "bun --filter @vault-core/cli run install-global"
```

Full install sequence (documented in root README):
```bash
bun install    # links workspace deps
bun run build      # compiles all packages
bun install:cli  # runs bun link inside packages/cli
```

After this, `vault-cli` resolves through the workspace link — `bun run dev` recompiles automatically and changes are picked up without re-running `install:cli`.

## Notes

- `bun link` creates a symlink in the global `node_modules/.bin/` pointing to `packages/cli/dist/index.js`
- Re-running `bun link` on an already-linked package is safe (idempotent)
- On macOS, `bun link` may require `sudo` depending on the npm prefix configuration; recommend `# not needed with Bun` to avoid it

## Verification

```sh
bun install:cli
which vault-cli
# must print a path (e.g. ~/.bun/bin/vault-cli)
vault-cli --version
# must print 0.0.1 from any directory
cd /tmp && vault-cli --help
# must work outside the vault-core directory
```
