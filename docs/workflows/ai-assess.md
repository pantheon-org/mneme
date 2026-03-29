# ai-assess.yml

Assesses whether a newly opened issue is ready to be worked on independently or needs more information first.

## Called by

`ai-dispatch` for every `issues` event (`opened`, `reopened`), in parallel with `ai-triage`.

## Inputs

None. The workflow reads directly from the triggering issue event.

## Behaviour

**Concurrency**: one run per issue; cancels in-progress runs for the same issue (newer run wins).

**Timeout**: 7 minutes

**Security**: `GITHUB_TOKEN` is explicitly set to empty during the Gemini CLI step. The workflow runs on untrusted issue content, so no auth token is exposed to the model.

## Readiness criteria

An issue is considered **ready** when all of the following are true:

- The problem or desired outcome is clearly described
- The affected package(s) can be identified (`types` / `core` / `cli` / `hook-claude-code` / `plugin-opencode`)
- There are no blocking ambiguities that require human input before starting
- It is actionable as a standalone unit of work

If any criterion is not met, the issue is assessed as **needs-info**.

## Steps

1. **`gemini_assess`** — calls `google-github-actions/run-gemini-cli@v0` with the issue title and body as env vars. Instructs Gemini to output a single JSON object:

   ```json
   {"ready": true, "label": "status: ready", "reason": "..."}
   ```

   Max 10 session turns. Only shell tool `echo` is permitted.

2. **`Apply label and post assessment`** — parses the JSON, then:
   - Applies one of `status: ready` or `status: needs-info` (validated against that allowlist before calling the API; warns if the label doesn't exist in the repository)
   - Posts a comment prefixed with `🤖 **AI Assessment**` and either `✅ Ready to work` or `⏳ Needs more info`, followed by Gemini's 2–3 sentence reason

## Required labels

The following labels must exist in the repository for the workflow to apply them:

| Label | Meaning |
|---|---|
| `status: ready` | Issue is self-contained and can be started immediately |
| `status: needs-info` | Issue requires clarification or more context before work can begin |

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` |
| `id-token` | `write` |
| `issues` | `write` |
| `pull-requests` | `read` |
