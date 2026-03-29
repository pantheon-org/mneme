# ai-complete.yml

Closes the lifecycle loop when a pull request is merged. Finds the linked issue, removes in-progress labels, and marks it as completed.

## Trigger

Standalone workflow — not routed through `ai-dispatch`. Fires on every `pull_request: closed` event where `merged == true`.

## Behaviour

**Timeout**: 5 minutes

Requires no Gemini CLI — pure label manipulation via `actions/github-script`.

## Steps

1. **`Update linked issue labels`** — parses the PR body for a closing keyword (`Closes #N`, `Fixes #N`, `Resolves #N`). If found:
   - Removes `status: wip` (if present)
   - Removes `status: ready` (if present — safety net for edge cases)
   - Applies `status: completed`

If no linked issue is found in the PR body the step exits cleanly with no changes.

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` |
| `issues` | `write` |
| `pull-requests` | `read` |
