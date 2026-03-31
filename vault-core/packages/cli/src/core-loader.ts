import { dirname, join } from "node:path";
import {
  Adjudicator,
  ApprovalInterface,
  AuditLog,
  CaptureQueue,
  ContextSweep,
  HarnessEmbedder,
  HybridRetriever,
  IndexDB,
  Injector,
  loadConfig,
  Proposer,
  reconcile,
  Scorer,
  VaultReader,
  VaultWriter,
} from "@vault-core/core";

export interface VaultCore {
  writer: VaultWriter;
  reader: VaultReader;
  db: IndexDB;
  audit: AuditLog;
  queue: CaptureQueue;
  retriever: HybridRetriever;
  injector: Injector;
  proposer: Proposer;
  approval: ApprovalInterface;
}

export const loadVaultCore = (): VaultCore => {
  const config = loadConfig();
  const vaultPath = config.vault_path;
  const indexPath = config.index_path;
  const auditPath = join(dirname(indexPath), "audit.jsonl");
  const queuePath = join(dirname(indexPath), "consolidation-queue.jsonl");

  const writer = new VaultWriter(vaultPath);
  const reader = new VaultReader();
  const db = new IndexDB(indexPath);
  const audit = new AuditLog(auditPath);
  const sweep = new ContextSweep();
  const embedder = new HarnessEmbedder(config.inference_command);
  const scorer = new Scorer(db, embedder, config.scoring_weights, config.capture_threshold);
  const queue = new CaptureQueue(sweep, embedder, scorer, writer, db, audit);
  const retriever = new HybridRetriever(db, embedder);
  const injector = new Injector();
  const adjudicator = new Adjudicator(config.inference_command, audit);
  const proposer = new Proposer(db, adjudicator, queuePath);
  const approval = new ApprovalInterface(vaultPath, writer, db, audit);

  reconcile(db, reader, vaultPath);
  return { writer, reader, db, audit, queue, retriever, injector, proposer, approval };
};
