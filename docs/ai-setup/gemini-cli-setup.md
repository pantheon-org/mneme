# Gemini — Setup Guide

Step-by-step guide to enabling Gemini as an AI provider for issue triage, PR review, and on-demand AI assistance.

---

## Overview

The `ai-run` action calls the [Gemini REST API](https://ai.google.dev/api/generate-content) directly. Once `GEMINI_API_KEY` is set, Gemini will be used automatically according to `AI_PROVIDER_ORDER`. No CLI installation or `GEMINI.md` file is required.

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

## Step 3 — Verify

Once the secret is set, Gemini activates automatically. To confirm it is working:

1. Trigger a triage, assess, or review workflow (e.g. open an issue).
2. The resulting GitHub comment footer will include `(gemini)`.

Alternatively, check the workflow run logs — the dispatch step logs `[ai-run] backend_used=gemini`.

---

## Configuration Reference

### Variables (optional)

Set under **Settings > Variables > Actions**:

| Variable | Purpose | Recommended value |
|---|---|---|
| `GEMINI_MODEL` | Override the default model | `gemini-2.5-pro` |
| `AI_PROVIDER_ORDER` | Control provider priority | `cerebras,gemini,anthropic,mistral` |

See [configuration.md](../configuration.md) for all available variables.

### Secrets

| Secret | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes (to use Gemini) | Authenticates with the Gemini REST API |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No triage comment on new issue | `GEMINI_API_KEY` secret missing or wrong | Re-add the secret |
| `[ai-run] skipping gemini: no API key` in logs | Secret not set or not accessible | Check secret name and repo access |
| `Gemini HTTP 401` in logs | API key expired or invalid | Generate a new key at Google AI Studio |
| `Gemini HTTP 429` in logs | Rate limit hit | Add a second provider as fallback via `AI_PROVIDER_ORDER` |
