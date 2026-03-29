# Mistral La Plateforme — Setup Guide

Step-by-step guide to adding Mistral as a secondary AI inference fallback for the workflow automation layer.

---

## Overview

[Mistral La Plateforme](https://console.mistral.ai) provides a free **Experiment plan** with generous token limits. It serves as the **secondary fallback** — invoked only when both Gemini and Cerebras are unavailable.

| Model | Free tier limit |
|-------|----------------|
| `mistral-large-latest` | 1 req/s · 500K tokens/min · 1B tokens/month |

> **Privacy note:** The Experiment plan requires opting into data training. If this is a concern, consider upgrading to a paid Mistral plan or relying on Cerebras alone.

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

## Step 4 — Verify

Mistral activates automatically once the secret is present. To confirm it is working:

1. Force both Gemini and Cerebras to fail (e.g. provide invalid keys temporarily).
2. Trigger a triage, assess, or review workflow.
3. The resulting GitHub comment footer will read `(mistral)`.

Alternatively, check the workflow run logs — the fallback step will print `Mistral succeeded.` to stderr.

---

## Configuration Reference

### Secret

| Secret | Required | Purpose |
|--------|----------|---------|
| `MISTRAL_API_KEY` | No (secondary fallback only) | Authenticates with the Mistral La Plateforme API |

### Behaviour

- Mistral is only invoked when both Gemini and Cerebras have failed or are not configured.
- The fallback order is: **Gemini → Cerebras → Mistral**.
- If no fallback key succeeds, the workflow step exits without posting a comment. The run itself does not fail.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Fallback step skipped silently | `MISTRAL_API_KEY` secret not set | Add the secret (Step 3) |
| `HTTP 401` in fallback step logs | API key invalid or revoked | Generate a new key at console.mistral.ai |
| `HTTP 402` or billing error | Experiment plan exhausted | Check token usage at console.mistral.ai; 1B tokens/month is shared across all calls |
| Phone verification loop | Account not fully verified | Complete phone verification at console.mistral.ai before generating a key |
