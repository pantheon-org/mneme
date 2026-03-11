# CLI reference

vault-cli is the command-line interface for vault-core. Install it globally via:

```bash
cd vault-core && bun run install:cli
```

## Commands

### `vault-cli capture`

Capture text as a memory. Reads from `--text` flag or stdin.

```
vault-cli capture [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--text <text>` | string | stdin | Text to capture |
| `--tier <tier>` | string | `episodic` | Memory tier: `episodic`, `semantic`, or `procedural` |
| `--project <id>` | string | — | Project scope identifier |
| `--tags <csv>` | string | — | Comma-separated tags |

**Examples**

```bash
# Capture a decision
vault-cli capture --text "Use Bun's native SQLite — not better-sqlite3" --tier semantic

# Capture a bugfix with project scope
vault-cli capture \
  --text "Fix: nullish coalescing breaks when exactOptionalPropertyTypes is true" \
  --tier episodic \
  --project my-project \
  --tags "typescript,nullish"

# Capture from stdin
echo "Always run bun run typecheck before committing" | vault-cli capture --tier procedural
```

---

### `vault-cli search`

Hybrid BM25 + vector search across all memories. Exits 1 if no results are found.

```
vault-cli search <query> [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `<query>` | string | required | Search query |
| `--top-k <n>` | int | `7` | Number of results to return |
| `--project <id>` | string | — | Restrict results to a project scope |

**Examples**

```bash
# Search for TypeScript configuration decisions
vault-cli search "typescript strict mode"

# Search with project scope and more results
vault-cli search "database schema" --top-k 15 --project my-api

# Use in a script (exits 1 if nothing found)
vault-cli search "authentication" || echo "No memory found"
```

---

### `vault-cli fetch`

Fetch a URL, strip HTML, and capture the content as a semantic memory.

```
vault-cli fetch <url> [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `<url>` | string | required | URL to fetch |
| `--project <id>` | string | — | Project scope identifier |

Content is truncated to 4000 characters. The memory is force-captured, bypassing the importance score threshold.

**Examples**

```bash
# Capture library documentation
vault-cli fetch https://bun.sh/docs/api/sqlite

# Capture with project scope
vault-cli fetch https://docs.example.com/api --project my-project
```

---

### `vault-cli recent`

Show recent episodic memories, newest first.

```
vault-cli recent [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--limit <n>` | int | `10` | Number of memories to show |
| `--project <id>` | string | — | Filter by project scope |

**Examples**

```bash
# Show last 10 episodic memories
vault-cli recent

# Show last 20, scoped to a project
vault-cli recent --limit 20 --project my-project
```

---

### `vault-cli consolidate`

Manage the episodic → semantic consolidation pipeline.

```
vault-cli consolidate [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--propose` | flag | — | Generate consolidation proposals from episodic clusters |
| `--apply` | flag | — | Apply approved proposals from the vault inbox |
| `--project <id>` | string | — | Restrict consolidation to a project scope |

**Workflow**

```bash
# Step 1: generate proposals
vault-cli consolidate --propose

# Step 2: open Obsidian and review vault/00-inbox/consolidation-proposals.md
# Approve proposals by setting approved: true in YAML frontmatter

# Step 3: apply approved proposals
vault-cli consolidate --apply
```

---

### `vault-cli index`

Rebuild the SQLite index by scanning all `.md` files in the vault. Use this after manually moving or editing files in Obsidian, or to recover from a corrupted index.

```
vault-cli index
```

No options.

**Example**

```bash
vault-cli index
# → Indexed 142 memories
```

---

### `vault-cli status`

Show a summary of memory counts by tier.

```
vault-cli status
```

No options.

**Example output**

```
vault-core status
  episodic    47
  semantic    18
  procedural   6
  total       71
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | No results found (`vault-cli search`) or unrecoverable error |
