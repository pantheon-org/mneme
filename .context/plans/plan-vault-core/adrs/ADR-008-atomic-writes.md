# ADR-008: Atomic Vault Writes via .tmp + Rename

**Status**: Accepted

## Context

Vault Markdown files may be read concurrently by the SQLite indexer, the retriever, or Obsidian itself. A partial write (e.g. due to a crash mid-write) would corrupt the file and potentially the index.

## Decision

All writes to vault Markdown files follow the pattern:
1. Write the full content to a `.tmp` sibling file
2. `rename()` the `.tmp` file over the target path

`rename()` is atomic on POSIX filesystems. A reader will always see either the old complete file or the new complete file — never a partial write.

## Consequences

- No partial or corrupt vault files visible to concurrent readers
- If the process crashes after writing `.tmp` but before rename, a stale `.tmp` file is left on disk (harmless — cleaned up on next write to the same path)
- Rename atomicity holds within a single filesystem; cross-filesystem moves are not atomic (not a concern here — `.tmp` is always on the same filesystem as the target)
