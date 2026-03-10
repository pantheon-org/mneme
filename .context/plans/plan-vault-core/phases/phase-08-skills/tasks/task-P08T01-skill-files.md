# P08T01 — skill-files

## Phase

08 — skills

## Goal

Write the four SKILL.md files: `vault-capture`, `vault-search`, `vault-fetch`, `vault-consolidate`. Each must include valid YAML frontmatter with `name`, `description`, `allowed-tools`, and a body describing when the skill auto-invokes and what `vault-cli` command it calls.

## File to create/modify

```
skills/
├── vault-capture/SKILL.md
├── vault-search/SKILL.md
├── vault-fetch/SKILL.md
└── vault-consolidate/SKILL.md
```

## Implementation

`skills/vault-capture/SKILL.md`:
```markdown
---
name: vault-capture
description: >
  Save important information to the persistent vault. Auto-invoke when the user
  says "remember this", "save this", "note that", or when a significant decision,
  constraint, or lesson is established. Also invoke before ending a session to
  capture key outcomes.
allowed-tools: Bash
---

When invoked, run:

```bash
vault-cli capture --text "<content>" [--tier episodic|semantic|procedural] [--project <id>] [--tags <tags>]
```

Use `--tier semantic` for general truths, `--tier procedural` for workflows or patterns,
`--tier episodic` (default) for session-specific events.
```

`skills/vault-search/SKILL.md`:
```markdown
---
name: vault-search
description: >
  Search the persistent vault for relevant past knowledge. Auto-invoke at session
  start to retrieve relevant context, and whenever working on a topic where prior
  decisions, constraints, or patterns would help.
allowed-tools: Bash
---

When invoked, run:

```bash
vault-cli search "<query>" [--top-k 7] [--project <id>]
```

Results are ranked by relevance. Use the output to inform decisions and avoid
repeating past mistakes.
```

Implement `vault-fetch` and `vault-consolidate` similarly.

## Notes

- `allowed-tools: Bash` is required for the harness to permit `vault-cli` subprocess calls
- The `description` field is the auto-invocation trigger — it must be specific enough to match user intent without false positives

## Verification

```sh
ls skills/vault-capture/SKILL.md skills/vault-search/SKILL.md skills/vault-fetch/SKILL.md skills/vault-consolidate/SKILL.md
# all four must exist
head -5 skills/vault-capture/SKILL.md
# must show valid YAML frontmatter
```
