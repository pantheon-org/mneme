# P00T03 — config-file-generation

## Phase

00 — monorepo-bootstrap

## Goal

Implement config file auto-generation: on first run, if `~/.vault-core/config.toml` does not exist, create it with correct defaults. Subsequent runs must read the existing file without overwriting.

## File to create/modify

```
packages/core/src/config.ts
```

## Implementation

`packages/core/src/config.ts` — `VaultCoreConfig` interface + `loadConfig()`:
```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parse as parseToml } from 'smol-toml'

const CONFIG_DIR = join(homedir(), '.vault-core')
const CONFIG_PATH = join(CONFIG_DIR, 'config.toml')

const DEFAULT_CONFIG = `vault_path        = "~/vault"
index_path        = "~/.vault-core/index.db"
harness           = "claude-code"
inference_command = "claude -p"
embedding_model   = "harness"
capture_threshold = 0.45
top_k_retrieval   = 7

[scoring_weights]
recency      = 0.20
frequency    = 0.15
importance   = 0.25
utility      = 0.20
novelty      = 0.10
confidence   = 0.10
interference = -0.10

[vault_structure]
inbox       = "00-inbox"
episodic    = "01-episodic"
semantic    = "02-semantic"
procedural  = "03-procedural"
archive     = "04-archive"
`

export function loadConfig(): VaultCoreConfig {
  if (!existsSync(CONFIG_PATH)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
    writeFileSync(CONFIG_PATH, DEFAULT_CONFIG, 'utf-8')
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8')
  return parseToml(raw) as VaultCoreConfig
}
```

## Notes

- Use `smol-toml` for TOML parsing (zero native deps, works with Bun and Node)
- `VaultCoreConfig` interface lives in `@vault-core/types` (Phase 01); reference it here via import
- `~` in paths must be expanded at runtime using `homedir()` before use — store the raw `~` string in config, expand on access

## Verification

```sh
rm -f ~/.vault-core/config.toml
bun -e "require('./packages/core/dist/config.js').loadConfig()"
cat ~/.vault-core/config.toml
# should exist with default values
bun -e "require('./packages/core/dist/config.js').loadConfig()"
# second run must not overwrite
```
