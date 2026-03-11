# Hooks and plugins

vault-core integrates with AI coding harnesses via hooks (Claude Code) and a plugin (OpenCode). Both are installed via:

```bash
cd vault-core && bun run install:hooks
```

## Claude Code hooks

Three scripts are registered in `~/.claude/settings.json` under the `hooks` key.

### SessionStart

**Trigger**: Claude Code fires this hook when a new session begins.

**Script**: `~/.vault-core/hooks/claude-code/session-start.js`

**Action**:
1. Reads `CLAUDE_SESSION_ID` and `VAULT_PROJECT_ID` from the environment
2. Constructs a retrieval query from available session context
3. Runs hybrid BM25 + vector search for top-k relevant memories
4. Formats results as a Markdown context block with token budget enforcement
5. Writes the block to stdout — Claude Code injects it into the context window

**Environment variables read**:

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_SESSION_ID` | No | Session identifier for scoping |
| `VAULT_PROJECT_ID` | No | Project scope for retrieval |

**Output format** (stdout):

```markdown
## Relevant memories

### [decision] Use bun:sqlite exclusively
...memory content...

### [constraint] Token budget: 4096 tokens max
...memory content...
```

---

### PostToolUse

**Trigger**: Claude Code fires this hook after every tool use, for all tool matchers (`*`).

**Script**: `~/.vault-core/hooks/claude-code/post-tool.js`

**Action**:
1. Reads the tool event JSON from stdin
2. Extracts tool name, input, output, and session metadata
3. Calls `CaptureQueue.capture()` — returns immediately, processing is async
4. Exits 0 (hook is non-blocking)

**Stdin payload** (Claude Code tool event):

```json
{
  "tool_name": "write_file",
  "tool_input": { "path": "src/index.ts", "content": "..." },
  "tool_response": { "success": true },
  "session_id": "sess_abc123"
}
```

---

### Stop

**Trigger**: Claude Code fires this hook when the session ends.

**Script**: `~/.vault-core/hooks/claude-code/session-stop.js`

**Action**:
1. Reads `CLAUDE_TRANSCRIPT_PATH` from the environment
2. Reads the full transcript file
3. Enqueues the transcript content for capture — async processing continues in background
4. Exits 0

**Environment variables read**:

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_TRANSCRIPT_PATH` | Yes | Path to the session transcript file |
| `CLAUDE_SESSION_ID` | No | Session identifier |

---

### Hook registration

`install-hooks.ts` patches `~/.claude/settings.json` to add:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun ~/.vault-core/hooks/claude-code/session-start.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun ~/.vault-core/hooks/claude-code/post-tool.js"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun ~/.vault-core/hooks/claude-code/session-stop.js"
          }
        ]
      }
    ]
  }
}
```

---

## OpenCode plugin

A single plugin is registered as a symlink in `~/.config/opencode/plugins/vault-core` pointing to the `hook-opencode` package.

**Plugin file**: `packages/hook-opencode/src/plugin.ts`

The plugin uses the `@opencode-ai/plugin` SDK and handles two events:

### `session.start`

**Trigger**: OpenCode fires this event when a new session begins.

**Action**:
1. Retrieves top-7 relevant memories using hybrid search
2. Formats them as a Markdown context block
3. Returns the block to OpenCode for injection into the context window

### `session.idle`

**Trigger**: OpenCode fires this event when the session becomes idle (between tool uses or at end of turn).

**Action**:
1. Reads current session content from the event payload
2. Calls `CaptureQueue.capture()` — returns immediately

---

## AI Skills

Four SKILL.md files are installed into the harness skill directories via `bun run install:skills`. They teach the agent when and how to use vault-cli directly.

| Skill | Destination | Trigger |
|-------|------------|---------|
| `vault-capture` | `~/.claude/skills/` or `~/.config/opencode/skills/` | Agent detects an important decision, constraint, or pattern |
| `vault-search` | same | Session start, "do you remember...", before implementing |
| `vault-fetch` | same | User shares a documentation or reference URL |
| `vault-consolidate` | same | After a long session or user requests memory cleanup |

### vault-capture

Triggers the agent to explicitly capture a memory:

```bash
vault-cli capture --text "<text>" [--tier episodic|semantic|procedural] [--project <id>] [--tags <csv>]
```

### vault-search

Triggers the agent to search memories before implementing something:

```bash
vault-cli search "<query>" [--top-k <n>] [--project <id>]
```

### vault-fetch

Triggers the agent to fetch and store reference documentation:

```bash
vault-cli fetch "<url>" [--project <id>]
```

### vault-consolidate

Triggers the agent to run the consolidation pipeline at the end of a long session:

```bash
vault-cli consolidate --propose
# human reviews vault/00-inbox/consolidation-proposals.md
vault-cli consolidate --apply
```

---

## Uninstalling hooks

To remove Claude Code hooks, manually remove the `hooks` entries from `~/.claude/settings.json`.

To remove the OpenCode plugin, delete `~/.config/opencode/plugins/vault-core`.

To remove skills, delete the corresponding files from `~/.claude/skills/` and `~/.config/opencode/skills/`.
