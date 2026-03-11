# Configuration

vault-core is configured via `~/.vault-core/config.toml`. The file is created with defaults on first run.

## Example config

```toml
vault_path = "~/vault-core"
index_path = "~/.vault-core/index.db"
harness = "opencode"
inference_command = "opencode"
embedding_model = "text-embedding-3-small"
capture_threshold = 0.6
top_k_retrieval = 10

[scoring_weights]
recency      = 0.25
frequency    = 0.15
importance   = 0.20
utility      = 0.20
novelty      = 0.10
confidence   = 0.05
interference = 0.05

[vault_structure]
inbox      = "00-inbox"
episodic   = "01-episodic"
semantic   = "02-semantic"
procedural = "03-procedural"
archive    = "archive"
```

## Top-level keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `vault_path` | string | `~/vault-core` | Path to the Obsidian vault directory where memory Markdown files are stored |
| `index_path` | string | `~/.vault-core/index.db` | Path to the SQLite index database |
| `harness` | string | `opencode` | Active AI coding harness (`opencode` or `claude-code`) |
| `inference_command` | string | `opencode` | CLI command invoked for LLM inference (embeddings and consolidation adjudication) |
| `embedding_model` | string | `text-embedding-3-small` | Embedding model identifier passed to the harness |
| `capture_threshold` | float | `0.6` | Minimum composite importance score (0–1) required to persist a memory |
| `top_k_retrieval` | int | `10` | Default number of memories returned by retrieval |

## `[scoring_weights]`

Controls the relative weight of each factor in the 7-factor importance score. All weights must sum to 1.0.

| Key | Default | Description |
|-----|---------|-------------|
| `recency` | `0.25` | Time since capture — exponential decay with 7-day half-life |
| `importance` | `0.20` | Signal importance with 0.8^i diminishing returns |
| `utility` | `0.20` | Composite of importance × confidence |
| `frequency` | `0.15` | Number of times this memory has been accessed |
| `novelty` | `0.10` | 1 − max cosine similarity against top-50 nearest neighbours |
| `confidence` | `0.05` | Mean confidence of detection signals |
| `interference` | `0.05` | Penalty applied when novelty < 0.3 (near-duplicate detected) |

## `[vault_structure]`

Controls subdirectory names within `vault_path`.

| Key | Default | Description |
|-----|---------|-------------|
| `inbox` | `00-inbox` | Consolidation approval inbox directory |
| `episodic` | `01-episodic` | Episodic tier directory |
| `semantic` | `02-semantic` | Semantic tier directory |
| `procedural` | `03-procedural` | Procedural tier directory |
| `archive` | `archive` | Archived memories directory |

## Runtime file paths

The following paths are used at runtime and are not configurable:

| Path | Purpose |
|------|---------|
| `~/.vault-core/config.toml` | Configuration file |
| `~/.vault-core/index.db` | SQLite index database |
| `~/.vault-core/audit.jsonl` | Append-only audit log (one JSON entry per line) |
| `~/.vault-core/pending.jsonl` | Capture queue durability buffer — replayed on startup |
| `~/.vault-core/consolidation-queue.jsonl` | Consolidation proposals buffer |

## Hook environment variables

These environment variables are read by Claude Code hook scripts at runtime. They are set by Claude Code, not configured in `config.toml`.

| Variable | Set by | Description |
|----------|--------|-------------|
| `CLAUDE_SESSION_ID` | Claude Code | Session identifier injected into captured memories |
| `CLAUDE_TRANSCRIPT_PATH` | Claude Code | Path to transcript file, available on `Stop` hook |
| `VAULT_PROJECT_ID` | User / harness | Optional project scope identifier for scoped retrieval |

## Changing capture sensitivity

To capture more aggressively, lower `capture_threshold`:

```toml
capture_threshold = 0.45
```

To capture only high-confidence signals, raise it:

```toml
capture_threshold = 0.75
```

## Changing retrieval depth

To inject more memories (at the cost of context space), increase `top_k_retrieval`:

```toml
top_k_retrieval = 20
```

## Tuning scoring weights

To prioritise freshness over novelty (useful for fast-moving projects):

```toml
[scoring_weights]
recency      = 0.35
frequency    = 0.15
importance   = 0.20
utility      = 0.15
novelty      = 0.05
confidence   = 0.05
interference = 0.05
```

Weights must always sum to 1.0.
