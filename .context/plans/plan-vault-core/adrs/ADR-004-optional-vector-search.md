# ADR-004: Optional sqlite-vec with Graceful Degradation

**Status**: Accepted

## Context

Vector similarity search improves retrieval quality but `sqlite-vec` is a native extension that may not be available on all systems or Bun versions. Failing hard when the extension is absent would block the entire system.

## Decision

`sqlite-vec` is loaded at startup with a try-catch. If loading fails, the system logs a warning and falls back to BM25-only retrieval. Vector columns in the schema are created only when the extension is available.

BDD test T04 (`conflict-detection.feature`) validates this degradation path.

## Consequences

- System works on any machine, with or without `sqlite-vec`
- Retrieval quality degrades gracefully (BM25 only) rather than failing entirely
- Code must check for vector availability before executing vector queries
- Embeddings are still computed and stored in Markdown front-matter even without `sqlite-vec`, so the index can be enriched if the extension becomes available later
