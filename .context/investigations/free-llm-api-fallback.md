# Free LLM API Fallback Investigation

## Context

The `gemini-cli` integration in our GitHub Actions workflows hits a hard daily quota of **20 requests/day** on the free tier (`gemini-2.5-flash`, `generate_content_free_tier_requests`). The error is classified as `TerminalQuotaError` (exit code 1, non-retriable) and blocks the entire pipeline for the rest of the day.

Error signature for detection:
```
TerminalQuotaError: You have exhausted your daily quota on this model.
```

Sources investigated:
- https://github.com/mnfst/awesome-free-llm-apis
- https://github.com/cheahjs/free-llm-api-resources
- https://opencode.ai/docs/zen/

---

## Provider Comparison

| Provider | RPD | RPM | Token Limit | OpenAI-compat | Notes |
|----------|-----|-----|-------------|---------------|-------|
| Gemini (current) | 20 | 5–15 | — | No (own CLI) | Hard daily cap; full agentic CLI |
| **Cerebras** | **14,400** | 30 | 1M tok/day | Yes | `gpt-oss-120b` + Llama 3.1 8B; no phone/data opt-in required |
| Mistral Codestral | 2,000 | 30 | — | Yes | Code-focused; requires phone verification |
| Mistral La Plateforme | ~33K/mo | 1 req/s | 1B tok/mo | Yes | Requires phone + data training opt-in |
| OpenRouter (free) | 50 (1K with $10 topup) | 20 | shared | Yes | Built-in free model router + fallback routing natively |
| GitHub Models | very low | — | very low | Yes | Copilot-tier dependent; very restrictive token caps |
| Cohere | 1,000/month | 20 | shared | Yes | Monthly cap shared across all models |

**Discarded:** Groq (redline — non-negotiable), Cohere (monthly cap too low), GitHub Models (token limits too restrictive), Zhipu (undocumented limits).

---

## Workflow Classification

Inspecting each workflow file resolves the agentic vs. inference question precisely.

### No LLM involved — pure GitHub Script logic
- **`gemini-dispatch.yml`** — parses `@gemini-cli` comment and routes to the appropriate workflow. No model call.
- **`gemini-complete.yml`** — updates issue labels (`status: wip` → `status: completed`) when a PR is merged. No model call.
- **`gemini-next.yml`** (selection job) — picks the highest-priority `status: ready` issue via JS scoring. No model call. Then delegates to `gemini-invoke.yml`.

### Inference tier — restricted tools, prompt → response only
These workflows pass a prompt to `gemini-cli` but explicitly restrict tool use to `run_shell_command(echo)` — effectively no real tool execution, just structured output captured and posted via `actions/github-script`.

- **`gemini-triage.yml`** — triages a new issue (labels, priority). Tools: `run_shell_command(echo)` only.
- **`gemini-assess.yml`** — assesses an issue or PR. Tools: `run_shell_command(echo)` only.

### Semi-agentic — reads repo files, writes GitHub comments
- **`gemini-review.yml`** — checks out the repo, reads diff/files, posts a PR review comment. `maxSessionTurns: 30`. No shell commands beyond reading. No code writes or commits.

### Fully agentic — reads + writes files, runs gh CLI, commits code
- **`gemini-invoke.yml`** — full agentic execution: checkout, setup-bun, unrestricted tool use (`gh CLI and available tools`). Implements issues end-to-end.

---

## Revised Fallback Strategy

### Fully agentic tier (`gemini-invoke.yml`)

No viable API-only fallback exists. On `TerminalQuotaError`:

1. Remove `status: wip` label from the issue.
2. Re-apply `status: ready`.
3. The next scheduled `gemini-next.yml` run (08:00 UTC, Mon–Fri) will automatically re-pick it.

This reuses the **existing label-based state machine** — no new queue files, no new infrastructure. The issue simply re-enters the ready queue and is retried the following day.

### Semi-agentic tier (`gemini-review.yml`)

`gemini-review.yml` only reads files and posts a comment — no writes, no commits. This can be replaced with a direct OpenAI-compatible API call (pass the diff as context, post the response as a PR comment via `actions/github-script`). Cerebras is the natural fallback here.

### Inference tier (`gemini-triage.yml`, `gemini-assess.yml`)

Straightforward replacement: a `curl` call to a Cerebras or Mistral endpoint with the same prompt, output captured and posted via `actions/github-script`.

### Fallback order (inference + semi-agentic)

```
Gemini CLI (20 RPD) → Cerebras gpt-oss-120b (14,400 RPD) → Mistral Large 3 (1B tok/mo)
```

Cerebras is the primary fallback: 720× Gemini's daily cap, strong model (`gpt-oss-120b`), OpenAI-compatible, no signup friction beyond an API key.

---

## OpenCode Zen — Resolved

OpenCode Zen is a **paid, pay-as-you-go** AI gateway — not a free tier. The "free" models listed (MiniMax M2.5 Free, MiMo V2, etc.) are limited-time promotional freebies with data training opt-in, not permanent free tiers. **Not suitable as a reliable fallback.**

The repo ships `plugin-opencode` for the OpenCode coding agent integration, which is unrelated to Zen's API gateway. These are separate concerns.

---

## Cerebras vs. Other Options (Groq excluded)

| Criterion | Cerebras | Mistral La Plateforme | Mistral Codestral |
|-----------|----------|----------------------|-------------------|
| RPD | 14,400 | ~33K/mo (~1K/day avg) | 2,000 |
| Signup friction | API key only | Phone + data opt-in | Phone verification |
| Model quality | `gpt-oss-120b` (strong) | Mistral Large 3 (strong) | Codestral (code-only) |
| OpenAI-compat | Yes | Yes | Yes |
| Data policy | Standard | Opt-in training required | Standard |

**Verdict:** Cerebras is the clear primary fallback. No phone verification, no data training opt-in, and a 14,400 RPD ceiling that will practically never be hit by this repo's workflow volume. Mistral La Plateforme is the secondary option if Cerebras is unavailable, but the data training opt-in is a friction point worth noting.

---

## Proposed Workflow Architecture

1. **Agentic tier** (`gemini-invoke.yml`): add a failure handler that detects `TerminalQuotaError` and resets the issue label back to `status: ready`. No new workflow needed.
2. **Inference + semi-agentic tier**: introduce a reusable `ai-infer.yml` workflow that:
   - Tries Gemini CLI first
   - On `TerminalQuotaError` (exit code 1 + stderr match), falls back to a `curl` call to Cerebras
   - On Cerebras failure, falls back to Mistral La Plateforme
3. A repo variable `AI_INFERENCE_BACKENDS` (e.g. `"gemini,cerebras,mistral"`) controls order without code changes.
4. `gemini-review.yml`, `gemini-triage.yml`, `gemini-assess.yml` all delegate to `ai-infer.yml`.
