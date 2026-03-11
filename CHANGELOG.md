# Changelog

All notable changes to vault-core will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Initial implementation of all 10 phases of vault-core
- `@vault-core/types` — shared TypeScript interfaces (`Memory`, `ImportanceScore`, `RetrievalQuery`, `VaultCoreConfig`, etc.)
- `@vault-core/core` — main library with four subsystems:
  - Capture pipeline: `ContextSweep`, `CaptureQueue` with `pending.jsonl` durability
  - Storage layer: `VaultWriter` (atomic Markdown writes), `VaultReader` (human-edit detection), `IndexDB` (SQLite FTS5 + sqlite-vec), `AuditLog`
  - Retrieval pipeline: `HybridRetriever` (BM25 + vector RRF), `Injector` (token-budgeted context formatting)
  - Consolidation pipeline: `Proposer` (episodic clustering), `Adjudicator` (LLM conflict resolution), `ApprovalInterface` (human approval via vault inbox)
- `@vault-core/cli` — `vault-cli` binary with commands: `capture`, `search`, `fetch`, `recent`, `consolidate`, `index`, `status`
- `@vault-core/hook-claude-code` — Claude Code hooks: `SessionStart`, `PostToolUse`, `Stop`
- `@vault-core/plugin-opencode` — OpenCode plugin for `tool.execute.after` and `experimental.chat.system.transform` hooks
- 7 integration test suites covering the full pipeline
- 4 harness-agnostic SKILL.md files: `vault-capture`, `vault-search`, `vault-fetch`, `vault-consolidate`
- Install scripts for hooks, skills, and CLI global link
- TOML-based configuration with sensible defaults
- Dual-embedder support: `HarnessEmbedder` (subprocess) and `LocalEmbedder` (`@xenova/transformers`)
- Human-edit immunity — memories edited in Obsidian are never overwritten by automation
- Optional sqlite-vec extension with graceful BM25-only fallback
- 7-factor importance scoring: recency, frequency, importance, utility, novelty, confidence, interference
- Three-tier memory model: episodic (decay allowed), semantic (binary existence), procedural (permanent until revoked)
