# Cerebras — Setup Guide

Step-by-step guide to adding Cerebras as an AI inference fallback for the workflow automation layer.

---

## Overview

[Cerebras](https://cloud.cerebras.ai) provides a free-tier OpenAI-compatible inference API. It serves as the **primary fallback** when the Gemini daily quota is exhausted.

| Model | Free tier limit |
|-------|----------------|
| `gpt-oss-120b` | 14,400 requests/day · 30 RPM · 1M tokens/day |
| `llama3.1-8b` | 14,400 requests/day · 30 RPM · 1M tokens/day |

The `gpt-oss-120b` model is used by default — it provides strong reasoning at the same RPD ceiling as Llama.

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

## Step 4 — Verify

Cerebras activates automatically once the secret is present. To confirm it is working:

1. Exhaust or temporarily invalidate the Gemini API key to force a fallback.
2. Trigger a triage, assess, or review workflow.
3. The resulting GitHub comment footer will read `(cerebras)` instead of `(gemini)`.

Alternatively, check the workflow run logs — the fallback step will print `Cerebras succeeded.` to stderr.

---

## Configuration Reference

### Secret

| Secret | Required | Purpose |
|--------|----------|---------|
| `CEREBRAS_API_KEY` | Yes (for fallback) | Authenticates with the Cerebras inference API |

### Behaviour

- Cerebras is only invoked when Gemini fails with a `TerminalQuotaError` (exit code 1).
- If Cerebras also fails, the workflow falls through to Mistral (if `MISTRAL_API_KEY` is set).
- If neither fallback key is present, the workflow step is skipped and the run exits without posting a comment.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Fallback step skipped silently | `CEREBRAS_API_KEY` secret not set | Add the secret (Step 3) |
| `HTTP 401` in fallback step logs | API key invalid or revoked | Generate a new key at cloud.cerebras.ai |
| `HTTP 429` in fallback step logs | Rate limit hit (30 RPM) | Unlikely at normal volume; add `MISTRAL_API_KEY` as secondary fallback |
| Comment footer shows `(fallback)` | `backend_used` output was empty | Transient issue; re-run the workflow |
