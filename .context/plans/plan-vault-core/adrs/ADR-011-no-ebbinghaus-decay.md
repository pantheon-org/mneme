# ADR-011: No Ebbinghaus-Style Decay for Semantic and Procedural Memories

**Status**: Accepted

## Context

Ebbinghaus forgetting curves model how human memory fades without reinforcement. Applying this model to AI coding agent memory would cause hard-won semantic knowledge (project conventions, facts) and procedural knowledge (how-to guides) to degrade silently over time — even if still accurate and relevant.

## Decision

Ebbinghaus-style time decay is **not applied** to semantic or procedural memories. Only episodic memories are subject to decay (natural attrition of session events).

Semantic and procedural memories are only modified via:
- Explicit reconsolidation triggered by the LLM adjudicator
- Direct human edit in Obsidian

## Consequences

- Semantic and procedural memories remain stable and reliable indefinitely
- The index will grow over time without automatic pruning of old semantic/procedural entries
- Stale semantic facts must be detected and resolved via the consolidation pipeline, not by time-based expiry
- `ImportanceScore` still incorporates recency as one of seven factors for ranking — this is retrieval weighting, not deletion
