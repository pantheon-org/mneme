# Phase 08 — skills

## Goal

Produce four SKILL.md files (vault-capture, vault-search, vault-fetch, vault-consolidate) and an install script that copies them into both Claude Code and OpenCode skill directories idempotently.

## Gate

- [ ] `bun install:skills` exits 0 and copies all four SKILL.md files to `~/.claude/skills/` and `~/.config/opencode/skills/`
- [ ] Each installed SKILL.md has correct YAML frontmatter (`name`, `description`, `allowed-tools: Bash`)
- [ ] Re-running `bun install:skills` does not produce errors (idempotent)

## Dependencies

- Phase 06 (CLI package — skills invoke `vault-cli` subcommands)

## Tasks

<!-- One H3 per task. Add rows as tasks are created. -->
