# GitHub Repository Variables & Secrets Setup

All AI provider configuration is driven by GitHub Actions **variables** (non-sensitive) and **secrets** (API keys). If a variable is unset, the workflow falls back to the hardcoded default in the action.

## Repository: `pantheon-org/mneme`

---

## Variables (`vars.*`)

Set at: **Settings → Secrets and variables → Actions → Variables tab**

| Variable | Recommended value | Fallback if unset |
|---|---|---|
| `AI_PROVIDER_ORDER` | `cerebras,gemini,anthropic,mistral` | `cerebras,gemini,anthropic,mistral` |
| `CEREBRAS_MODEL` | `qwen-3-235b-a22b-instruct-2507` | `gpt-oss-120b` ⚠️ dead |
| `GEMINI_MODEL` | `gemini-2.5-pro` | `gemini-2.5-pro` |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | `claude-sonnet-4-6` |
| `MISTRAL_MODEL` | `mistral-large-3-25-12` | `mistral-large-latest` ⚠️ undocumented alias |

### Via GitHub CLI

```bash
gh variable set CEREBRAS_MODEL --body "qwen-3-235b-a22b-instruct-2507" --repo pantheon-org/mneme
gh variable set GEMINI_MODEL    --body "gemini-2.5-pro"                 --repo pantheon-org/mneme
gh variable set ANTHROPIC_MODEL --body "claude-sonnet-4-6"              --repo pantheon-org/mneme
gh variable set MISTRAL_MODEL   --body "mistral-large-3-25-12"          --repo pantheon-org/mneme
gh variable set AI_PROVIDER_ORDER --body "cerebras,gemini,anthropic,mistral" --repo pantheon-org/mneme
```

### Via UI

1. Go to `https://github.com/pantheon-org/mneme/settings/variables/actions`
2. Click **New repository variable**
3. Enter the name and value from the table above

---

## Secrets (`secrets.*`)

Set at: **Settings → Secrets and variables → Actions → Secrets tab**

| Secret | Provider |
|---|---|
| `CEREBRAS_API_KEY` | Cerebras — https://cloud.cerebras.ai |
| `GEMINI_API_KEY` | Google AI Studio — https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | Anthropic Console — https://console.anthropic.com/settings/keys |
| `MISTRAL_API_KEY` | Mistral La Plateforme — https://console.mistral.ai/api-keys |

### Via GitHub CLI

```bash
gh secret set CEREBRAS_API_KEY  --repo pantheon-org/mneme
gh secret set GEMINI_API_KEY    --repo pantheon-org/mneme
gh secret set ANTHROPIC_API_KEY --repo pantheon-org/mneme
gh secret set MISTRAL_API_KEY   --repo pantheon-org/mneme
```

Each command prompts for the value interactively (not echoed to terminal).

### Via UI

1. Go to `https://github.com/pantheon-org/mneme/settings/secrets/actions`
2. Click **New repository secret**
3. Enter the name and paste the API key

---

## Notes

- Providers with no API key set are **silently skipped** — no error is raised.
- `AI_PROVIDER_ORDER` controls priority; the first provider with a valid key wins.
- Model variables allow upgrading models without touching workflow files.
- See [`cerebras-models.md`](cerebras-models.md) and [`mistral-models.md`](mistral-models.md) for model availability details.
