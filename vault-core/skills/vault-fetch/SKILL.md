---
name: vault-fetch
description: >
  Fetch a URL and store its content as a semantic memory. Use when the user
  shares a link to documentation, a GitHub issue, a blog post, or any reference
  material that should be available for future retrieval without re-fetching.
allowed-tools:
  - Bash
---

# vault-fetch

Fetch a URL, extract its text content, and persist it as a semantic memory.

## When to use

- User shares a documentation link to consult during the project
- A GitHub issue or PR contains important context
- External reference material needs to be available across sessions

## How to use

```bash
vault-cli fetch "<url>" [--project <id>]
```

The content is automatically:
- Captured with `tier: semantic` and `forceCapture: true`
- Truncated to 4000 characters
- Tagged with the source URL

## Examples

```bash
vault-cli fetch "https://bun.sh/docs/api/sqlite"
vault-cli fetch "https://github.com/org/repo/issues/42" --project my-app
```
