# gemini-review.yml

Reviews pull requests against the repository's code conventions using Gemini CLI.

## Called by

`gemini-dispatch` when `command == 'review'` (PR opened, or `@gemini-cli /review`).

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `additional_context` | `string` | No | Free-text context forwarded from the dispatch command |

## Behaviour

**Concurrency**: one run per PR; cancels in-progress runs for the same PR (newer run wins).

**Timeout**: 7 minutes

## Steps

1. **`Checkout repository`** — checks out the repository at the PR head.

2. **`gemini_review`** — calls `google-github-actions/run-gemini-cli@v0`. Max 30 session turns. Runs `gh pr diff <number>` to read the diff, then posts a review via `gh pr review <number> --comment --body "..."`.

## Gemini prompt instructions

Gemini is instructed to post a structured review comment covering:

1. **Summary** — 2–3 sentences describing the changes
2. **Convention violations** — checks for:
   - TypeScript strict mode (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
   - Bun-only runtime: `bun:sqlite`, `bun:test` — never `better-sqlite3`, Jest, or Vitest
   - NodeNext module resolution: `.js` extensions required in imports
   - Arrow functions preferred over function declarations
   - No comments unless logic is non-obvious
   - No unused imports
   - Max 110 non-blank lines per file
   - One exported function/class per module
   - `import type` for type-only imports
3. **Correctness concerns** — memory model integrity, atomic writes, non-blocking capture
4. **Test coverage gaps**
5. **Verdict** — Approve / Request Changes / Comment

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` |
| `id-token` | `write` |
| `issues` | `write` |
| `pull-requests` | `write` |
