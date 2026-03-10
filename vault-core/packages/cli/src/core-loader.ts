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
  Adjudicator,
  Proposer,
  ApprovalInterface,
} from "@vault-core/core"
import { join } from "node:path"
import { homedir } from "node:os"

export interface VaultCore {
  writer: VaultWriter
  reader: VaultReader
  db: IndexDB
  audit: AuditLog
  queue: CaptureQueue
  retriever: HybridRetriever
  injector: Injector
  proposer: Proposer
  approval: ApprovalInterface
}

export function loadVaultCore(): VaultCore {
  const config = loadConfig()
  const vaultPath = config.vault_path
  const indexPath = config.index_path
  const auditPath = join(homedir(), ".vault-core", "audit.jsonl")

  const writer = new VaultWriter(vaultPath)
  const reader = new VaultReader()
  const db = new IndexDB(indexPath)
  const audit = new AuditLog(auditPath)
  const sweep = new ContextSweep()
  const embedder = new HarnessEmbedder(config.inference_command)
  const scorer = new Scorer(db, embedder, config.scoring_weights, config.capture_threshold)
  const queue = new CaptureQueue(sweep, embedder, scorer, writer, db, audit)
  const retriever = new HybridRetriever(db, embedder, reader)
  const injector = new Injector()
  const adjudicator = new Adjudicator(config.inference_command, audit)
  const proposer = new Proposer(db, adjudicator)
  const approval = new ApprovalInterface(vaultPath, writer, db, audit)

  return { writer, reader, db, audit, queue, retriever, injector, proposer, approval }
}
