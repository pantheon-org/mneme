# Mistral — Setup Guide

Step-by-step guide to adding Mistral as an AI provider for the workflow automation layer.

---

## Overview

[Mistral La Plateforme](https://console.mistral.ai) provides a free **Experiment plan** with generous token limits. Once `MISTRAL_API_KEY` is set, Mistral will be used automatically according to `AI_PROVIDER_ORDER`.

| Model | Tier | Notes |
|-------|------|-------|
| `mistral-large-3-25-12` | Large | Flagship, recommended — open-weight, multimodal |
| `mistral-medium-3-1-25-08` | Medium | Frontier-class multimodal |
| `mistral-small-4-0-26-03` | Small | Cheaper/faster option |

> **Note:** `mistral-large-latest` is not a documented alias. Pin to a versioned ID like `mistral-large-3-25-12`. **Privacy note:** The Experiment plan requires opting into data training. If this is a concern, consider upgrading to a paid Mistral plan.

---

## Prerequisites

- A Mistral account (email + **phone number** required)
- Admin access to the GitHub repository or organisation

---

## Step 1 — Create a Mistral Account

1. Go to [console.mistral.ai](https://console.mistral.ai).
2. Sign up with your email address.
3. Verify your phone number (required for all tiers).
4. During onboarding, select the **Experiment** plan (free).
5. Accept the data training opt-in when prompted.

---

## Step 2 — Generate an API Key

1. Log in and navigate to **API Keys** in the left sidebar.
2. Click **Create new key**.
3. Give it a descriptive name (e.g. `mneme-github-actions`).
4. Copy the key — it will not be shown again.

---

## Step 3 — Add the Secret to GitHub

### For a single repository

1. Navigate to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret**.
3. Name: `MISTRAL_API_KEY` — Value: your API key from Step 2.
4. Click **Add secret**.

### For an organisation

1. Navigate to your organisation's **Settings > Secrets and variables > Actions**.
2. Click **New organization secret**.
3. Name: `MISTRAL_API_KEY` — Value: your API key.
4. Set **Repository access** to the relevant repositories (or "All repositories").
5. Click **Add secret**.

---

## Step 4 — Set the Model Variable

Pin to a versioned model ID to avoid breakage from undocumented alias changes:

```bash
gh variable set MISTRAL_MODEL --body "mistral-large-3-25-12" --repo pantheon-org/mneme
```

Or via **Settings > Variables > Actions > New repository variable**.

---

## Step 5 — Verify

Mistral activates automatically once the secret is present. To confirm it is working:

1. Trigger a triage, assess, or review workflow (e.g. open an issue).
2. The resulting GitHub comment footer will include `(mistral)`.

Alternatively, check the workflow run logs — the dispatch step logs `[ai-run] backend_used=mistral`.

---

## Configuration Reference

### Secret

| Secret | Required | Purpose |
|--------|----------|---------|
| `MISTRAL_API_KEY` | Yes (to use Mistral) | Authenticates with the Mistral La Plateforme API |

### Variables

| Variable | Recommended value | Purpose |
|----------|-------------------|---------|
| `MISTRAL_MODEL` | `mistral-large-3-25-12` | Model to use for inference |
| `AI_PROVIDER_ORDER` | `cerebras,gemini,anthropic,mistral` | Controls provider priority |

### Behaviour

- Mistral is invoked when it appears in `AI_PROVIDER_ORDER` and `MISTRAL_API_KEY` is set.
- If the call fails, the next provider in `AI_PROVIDER_ORDER` is tried.
- If no provider succeeds, the workflow step exits with failure.

See [configuration.md](../configuration.md) for all available variables.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `[ai-run] skipping mistral: no API key` | `MISTRAL_API_KEY` secret not set | Add the secret (Step 3) |
| `Mistral HTTP 401` in logs | API key invalid or revoked | Generate a new key at console.mistral.ai |
| `Mistral HTTP 402` or billing error | Experiment plan exhausted | Check token usage at console.mistral.ai |
| `Mistral HTTP 404` in logs | Model not found | Set `MISTRAL_MODEL` to a valid versioned ID (Step 4) |
| Phone verification loop | Account not fully verified | Complete phone verification at console.mistral.ai |
