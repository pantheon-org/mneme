# Psychology-Based Design Rationale

vault-core's memory model is grounded in cognitive psychology. This document explains the key design decisions and why naive approaches were rejected.

## 1. No time-based decay for semantic memory

Human memory decays because biological storage is optimised for recent survival. In software development, truth does not decay based on time.

A critical project constraint such as "We use strict TypeScript null checks" does not become less true after a week of inactivity. Applying Ebbinghaus forgetting curve decay (`S(t) = S₀e^(−λt)`) to such a constraint would cause it to erode and eventually be discarded — silently breaking the agent's understanding of the project.

The solution is to decouple memory tiers:

- **Episodic** memories (e.g., "Yesterday we struggled with the auth token") represent time-bound events and may decay.
- **Semantic** memories (e.g., "This project uses JWTs") represent distilled facts and change only through explicit reconsolidation.
- **Procedural** memories represent permanent how-to knowledge, revoked only explicitly.

Ebbinghaus decay is applied only to the episodic tier.

## 2. Dense vector embeddings instead of Jaccard similarity

Novelty and interference detection based on bag-of-words overlap (Jaccard similarity) is inadequate for natural language.

"The database is broken" and "Postgres keeps crashing" have a Jaccard index of 0.0, yet describe the same problem. Conversely, "I love writing Python" and "I hate writing Python" have high Jaccard overlap but opposite meanings.

vault-core computes cosine similarity between dense vector embeddings (via `text-embedding-3-small` or a configured local model). This catches semantic overlap that surface-level token matching misses, and correctly differentiates statements with similar tokens but opposite meaning.

## 3. Contextual retrieval instead of full injection

Accumulating hundreds of memories and injecting all of them into the context window bloats the prompt, increases latency, and causes the model to fixate on irrelevant past constraints.

vault-core implements a hybrid BM25 + vector retrieval pipeline. At session start, the current context is embedded and compared against all stored memories. Only the top-k most relevant memories (configurable via `top_k_retrieval`) are injected. This keeps the injected context focused and within budget.

## 4. Asynchronous capture to avoid latency

Extracting memory candidates after every tool call via a blocking LLM call would double agent latency and API costs. A lightweight regex pre-filter would miss implicit importance — many critical architectural decisions are stated plainly without trigger keywords (e.g., "The API rate limit is 50 req/sec").

vault-core runs the Context Sweep asynchronously. The agent responds to the user immediately. A background queue processes the tool event stream, applies rule-based signal detection, embeds, scores, and indexes without blocking the primary conversation loop. The `CaptureQueue.capture()` call returns in under 5 ms.

## 5. Reconsolidation instead of automatic overwrite

Automatic penalisation or overwriting of memories based on partial similarity is destructive. "User prefers modular functions" and "User prefers pure functions" are complementary, not conflicting. Deduplicating them discards nuance.

When high semantic interference is detected (novelty < 0.3), vault-core does not automatically overwrite. Instead, it routes the candidate pair to the `Adjudicator`, which invokes a fast LLM call specifically to evaluate whether the two statements contradict, complement, or duplicate each other. Conflicts are surfaced in the human-review inbox rather than resolved silently.
