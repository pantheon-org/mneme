# ai-invoke.yml

Handles ad-hoc `@gemini-cli` requests on issues and pull requests.

## Called by

`ai-dispatch` when `command == 'invoke'` (any `@gemini-cli` comment without a recognised `/command`).

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `additional_context` | `string` | No | The free-text request from the user's `@gemini-cli` comment |

## Behaviour

**Concurrency**: one run per issue/PR; does **not** cancel in-progress runs (`cancel-in-progress: false`) — requests are queued rather than superseded.

**Timeout**: 10 minutes

## Steps

1. **`Checkout Code`** — checks out the repository.

2. **`run_gemini`** — calls `google-github-actions/run-gemini-cli@v0`. Max 50 session turns. Uses `gh` CLI to fulfil the request and post a response comment.

## Gemini prompt instructions

Gemini is told to:

- Treat `additional_context` as the user's request
- Use the `gh` CLI and available tools to fulfil it
- Post the response as a comment:
  - `gh issue comment <number> --body "..."` for issues
  - `gh pr comment <number> --body "..."` for PRs
- Be concise and accurate, staying within repo conventions (see `GEMINI.md`)

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` |
| `id-token` | `write` |
| `issues` | `write` |
| `pull-requests` | `write` |
