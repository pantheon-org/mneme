import { dirname, join } from "node:path";
import {
  AuditLog,
  CaptureQueue,
  ContextSweep,
  HarnessEmbedder,
  HybridRetriever,
  IndexDB,
  Injector,
  loadConfig,
  Scorer,
  VaultReader,
  VaultWriter,
} from "@vault-core/core";

export interface HookCore {
  queue: CaptureQueue;
  retriever: HybridRetriever;
  injector: Injector;
  reader: VaultReader;
  db: IndexDB;
}

let cached: HookCore | null = null;

export const loadHookCore = (): HookCore => {
  if (cached !== null) return cached;

  const config = loadConfig();
  const auditPath = join(dirname(config.index_path), "audit.jsonl");

  const writer = new VaultWriter(config.vault_path);
  const reader = new VaultReader();
  const db = new IndexDB(config.index_path);
  const audit = new AuditLog(auditPath);
  const sweep = new ContextSweep();
  const embedder = new HarnessEmbedder(config.inference_command);
  const scorer = new Scorer(db, embedder, config.scoring_weights);
  const queue = new CaptureQueue(sweep, embedder, scorer, writer, db, audit);
  const retriever = new HybridRetriever(db, embedder);
  const injector = new Injector();

  cached = { queue, retriever, injector, reader, db };
  return cached;
};
