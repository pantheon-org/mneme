# ADR-005: BM25 + Vector Hybrid Retrieval via RRF

**Status**: Accepted

## Context

Pure keyword search (BM25) misses semantically similar results that use different words. Pure vector search can surface topically related but contextually irrelevant results. Neither alone is sufficient for memory retrieval.

## Decision

Combine BM25 (FTS5) and vector cosine similarity results using Reciprocal Rank Fusion (RRF) with K=60. Each method produces a ranked list; RRF merges them into a single ranked list without requiring score normalisation.

When `sqlite-vec` is unavailable, fall back to BM25-only (see ADR-004).

## Consequences

- Retrieval quality benefits from both lexical precision and semantic recall
- RRF is parameter-light (only K) and robust to score scale differences between BM25 and cosine similarity
- Adding more retrieval signals in future (e.g. recency boost) can be fused into the same RRF pipeline
- Requires two separate queries per retrieval call (one FTS, one vector)
