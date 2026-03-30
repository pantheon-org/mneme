# Cerebras — Setup Guide

Step-by-step guide to adding Cerebras as an AI provider for the workflow automation layer.

---

## Overview

[Cerebras](https://cloud.cerebras.ai) provides a free-tier OpenAI-compatible inference API with very fast inference due to dedicated hardware. Once `CEREBRAS_API_KEY` is set, Cerebras will be used automatically according to `AI_PROVIDER_ORDER`.

| Model | Notes |
|-------|-------|
| `qwen-3-235b-a22b-instruct-2507` | Large (235B), recommended — strong reasoning, fast on Cerebras hardware |
| `llama3.1-8b` | Small — use when latency is the priority |

> **Note:** `gpt-oss-120b` has been removed from the Cerebras API and will return a 404. Set `CEREBRAS_MODEL` to `qwen-3-235b-a22b-instruct-2507`.

---

## Prerequisites

- A Cerebras account (email sign-up, no phone verification required)
- Admin access to the GitHub repository or organisation

---

## Step 1 — Create a Cerebras Account

1. Go to [cloud.cerebras.ai](https://cloud.cerebras.ai).
2. Sign up with your email address.
3. Verify your email and complete the onboarding.

---

## Step 2 — Generate an API Key

1. Log in and navigate to **API Keys** in the left sidebar.
2. Click **Create new API key**.
3. Give it a descriptive name (e.g. `mneme-github-actions`).
4. Copy the key — it will not be shown again.

---

## Step 3 — Add the Secret to GitHub

### For a single repository

1. Navigate to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret**.
3. Name: `CEREBRAS_API_KEY` — Value: your API key from Step 2.
4. Click **Add secret**.

### For an organisation

1. Navigate to your organisation's **Settings > Secrets and variables > Actions**.
2. Click **New organization secret**.
3. Name: `CEREBRAS_API_KEY` — Value: your API key.
4. Set **Repository access** to the relevant repositories (or "All repositories").
5. Click **Add secret**.

---

## Step 4 — Set the Model Variable

The default model in `action.yml` is stale. Set the repository variable explicitly:

```bash
gh variable set CEREBRAS_MODEL --body "qwen-3-235b-a22b-instruct-2507" --repo pantheon-org/mneme
```

Or via **Settings > Variables > Actions > New repository variable**.

---

## Step 5 — Verify

Cerebras activates automatically once the secret is present. To confirm it is working:

1. Trigger a triage, assess, or review workflow (e.g. open an issue).
2. The resulting GitHub comment footer will include `(cerebras)`.

Alternatively, check the workflow run logs — the dispatch step logs `[ai-run] backend_used=cerebras`.

---

## Configuration Reference

### Secret

| Secret | Required | Purpose |
|--------|----------|---------|
| `CEREBRAS_API_KEY` | Yes (to use Cerebras) | Authenticates with the Cerebras inference API |

### Variables

| Variable | Recommended value | Purpose |
|----------|-------------------|---------|
| `CEREBRAS_MODEL` | `qwen-3-235b-a22b-instruct-2507` | Model to use for inference |
| `AI_PROVIDER_ORDER` | `cerebras,gemini,anthropic,mistral` | Controls provider priority |

### Behaviour

- Cerebras is invoked when it appears in `AI_PROVIDER_ORDER` and `CEREBRAS_API_KEY` is set.
- If the call fails, the next provider in `AI_PROVIDER_ORDER` is tried.
- If no provider succeeds, the workflow step exits with failure.

See [configuration.md](../configuration.md) for all available variables.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `[ai-run] skipping cerebras: no API key` | `CEREBRAS_API_KEY` secret not set | Add the secret (Step 3) |
| `Cerebras HTTP 401` in logs | API key invalid or revoked | Generate a new key at cloud.cerebras.ai |
| `Cerebras HTTP 404` in logs | Model not found | Set `CEREBRAS_MODEL` to `qwen-3-235b-a22b-instruct-2507` (Step 4) |
| `Cerebras HTTP 429` in logs | Rate limit hit (30 RPM) | Add a second provider as fallback via `AI_PROVIDER_ORDER` |
