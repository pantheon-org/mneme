import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { VaultCoreConfig } from "@vault-core/types";
import { parse, stringify } from "smol-toml";

const CONFIG_DIR = join(homedir(), ".vault-core");
const CONFIG_PATH = join(CONFIG_DIR, "config.toml");

const DEFAULT_CONFIG: VaultCoreConfig = {
  vault_path: join(homedir(), "vault-core"),
  index_path: join(homedir(), ".vault-core", "index.db"),
  harness: "opencode",
  inference_command: "opencode",
  embedding_model: "text-embedding-3-small",
  capture_threshold: 0.6,
  top_k_retrieval: 10,
  scoring_weights: {
    recency: 0.25,
    frequency: 0.15,
    importance: 0.2,
    utility: 0.2,
    novelty: 0.1,
    confidence: 0.05,
    interference: 0.05,
  },
  vault_structure: {
    inbox: "inbox",
    episodic: "episodic",
    semantic: "semantic",
    procedural: "procedural",
    archive: "archive",
  },
};

export function loadConfig(): VaultCoreConfig {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(
      CONFIG_PATH,
      stringify(DEFAULT_CONFIG as unknown as Record<string, unknown>),
      "utf-8",
    );
    return DEFAULT_CONFIG;
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const parsed = parse(raw) as Partial<VaultCoreConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    scoring_weights: {
      ...DEFAULT_CONFIG.scoring_weights,
      ...(parsed.scoring_weights ?? {}),
    },
    vault_structure: {
      ...DEFAULT_CONFIG.vault_structure,
      ...(parsed.vault_structure ?? {}),
    },
  };
}
