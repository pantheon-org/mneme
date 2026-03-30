# Mistral Model Investigation

**Date:** 2026-03-30
**Source:** `https://docs.mistral.ai/getting-started/models/models_overview/`

## Available Models (current-gen)

### Generalist / Frontier

| API ID | Tier | Notes |
|---|---|---|
| `mistral-large-3-25-12` | Large | Flagship, open-weight, multimodal |
| `mistral-medium-3-1-25-08` | Medium | Frontier-class multimodal (Aug 2025) |
| `mistral-medium-3-25-05` | Medium | Previous medium release |
| `mistral-small-4-0-26-03` | Small | Latest small, hybrid model |
| `mistral-small-3-2-25-06` | Small | Previous small release |
| `mistral-small-3-1-25-03` | Small | |

### Specialist

| API ID | Notes |
|---|---|
| `devstral-small-2-25-12` | Code agents |
| `ministral-3-14b-25-12` | Edge/on-device |
| `mistral-saba-25-02` | |
| `mistral-moderation-26-03` | Moderation with jailbreak detection |
| `codestral-25-08` | Code completion |

## `*-latest` Aliases

Only **one** `latest` alias is documented: `mistral-saba-latest`.

`mistral-large-latest` and `mistral-small-latest` are **not documented** as valid aliases and should not be relied upon.

## Impact

The `ai-run` action was defaulting to `mistral-large-latest`, which is undocumented. Pinning to a versioned ID is safer.

## Recommendation

Default to `mistral-large-3-25-12` for best quality. Switch to `mistral-small-4-0-26-03` for cheaper/faster runs.

## Setting the Model

Set the `MISTRAL_MODEL` repository variable — see [github-repo-variables.md](github-repo-variables.md).

## How to Discover Models

The `/v1/models` endpoint requires an API key:

```bash
curl -sS 'https://api.mistral.ai/v1/models' \
  -H "Authorization: Bearer $MISTRAL_API_KEY" | jq '.data[].id'
```
