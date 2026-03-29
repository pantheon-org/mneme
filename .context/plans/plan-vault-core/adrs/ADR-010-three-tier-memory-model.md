# ADR-010: Three-Tier Memory Model (Episodic / Semantic / Procedural)

**Status**: Accepted

## Context

Not all memories are equal. Session events, distilled facts, and how-to processes have different lifespans, update patterns, and retrieval semantics. Treating them uniformly would either over-retain ephemeral events or under-retain durable knowledge.

## Decision

Memories are classified into three tiers stored in separate vault directories:

| Tier | Directory | Nature |
|------|-----------|--------|
| Episodic | `01-episodic/` | Time-bound session events; decay is allowed |
| Semantic | `02-semantic/` | Distilled facts and rules; only changed via explicit reconsolidation |
| Procedural | `03-procedural/` | How-to processes; permanent until explicitly revoked |

Tier assignment is determined during capture based on signal type detected by the sweep rules.

## Consequences

- Retrieval can filter or weight by tier depending on context
- Consolidation (T05) promotes episodic clusters into semantic memories
- Semantic and procedural memories require explicit human or LLM action to modify — they are not automatically decayed (see ADR-011)
- Tier misclassification at capture time is hard to correct without human intervention
