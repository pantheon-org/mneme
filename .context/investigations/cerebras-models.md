# Cerebras Model Investigation

**Date:** 2026-03-30
**Source:** `https://api.cerebras.ai/public/v1/models` (public, no auth required)

## Available Models

| ID | Notes |
|---|---|
| `llama3.1-8b` | Small, very fast |
| `qwen-3-235b-a22b-instruct-2507` | Large (235B), still fast due to Cerebras hardware inference |

## Dead Models

| ID | Status |
|---|---|
| `gpt-oss-120b` | **Removed** — returns `{"detail":"Model 'gpt-oss-120b' not found or not publicly available"}` |

## Impact

The `ai-run` action was defaulting to `gpt-oss-120b`, causing every Cerebras call to fail silently.

## Recommendation

Default to `qwen-3-235b-a22b-instruct-2507` for best quality. Use `llama3.1-8b` only when latency is the priority.

## Setting the Model

Set the `CEREBRAS_MODEL` repository variable — see [github-repo-variables.md](github-repo-variables.md).

## How to Discover Models

The public endpoint requires no API key:

```bash
curl -sS 'https://api.cerebras.ai/public/v1/models' | jq '.data[].id'
```
