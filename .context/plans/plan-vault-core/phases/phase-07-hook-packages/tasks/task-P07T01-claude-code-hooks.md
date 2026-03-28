# P07T01 — claude-code-hooks

## Phase

07 — hook-packages

## Goal

Implement the three Claude Code hook scripts: `session-start.ts` (PreToolUse — injects top-k memories), `post-tool.ts` (PostToolUse — async capture push), and `session-stop.ts` (Stop — flushes queue, captures full session). Each must exit in < 5ms except `session-stop` which may take longer.

## File to create/modify

```
packages/hook-claude-code/src/
├── hooks.json
├── session-start.ts
├── post-tool.ts
└── session-stop.ts
```

## Implementation

`packages/hook-claude-code/src/post-tool.ts`:
```typescript
import { loadVaultCore } from '@vault-core/core'

async function main(): Promise<void> {
  let event: Record<string, unknown>
  try {
    const stdin = await readStdin()
    event = JSON.parse(stdin)
  } catch {
    process.exit(0)  // malformed input — fail silently
  }

  try {
    const core = await loadVaultCore()
    core.capture({
      content: JSON.stringify(event),
      sourceType: 'hook',
      sourceHarness: 'claude-code',
      sourceSession: process.env['CLAUDE_SESSION_ID'],
    })
  } catch {
    process.exit(0)  // vault-core unavailable — fail silently
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk) => data += chunk)
    process.stdin.on('end', () => resolve(data))
  })
}

main().catch(() => process.exit(0))
```

`packages/hook-claude-code/src/session-stop.ts`:
```typescript
import { loadVaultCore } from '@vault-core/core'
import { readFileSync, existsSync } from 'node:fs'

async function main(): Promise<void> {
  const transcriptPath = process.env['CLAUDE_TRANSCRIPT_PATH']
  if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0)

  try {
    const transcript = readFileSync(transcriptPath, 'utf-8')
    const core = await loadVaultCore()
    core.capture({
      content: transcript,
      sourceType: 'hook',
      sourceHarness: 'claude-code',
      sourceSession: process.env['CLAUDE_SESSION_ID'],
    })
    await core.flush()  // wait for queue to drain
  } catch {
    process.exit(0)
  }
}

main().catch(() => process.exit(0))
```

`packages/hook-claude-code/src/hooks.json`:
```json
{
  "hooks": {
    "Stop": [{"hooks": [{"type": "command", "command": "node ~/.vault-core/hooks/claude-code/session-stop.js"}]}],
    "PostToolUse": [{"matcher": ".*", "hooks": [{"type": "command", "command": "node ~/.vault-core/hooks/claude-code/post-tool.js"}]}]
  }
}
```

## Notes

- All hooks wrap their entire body in try/catch and call `process.exit(0)` on any error — the agent must never be blocked by a failing hook
- `core.flush()` in `session-stop` is a new method on `VaultCore` that waits for the capture queue to drain (with a 30s timeout)
- `CLAUDE_TRANSCRIPT_PATH` is injected by Claude Code on the Stop hook

## Verification

```sh
bun --filter @vault-core/hook-claude-code run build
echo '{"tool": "bash", "output": "test"}' | node packages/hook-claude-code/dist/post-tool.js
# must exit 0 in < 5ms
```
