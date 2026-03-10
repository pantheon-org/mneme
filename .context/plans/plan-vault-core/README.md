# Implementation Plan — vault-core

## Goal

A locally-installable TypeScript monorepo that provides psychology-grounded, Obsidian-backed persistent memory for AI coding agents (Claude Code, OpenCode, and future harnesses). No copy-pasting — everything installs, links, and runs from source via standard tooling.

## Phases

| # | Phase | Status | Tasks |
|---|---|---|---|
| 00 | [monorepo-bootstrap](phases/phase-00-monorepo-bootstrap/README.md) | complete | 3 |
| 01 | [types-package](phases/phase-01-types-package/README.md) | complete | 2 |
| 02 | [storage-layer](phases/phase-02-storage-layer/README.md) | complete | 4 |
| 03 | [capture-pipeline](phases/phase-03-capture-pipeline/README.md) | complete | 4 |
| 04 | [retrieval](phases/phase-04-retrieval/README.md) | pending | 2 |
| 05 | [consolidation-loop](phases/phase-05-consolidation-loop/README.md) | pending | 3 |
| 06 | [cli-package](phases/phase-06-cli-package/README.md) | pending | 3 |
| 07 | [hook-packages](phases/phase-07-hook-packages/README.md) | pending | 3 |
| 08 | [skills](phases/phase-08-skills/README.md) | pending | 2 |
| 09 | [integration-testing](phases/phase-09-integration-testing/README.md) | pending | 7 |

## Constraints

- No npm publishing — all packages linked via Bun workspace protocol (`"workspaces"` in root `package.json`)
- No copy-pasting — hooks and skills install via scripts, never manual file copies
- Vault (Obsidian markdown) is the source of truth; SQLite index is derived and rebuildable
- Async capture only — hooks must return in < 5ms
- Human edits in Obsidian are ground truth — immune to automated reconsolidation
- Semantic and procedural memories never decay; only episodic memories are subject to decay (deferred)

## References

- [Original monolith plan](../project-plan.md)
- [Obsidian vault](https://obsidian.md)
