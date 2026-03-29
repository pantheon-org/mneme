# ADR-015: Extracting Scripts from GitHub Workflows

**Status**: Accepted

## Context

GitHub Actions workflows contain executable logic in two forms: inline `run:` blocks (shell/Python) and `actions/github-script` JavaScript blocks. As workflows grow — particularly the AI inference workflows (`ai-assess`, `ai-triage`, `ai-review`, `ai-invoke`, `ai-fallback`) — those inline scripts accumulate parsing logic, API calls, structured logging, and job summaries. The question is when and whether to extract them to external files.

The project has already moved in both directions: `scripts/select-issue.ts` was extracted from a workflow as a typed Bun script (PR #28), while the `ai-fallback` composite action keeps its Python inline. This ADR captures the tension and resolves it into a clear rule.

## Thesis — Extract to External Scripts

External scripts offer concrete engineering advantages:

- **Testability**: a `.ts` file in `scripts/` can have a colocated `.test.ts` and be covered by `bun test`. Inline YAML cannot.
- **Tooling**: Biome linting, TypeScript strict mode, and editor support apply to `.ts` files. They do not apply to YAML string blocks.
- **Readability at scale**: scripts beyond ~30 lines become hard to read inside YAML indentation. External files have no indentation tax.
- **Reuse**: a typed Bun script in `scripts/` can be called from multiple workflows or from the CLI. Inline blocks cannot be shared without copy-paste.
- **Diff quality**: changes to logic produce clean TypeScript diffs rather than YAML string diffs.

The `select-issue.ts` extraction demonstrates this: it gained an explicit type signature, early-return logic, and is readable in isolation.

## Antithesis — Keep Scripts Inline

Inline scripts preserve workflow locality, which is also a real virtue:

- **Self-containment**: a workflow YAML is a complete description of a job. A reader needs only one file to understand what runs.
- **No checkout dependency**: inline `actions/github-script` blocks run without a repo checkout step. External scripts require `actions/checkout` first, adding latency and a failure surface.
- **Traceability in the UI**: GitHub's Actions run view renders inline scripts in the step log. External script invocations show only the call site.
- **Friction as a forcing function**: the pain of writing complex logic inline discourages over-engineering workflows. If a script is hard to write inline, that may be a signal it belongs elsewhere entirely (a CLI command, not a workflow).
- **Composite actions already solve reuse**: the `ai-fallback` composite action shares fallback logic across all four AI workflows without external scripts, via YAML composition.

Most current `github-script` blocks (label application, comment posting, job summaries) are 15–40 lines of straightforward GitHub API calls. They do not benefit materially from extraction.

## Synthesis — Extract on Complexity, Not on Principle

Neither blanket extraction nor blanket inlining is correct. The rule is:

**Keep inline** when a script:
- Is a single-use step (not shared across workflows)
- Does not contain branching logic beyond simple conditionals
- Is under ~50 non-blank lines
- Requires no unit testing (pure side-effects against well-tested APIs)

**Extract to `scripts/` as a typed Bun script** when a script:
- Is reused across two or more workflows or jobs
- Contains logic that can be wrong in non-obvious ways (parsing, scoring, filtering)
- Would benefit from a type signature at the call boundary
- Exceeds ~50 non-blank lines inside YAML

**Extract to a composite action** (`.github/actions/`) when:
- The extracted unit consists of multiple steps, not just one script
- The unit is invoked as a workflow step, not as a Node.js/Bun process

Applying this rule to the current codebase: the `github-script` blocks in the AI workflows remain inline (single-use, under 50 lines, API side-effects only). The `select-issue.ts` extraction was correct (reused, non-trivial filtering logic). The `ai-fallback` composite action was correct (multi-step, shared across four workflows).

## Consequences

- New workflow scripts default to inline until the extraction criteria are met
- When extraction is triggered, the target is `scripts/<name>.ts` with a colocated `scripts/<name>.test.ts`
- Composite actions remain the pattern for multi-step reuse
- This ADR is the decision record for the `scripts/select-issue.ts` extraction (PR #28) and for keeping AI workflow scripts inline
