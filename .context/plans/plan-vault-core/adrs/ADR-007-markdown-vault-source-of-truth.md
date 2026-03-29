# ADR-007: Markdown Vault Files as Source of Truth

**Status**: Accepted

## Context

Memories need to be readable and editable by humans outside the tool. A pure database approach would make memories opaque and tooling-dependent. Users of this system likely use Obsidian as a knowledge management tool.

## Decision

Memories are stored as Markdown files in a tiered directory structure (`01-episodic/`, `02-semantic/`, `03-procedural/`) readable and editable in Obsidian. The SQLite index (`index.db`) is derived from these files and can always be rebuilt from them via `vault-cli index`.

Front-matter YAML in each file carries structured metadata (id, score, timestamps, embeddings).

## Consequences

- Humans can read, edit, and organise memories directly in Obsidian
- The index is safe to delete — it is not the record of truth
- Human edits are detected via `mtime` and the `human_edited_at` front-matter field (see ADR-009)
- Markdown parsing is required on the read path, adding some latency vs pure DB reads
- Vault directory must be user-configured (`vault_path` in `config.toml`)
