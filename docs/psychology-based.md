# Psychology Based

## 1. The Flaw of "Time-Based" Decay in Technical Contexts

Human memory decays because biological storage is optimized for recent survival. In coding, truth does not decay strictly based on time.

The Problem: Using the Ebbinghaus forgetting curve means that if a user establishes a critical project constraint ("We use strict TypeScript null checks") and doesn't mention it for a week, the system will slowly decay its strength using S(t)=S0​e−λt until it is forgotten.
The Reality: Architectural decisions are binary and permanent until explicitly revoked.
The Fix: You need to decouple Episodic Memory (e.g., "Yesterday we struggled with the auth token") from Semantic Memory (e.g., "This project uses JWTs"). Episodic memory can decay exponentially. Semantic memory should only decay through explicit interference or reconsolidation (when the user says, "Actually, we are switching to session cookies").

## 2. Jaccard Similarity is Inadequate for Semantic Meaning

Your proposed implementation for Novelty and Interference relies heavily on Jaccard Similarity (bag-of-words overlap).

The Problem: Jaccard similarity is notoriously brittle for human language. "The database is broken" and "Postgres keeps crashing" have a Jaccard index of 0.0, yet they describe the exact same problem. Conversely, "I love writing Python" and "I hate writing Python" have a high Jaccard index but opposite meanings.
The Fix: Replace Jaccard indexing with dense vector embeddings (like text-embedding-3-small or an open-source model like BGE). You can compute the Cosine Similarity between the embedding vectors to catch semantic overlaps, which will drastically improve your novelty, deduplication, and interference calculations.

## 3. The Retrieval Gap (How do memories get back in?)

Your document comprehensively covers the encoding and storage of memories (Stage 1 and Stage 2), but it glosses over retrieval.

The Problem: If PsychMem accumulates hundreds of LTMs (Long-Term Memories), you cannot simply inject all "User-Level" or "Project-Level" memories into the system prompt. This will bloat the context window, increase latency, and cause the LLM to hallucinate or focus on irrelevant past constraints.
The Fix: You need a Stage 3: Contextual Retrieval. Instead of auto-injecting everything, the agent should take the user's current prompt, embed it, and perform a nearest-neighbor vector search against the LTM database. Only the top k most relevant memories should be injected into the working context.

## 4. Latency and The Cost of Per-Message Extraction

Extracting memory candidates after every message (v1.9) introduces a significant architectural bottleneck.

The Problem: If you rely on an LLM to perform the "Feature Scoring" and "Candidate Extraction," your system will double its latency and API costs. If you rely on the regex pre-filter (/remember|important|always.../), you will miss implicit importance, rendering the psychology-grounded aspect moot. Many vital architectural decisions are stated plainly without exclamation marks or keywords (e.g., "The API rate limit is 50 req/sec").
The Fix: Run the Context Sweep asynchronously as a background daemon. Let the agent respond to the user immediately, while a separate, smaller background model processes the conversation stream, scores it, and updates the database without blocking the primary conversation loop.

## 5. False Interference and Destructive Updates

Your interference detection triggers when similarity is between 0.3 and 0.8.

The Problem: Automatically penalizing or overwriting memories based on partial similarity can be destructive. If memory A is "User prefers modular functions" and memory B is "User prefers pure functions," these are complementary, not conflicting. Deduplicating or penalizing them will cause the AI to lose nuance.
The Fix: When high semantic interference is detected, do not automatically adjust confidence. Instead, trigger a "Reconsolidation LLM call" that specifically asks a small, fast model to evaluate the two statements: "Do these two facts contradict, complement, or duplicate each other?"
Would you like me to draft an updated mathematical model for the "Strength Calculation" that factors in cosine similarity and vector embeddings instead of the Jaccard index?