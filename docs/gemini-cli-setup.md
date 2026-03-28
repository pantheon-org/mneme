# Gemini CLI GitHub Action — Setup Guide

Step-by-step guide to enabling Gemini CLI automation for issue triage, PR review, and on-demand AI assistance in a GitHub repository or organisation.

---

## Overview

The [`google-github-actions/run-gemini-cli`](https://github.com/google-github-actions/run-gemini-cli) action integrates Gemini into your GitHub workflow. Once configured it will:

- **Automatically triage** new issues (labels + comment)
- **Automatically review** new pull requests
- **Respond on-demand** to `@gemini-cli <request>` comments from repo members
- **Accept slash commands**: `@gemini-cli /triage`, `@gemini-cli /review`

---

## Prerequisites

- A GitHub account with admin access to the repository or organisation
- A Google account to obtain a Gemini API key

---

## Step 1 — Obtain a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **Create API key** and copy the value.

> The free tier is generous and sufficient for most open-source projects.

---

## Step 2 — Add the Secret to GitHub

### For a single repository

1. Navigate to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret**.
3. Name: `GEMINI_API_KEY` — Value: your API key from Step 1.
4. Click **Add secret**.

### For an organisation (all repos share the key)

1. Navigate to your organisation's **Settings > Secrets and variables > Actions**.
2. Click **New organization secret**.
3. Name: `GEMINI_API_KEY` — Value: your API key.
4. Set **Repository access** to the repos that should use it (or "All repositories").
5. Click **Add secret**.

---

## Step 3 — Update .gitignore

Add these entries to prevent Gemini CLI artefacts from being committed:

```gitignore
# Gemini CLI settings and credentials
.gemini/
gha-creds-*.json
```

---

## Step 4 — Copy the Workflow Files

The workflow files for this repository are already present in `.github/workflows/`:

| File | Purpose |
|---|---|
| `gemini-dispatch.yml` | Central router — required, triggers all others |
| `gemini-triage.yml` | Auto-labels and comments on new issues |
| `gemini-review.yml` | Reviews pull requests on open or on demand |
| `gemini-invoke.yml` | General-purpose assistant for any `@gemini-cli` mention |

For a **new repository**, copy these four files into `.github/workflows/`.

To fetch them directly from the upstream examples instead:

```bash
mkdir -p .github/workflows

curl -o .github/workflows/gemini-dispatch.yml \
  https://raw.githubusercontent.com/google-github-actions/run-gemini-cli/main/examples/workflows/gemini-dispatch/gemini-dispatch.yml

curl -o .github/workflows/gemini-triage.yml \
  https://raw.githubusercontent.com/google-github-actions/run-gemini-cli/main/examples/workflows/issue-triage/gemini-triage.yml

curl -o .github/workflows/gemini-review.yml \
  https://raw.githubusercontent.com/google-github-actions/run-gemini-cli/main/examples/workflows/pr-review/gemini-review.yml

curl -o .github/workflows/gemini-invoke.yml \
  https://raw.githubusercontent.com/google-github-actions/run-gemini-cli/main/examples/workflows/gemini-assistant/gemini-invoke.yml
```

---

## Step 5 — Add a GEMINI.md File

Create a `GEMINI.md` file in the repository root. This is the project-context file Gemini reads before acting — equivalent to `CLAUDE.md` for Claude Code.

This repository's `GEMINI.md` already exists and covers:

- Package structure and dependency graph
- Code conventions (runtime, TypeScript settings, style rules)
- Domain concepts (episodic/semantic/procedural memory)
- Design constraints (non-blocking capture, atomic writes, etc.)
- Label taxonomy for triage

For a new repository, create `GEMINI.md` with at minimum:

```markdown
# GEMINI.md

## What this repository is
<short description>

## Code conventions
<style rules, language, framework>

## Labels
<list of GitHub labels Gemini should use when triaging>
```

---

## Step 6 — Create GitHub Labels

Gemini triage reads existing repo labels and selects from them. Create the labels you want applied before enabling the workflows.

Suggested base set for this repo:

```bash
gh label create "bug"                        --color d73a4a
gh label create "enhancement"               --color a2eeef
gh label create "documentation"             --color 0075ca
gh label create "question"                  --color d876e3
gh label create "good first issue"          --color 7057ff
gh label create "help wanted"               --color 008672
gh label create "package: core"             --color e4e669
gh label create "package: cli"              --color e4e669
gh label create "package: types"            --color e4e669
gh label create "package: hook-claude-code" --color e4e669
gh label create "package: plugin-opencode"  --color e4e669
gh label create "priority: high"            --color b60205
gh label create "priority: medium"          --color fbca04
gh label create "priority: low"             --color 0e8a16
```

---

## Step 7 — Grant Workflow Permissions

The workflows need permission to write comments and apply labels.

1. Go to **Settings > Actions > General**.
2. Under **Workflow permissions**, select **Read and write permissions**.
3. Check **Allow GitHub Actions to create and approve pull requests**.
4. Click **Save**.

---

## Step 8 — Commit and Push

```bash
git checkout -b feat/gemini-cli-integration
git add .github/workflows/gemini-*.yml GEMINI.md .gitignore
git commit -m "feat: add Gemini CLI GitHub Action workflows"
git push -u origin feat/gemini-cli-integration
```

Open a pull request to merge into `main`.

---

## Step 9 — Verify

Once merged:

1. **Issue triage**: Open a new issue. Within ~1 minute Gemini should add labels and post a triage comment.
2. **PR review**: Open a pull request. Gemini should post a review comment automatically.
3. **On-demand**: Comment `@gemini-cli explain this issue` on any issue or PR. Only `OWNER`, `MEMBER`, and `COLLABORATOR` roles can trigger this.

---

## Optional: Organisation-Wide Workflow Template

To apply these workflows to every new repository in an organisation without copying files manually:

1. Create a repository named **`.github`** inside the organisation (e.g. `pantheon-org/.github`).
2. Place the four workflow files under `workflow-templates/`.
3. Add a `workflow-templates/gemini-dispatch.properties.json` metadata file:

```json
{
  "name": "Gemini CLI Dispatch",
  "description": "Central dispatcher for Gemini CLI issue triage and PR review",
  "iconName": "octicon-hubot",
  "categories": ["automation", "ai"],
  "filePatterns": ["gemini-dispatch.yml"]
}
```

1. Members creating new workflows in any repo under the org will see these as starter templates.

See [GitHub docs — Creating starter workflows](https://docs.github.com/en/actions/writing-workflows/using-workflow-templates) for full details.

---

## Configuration Reference

### Repository Variables (optional)

Set under **Settings > Variables > Actions**:

| Variable | Purpose | Example |
|---|---|---|
| `GEMINI_MODEL` | Override the default model | `gemini-2.5-pro` |
| `GEMINI_CLI_VERSION` | Pin a specific CLI version | `0.1.9` |
| `GEMINI_DEBUG` | Enable verbose debug output | `true` |

### Secrets

| Secret | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Authenticates with the Gemini API |
| `APP_PRIVATE_KEY` | No | GitHub App private key (advanced auth) |

### Advanced: GitHub App Authentication

For higher API rate limits or cross-repo access, replace `GITHUB_TOKEN` with a GitHub App token:

1. Create a GitHub App with `issues: write` and `pull-requests: write` permissions.
2. Install it on the repository.
3. Add `APP_ID` as a repository variable and `APP_PRIVATE_KEY` as a secret.
4. The dispatch workflow will automatically use the app token when `APP_ID` is set.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No triage comment on new issue | `GEMINI_API_KEY` secret missing or wrong | Re-add the secret |
| `There are no issue labels` error | Repo has no labels | Run the `gh label create` commands in Step 6 |
| `@gemini-cli` comment ignored | Commenter is not OWNER/MEMBER/COLLABORATOR | Add the user as a collaborator |
| Workflow not triggering | Workflow permissions not set to read+write | Revisit Step 7 |
| 401 Unauthorized from Gemini API | API key expired or invalid | Generate a new key at Google AI Studio |
