# ai-dispatch.yml

Entry point for all Gemini CLI automation. Listens to GitHub events, applies guard conditions, extracts a command, and delegates to the appropriate child workflow.

## Trigger events

| Event | Types |
|---|---|
| `pull_request` | `opened` |
| `issues` | `opened`, `reopened` |
| `issue_comment` | `created` |
| `pull_request_review` | `submitted` |
| `pull_request_review_comment` | `created` |

## Guard conditions

The `dispatch` job only runs when one of the following is true:

- **PR opened** from a non-fork branch (`head.repo.fork == false`)
- **Issue opened or reopened**
- **Comment or review** where the body starts with `@gemini-cli` and the author is `OWNER`, `MEMBER`, or `COLLABORATOR`

## Routing logic

The `extract_command` step parses the event body using the pattern `@gemini-cli [/command] [request]` and sets a `command` output:

| Condition | Routes to |
|---|---|
| `issues` event (open/reopen) | `triage` + `assess` (parallel) |
| `pull_request` event (no `@gemini-cli` body) | `review` |
| `@gemini-cli /review ...` | `review` |
| `@gemini-cli /triage ...` | `triage` |
| `@gemini-cli [anything else]` | `invoke` |

## Outputs

| Output | Value |
|---|---|
| `command` | Resolved trigger: `triage`, `review`, or `invoke` |
| `request` | Free-text portion after the command |
| `additional_context` | Same as `request` |
| `issue_number` | PR or issue number |

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` |
| `id-token` | `write` |
| `issues` | `write` |
| `pull-requests` | `write` |
