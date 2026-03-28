# P06T02 — core-commands

## Phase

06 — cli-package

## Goal

Implement all 7 CLI command handlers: `capture`, `fetch`, `search`, `recent`, `consolidate`, `index`, `status`. Each handler loads `VaultCore` from config, calls the relevant core method, and formats results for stdout.

## File to create/modify

```
packages/cli/src/commands/capture.ts
packages/cli/src/commands/fetch.ts
packages/cli/src/commands/search.ts
packages/cli/src/commands/recent.ts
packages/cli/src/commands/consolidate.ts
packages/cli/src/commands/index.ts
packages/cli/src/commands/status.ts
packages/cli/src/format.ts
```

## Implementation

`packages/cli/src/commands/capture.ts`:
```typescript
import type { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { loadVaultCore } from '../core-loader.js'

export function registerCapture(program: Command): void {
  program
    .command('capture')
    .description('Capture text to the vault')
    .option('--text <text>', 'Text to capture (use stdin if omitted)')
    .option('--tier <tier>', 'Memory tier: episodic | semantic | procedural', 'episodic')
    .option('--project <id>', 'Project ID for scoping')
    .option('--tags <tags>', 'Comma-separated tags')
    .action(async (opts) => {
      const text = opts.text ?? readFileSync('/dev/stdin', 'utf-8').trim()
      const core = await loadVaultCore()
      core.capture({
        content: text,
        sourceType: 'cli',
        projectId: opts.project,
        hints: {
          tier: opts.tier,
          tags: opts.tags?.split(',').map((t: string) => t.trim()),
        },
      })
      process.stdout.write('Queued for capture.\n')
    })
}
```

`packages/cli/src/commands/search.ts`:
```typescript
import type { Command } from 'commander'
import { loadVaultCore } from '../core-loader.js'
import { formatSearchResults } from '../format.js'

export function registerSearch(program: Command): void {
  program
    .command('search <query>')
    .description('Search the vault')
    .option('--top-k <n>', 'Number of results', '7')
    .option('--tier <tier>', 'Filter by tier')
    .option('--project <id>', 'Project ID for scope filtering')
    .action(async (query: string, opts) => {
      const core = await loadVaultCore()
      const results = await core.retrieve({
        text: query,
        topK: parseInt(opts.topK, 10),
        projectId: opts.project,
      })
      if (results.length === 0) {
        process.stderr.write('No results found.\n')
        process.exit(1)
      }
      process.stdout.write(formatSearchResults(results) + '\n')
    })
}
```

`packages/cli/src/format.ts`:
```typescript
import type { RankedMemory } from '@vault-core/types'

export function formatSearchResults(results: RankedMemory[]): string {
  return results.map((r, i) =>
    `${i + 1}. [${r.memory.category}] ${r.memory.summary}\n` +
    `   Score: ${r.score.toFixed(3)} | Tier: ${r.memory.tier} | Strength: ${r.memory.strength.toFixed(2)}\n` +
    `   ${r.memory.content.slice(0, 200).replace(/\n/g, ' ')}`
  ).join('\n\n')
}
```

Implement remaining commands (`fetch`, `recent`, `consolidate`, `index`, `status`) following the same pattern.

## Notes

- `loadVaultCore()` is a helper in `packages/cli/src/core-loader.ts` that calls `loadConfig()` and constructs the `VaultCore` instance — avoids repeating this in every command
- `vault-cli fetch` uses `@mozilla/readability` + `turndown` to convert URLs to markdown before capture
- `vault-cli status` queries `db.getStats()` (a method to add to `IndexDB`)

## Verification

```sh
bun --filter @vault-core/cli run build
echo "test capture" | node packages/cli/dist/index.js capture
# exits 0 and prints "Queued for capture."
node packages/cli/dist/index.js search "SQLite" || true
# exits 0 with results or 1 with "No results found."
node packages/cli/dist/index.js status
# exits 0 and prints stats
```
