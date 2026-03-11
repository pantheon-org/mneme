---
name: vault-capture
description: >
  Capture an important insight, decision, constraint, pattern, or discovery to
  persistent memory. Use proactively when the conversation produces something
  worth remembering across sessions: architectural decisions, recurring bugs,
  hard-won constraints, naming conventions, or user preferences.
allowed-tools:
  - Bash
---

# vault-capture

Persist a memory to the vault so it can be retrieved in future sessions.

## When to use

Use whenever the conversation produces:
- A confirmed decision ("we're using X instead of Y")
- A constraint that must not be violated
- A recurring bug or workaround
- A project convention or naming pattern
- A user preference expressed explicitly

## How to use

```bash
vault-cli capture --text "<memory content>" [--tier episodic|semantic|procedural] [--project <id>] [--tags tag1,tag2]
```

Or pipe from stdin:
```bash
echo "<memory content>" | vault-cli capture
```

## Tiers

- `episodic` — time-bound session event (default)
- `semantic` — distilled fact or rule
- `procedural` — how-to or step-by-step process

## Examples

```bash
vault-cli capture --text "Decided to use Bun instead of Node for all scripts. Reason: workspace protocol support." --tier semantic --tags bun,tooling

vault-cli capture --text "Never use --force-push on main. CI enforces branch protection." --tier procedural --tags git,ci
```
