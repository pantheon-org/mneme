---
name: vault-search
description: >
  Search persistent memory for relevant context before starting a task, when
  the user asks about past decisions, when debugging a recurring issue, or when
  uncertain whether something was already decided. Always search before
  re-implementing something that may have been done before.
allowed-tools:
  - Bash
---

# vault-search

Retrieve relevant memories from the vault using hybrid BM25 + vector search.

## When to use

- Before starting a non-trivial task: search for related prior decisions
- When the user asks "do you remember…" or "what did we decide about…"
- Before proposing an approach: check for existing constraints or patterns
- When a bug appears familiar: search for past workarounds

## How to use

```bash
vault-cli search "<query>" [--top-k <n>] [--project <id>]
```

Exits 1 with "No results." if nothing is found.

## Examples

```bash
vault-cli search "authentication approach"
vault-cli search "database migration strategy" --project my-app
vault-cli search "recurring TypeScript error" --top-k 3
```

## Output format

Each result shows:
```
1. [category] summary (date)
   tier: episodic | strength: 0.87 | score: 0.0312
   content preview...
```
