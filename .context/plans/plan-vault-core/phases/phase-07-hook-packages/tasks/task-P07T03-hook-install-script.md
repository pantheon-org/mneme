# P07T03 — hook-install-script

## Phase

07 — hook-packages

## Goal

Implement the `bun install:hooks` script that: compiles hook packages, copies compiled JS to `~/.vault-core/hooks/`, patches `~/.claude/settings.json` to register Claude Code hooks, and patches `~/.config/opencode/opencode.json` to register the OpenCode plugin. Must be idempotent.

## File to create/modify

```
scripts/install-hooks.ts
packages/hook-claude-code/package.json  (scripts.install-hooks)
packages/hook-opencode/package.json     (scripts.install-plugin)
```

## Implementation

`scripts/install-hooks.ts`:
```javascript
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const HOME = homedir()
const HOOKS_DIR = join(HOME, '.vault-core', 'hooks', 'claude-code')
const CLAUDE_SETTINGS = join(HOME, '.claude', 'settings.json')
const OPENCODE_CONFIG = join(HOME, '.config', 'opencode', 'opencode.json')

// 1. Copy compiled hook JS files
mkdirSync(HOOKS_DIR, { recursive: true })
for (const file of ['session-start.js', 'post-tool.js', 'session-stop.js']) {
  copyFileSync(
    join('packages', 'hook-claude-code', 'dist', file),
    join(HOOKS_DIR, file)
  )
}

// 2. Patch Claude Code settings
const claudeHooks = {
  Stop: [{ hooks: [{ type: 'command', command: `node ${HOOKS_DIR}/session-stop.js` }] }],
  PostToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: `node ${HOOKS_DIR}/post-tool.js` }] }],
}
let claudeSettings = existsSync(CLAUDE_SETTINGS)
  ? JSON.parse(readFileSync(CLAUDE_SETTINGS, 'utf-8'))
  : {}
claudeSettings.hooks = { ...claudeSettings.hooks, ...claudeHooks }
mkdirSync(join(HOME, '.claude'), { recursive: true })
writeFileSync(CLAUDE_SETTINGS, JSON.stringify(claudeSettings, null, 2), 'utf-8')

// 3. Patch OpenCode config
let openCodeConfig = existsSync(OPENCODE_CONFIG)
  ? JSON.parse(readFileSync(OPENCODE_CONFIG, 'utf-8'))
  : {}
const pluginPath = join(process.cwd(), 'packages', 'hook-opencode', 'dist', 'plugin.js')
openCodeConfig.plugins = openCodeConfig.plugins ?? []
if (!openCodeConfig.plugins.includes(pluginPath)) {
  openCodeConfig.plugins.push(pluginPath)
}
mkdirSync(join(HOME, '.config', 'opencode'), { recursive: true })
writeFileSync(OPENCODE_CONFIG, JSON.stringify(openCodeConfig, null, 2), 'utf-8')

console.log('Hooks installed successfully.')
console.log('  Claude Code: ~/.claude/settings.json patched')
console.log('  OpenCode: ~/.config/opencode/opencode.json patched')
```

## Notes

- Script is idempotent: patching `settings.json` uses merge (`...spread`), not replace
- OpenCode plugin registration checks for duplicates before pushing to the `plugins` array
- The script runs from the monorepo root — file paths are resolved relative to `process.cwd()`

## Verification

```sh
bun run scripts/install-hooks.ts
# must exit 0 and print confirmation
cat ~/.claude/settings.json | grep vault-core
# must show the hook commands
cat ~/.config/opencode/opencode.json | grep vault-core
# must show the plugin path
bun run scripts/install-hooks.ts
# re-run must exit 0 (idempotent)
```
