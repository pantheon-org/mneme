# P07T02 — opencode-plugin

## Phase

07 — hook-packages

## Goal

Implement the OpenCode plugin entry point that registers `chat.message` and `session.start` hooks using the `@opencode-ai/plugin` SDK. Per-message hook pushes to the async capture queue; session start injects top-k memories.

## File to create/modify

```
packages/hook-opencode/src/
├── plugin.ts
├── session-start.ts
├── post-message.ts
└── compaction.ts
```

## Implementation

`packages/hook-opencode/src/plugin.ts`:
```typescript
import { definePlugin } from '@opencode-ai/plugin'
import { loadVaultCore } from '@vault-core/core'

export default definePlugin({
  name: 'vault-core',
  version: '0.0.1',

  hooks: {
    'chat.message': async (ctx) => {
      try {
        const core = await loadVaultCore()
        core.capture({
          content: ctx.message.content,
          sourceType: 'hook',
          sourceHarness: 'opencode',
          sourceSession: ctx.session.id,
        })
      } catch {
        // fail silently
      }
    },

    'session.start': async (ctx) => {
      try {
        const core = await loadVaultCore()
        const results = await core.retrieve({
          text: ctx.session.initialPrompt ?? '',
          topK: 7,
          projectId: ctx.session.projectId,
        })
        if (results.length === 0) return
        const { Injector } = await import('@vault-core/core/retrieval/injector.js')
        const injector = new Injector()
        const block = injector.format(results, 2000)
        if (block.markdown) {
          ctx.session.prependContext(block.markdown)
        }
      } catch {
        // fail silently
      }
    },
  },
})
```

## Notes

- `@opencode-ai/plugin` is the official OpenCode plugin SDK (see Phase 07 skill notes)
- `ctx.session.prependContext()` is the OpenCode API for injecting context at session start — verify exact API against SDK docs
- Plugin is registered in `~/.config/opencode/opencode.json` by the install script (P07T03)

## Verification

```sh
bun --filter @vault-core/hook-opencode run build
echo "hook-opencode compiles OK"
# End-to-end test requires a live OpenCode session
```
