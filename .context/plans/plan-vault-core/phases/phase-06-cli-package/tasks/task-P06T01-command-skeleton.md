# P06T01 — command-skeleton

## Phase

06 — cli-package

## Goal

Create the `@vault-core/cli` package entry point with Commander.js command registration, version output, and help text. All command handlers are stubs at this stage — just `console.log('TODO')`.

## File to create/modify

```
packages/cli/src/index.ts
packages/cli/src/commands/index.ts
packages/cli/package.json
```

## Implementation

`packages/cli/src/index.ts`:
```typescript
#!/usr/bin/env bun
import { program } from 'commander'
import { registerCapture }     from './commands/capture.js'
import { registerFetch }       from './commands/fetch.js'
import { registerSearch }      from './commands/search.js'
import { registerRecent }      from './commands/recent.js'
import { registerConsolidate } from './commands/consolidate.js'
import { registerIndex }       from './commands/index.js'
import { registerStatus }      from './commands/status.js'

program
  .name('vault-cli')
  .description('Persistent memory vault for AI coding agents')
  .version('0.0.1')

registerCapture(program)
registerFetch(program)
registerSearch(program)
registerRecent(program)
registerConsolidate(program)
registerIndex(program)
registerStatus(program)

program.parseAsync(process.argv)
```

`packages/cli/package.json`:
```json
{
  "name": "@vault-core/cli",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "bin": { "vault-cli": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "install-global": "bun link"
  },
  "dependencies": {
    "@vault-core/core":  "workspace:*",
    "@vault-core/types": "workspace:*",
    "commander": "^12.0.0"
  }
}
```

## Notes

- Each `register*` function receives the Commander `program` instance and calls `program.command(...)`
- The `#!/usr/bin/env bun` shebang is required for the binary to be executable after `bun link`
- `commander` v12+ supports `parseAsync` natively

## Verification

```sh
bun --filter @vault-core/cli run build
node packages/cli/dist/index.js --help
# must print command list and exit 0
node packages/cli/dist/index.js --version
# must print 0.0.1
```
