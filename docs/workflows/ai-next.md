# ai-next.yml

Picks the highest-priority `status: ready` issue and runs a full implementation on it. Enforces serial execution — skips if any issue is already `status: wip`.

## Triggers

| Trigger | When |
|---|---|
| `workflow_dispatch` | Manual run from the Actions tab |
| `schedule` | 08:00 UTC, Monday–Friday |
| `workflow_call` | Via `@gemini-cli /next` comment (routed through dispatch) |

## Behaviour

**Serial execution**: if any open issue currently has `status: wip`, the workflow exits immediately. Only one issue is implemented at a time.

**Priority ordering**: `priority: critical` → `priority: high` → `priority: medium` → `priority: low` → unlabelled.

## Steps

1. **`pick`** — queries all open `status: ready` issues via the GitHub API:
   - Aborts if any issue has `status: wip`
   - Sorts by priority weight
   - Outputs `issue_number` and `issue_title` of the top candidate

2. **`implement`** — calls `ai-invoke.yml` with `trigger: implement` and the selected `issue_number`. Skipped if no issue was selected.

## Permissions

| Permission | Level |
|---|---|
| `contents` | `read` (select job) |
| `issues` | `read` (select job) |
| Inherits invoke permissions for the implement job | — |
