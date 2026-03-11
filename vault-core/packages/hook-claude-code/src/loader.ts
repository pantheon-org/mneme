import {
  loadConfig,
  VaultWriter,
  VaultReader,
  IndexDB,
  AuditLog,
  ContextSweep,
  HarnessEmbedder,
  Scorer,
  DEFAULT_WEIGHTS,
  CaptureQueue,
  HybridRetriever,
  Injector,
} from "@vault-core/core"
import { join } from "node:path"
import { homedir } from "node:os"

export interface HookCore {
  queue: CaptureQueue
  retriever: HybridRetriever
  injector: Injector
  reader: VaultReader
}

export function loadHookCore(): HookCore {
  const config = loadConfig()
  const auditPath = join(homedir(), ".vault-core", "audit.jsonl")
  const writer = new VaultWriter(config.vault_path)
  const reader = new VaultReader()
  const db = new IndexDB(config.index_path)
  const audit = new AuditLog(auditPath)
  const sweep = new ContextSweep()
  const embedder = new HarnessEmbedder(config.inference_command)
  const scorer = new Scorer(db, embedder, config.scoring_weights, config.capture_threshold)
  const queue = new CaptureQueue(sweep, embedder, scorer, writer, db, audit)
  const retriever = new HybridRetriever(db, embedder, reader)
  const injector = new Injector()
  return { queue, retriever, injector, reader }
}
