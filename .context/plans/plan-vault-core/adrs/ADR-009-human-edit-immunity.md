# ADR-009: Human-Edit Immunity via human_edited_at Flag

**Status**: Accepted

## Context

Users may edit memory Markdown files directly in Obsidian. Automated reconsolidation must not overwrite these edits — doing so would destroy user intent and erode trust in the system.

## Decision

When a vault file's `mtime` is newer than the index's `updated_at` for that memory, the file is considered human-edited. The `human_edited_at` field is written to the front-matter.

Any memory with `human_edited_at` set is immune to automated reconsolidation. The consolidation pipeline skips these memories entirely.

BDD test T03 (`human-edit-immunity.feature`) validates this behaviour.

## Consequences

- User edits in Obsidian are permanently respected
- Automated pipelines cannot silently overwrite human knowledge
- Memories that are always human-edited will never be reconsolidated — users must manually clear `human_edited_at` if they want automation to resume
- `mtime`-based detection can produce false positives if filesystem timestamps are unreliable (e.g. sync tools that reset mtime)
