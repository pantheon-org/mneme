# gemini-triage.yml

Triages new issues by selecting labels and posting an acknowledgement comment via Gemini CLI.

## Called by

`gemini-dispatch` when `command == 'triage'` (issues opened/reopened, or `@gemini-cli /triage`).

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `additional_context` | `string` | No | Free-text context forwarded from the dispatch command |

## Behaviour

**Concurrency**: one run per issue; cancels in-progress runs for the same issue (newer run wins).

**Timeout**: 7 minutes

**Security**: `GITHUB_TOKEN` is explicitly set to empty during the Gemini CLI step. The workflow runs on untrusted issue body content, so no auth token is exposed to the model.

## Steps

1. **`get_labels`** — fetches all repository labels via the GitHub API (paginated). Fails fast if the repository has no labels.

2. **`gemini_triage`** — calls `google-github-actions/run-gemini-cli@v0` with the issue title, body, and available labels. Instructs Gemini to output a single JSON object:

   ```json
   {"labels": ["bug", "package: core"], "comment": "..."}
   ```

   Max 25 session turns. Only shell tool `echo` is permitted (no filesystem or network access).

3. **`Apply labels and post comment`** — parses the JSON from Gemini's `summary` output, then:
   - Calls `issues.addLabels` with the selected labels
   - Calls `issues.createComment` with the triage comment prefixed by `🤖 **Gemini Triage**`

## Gemini prompt instructions

- Analyse the issue content carefully
- Select 1–3 labels from the available set
- Write a 2–4 sentence triage comment that:
  - Acknowledges the issue
  - Names the affected package(s) (`types` / `core` / `cli` / `hook-claude-code` / `plugin-opencode`)
  - States the nature (bug, enhancement, docs, question, etc.)
  - Mentions next steps if obvious

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` |
| `id-token` | `write` |
| `issues` | `write` |
| `pull-requests` | `read` |
