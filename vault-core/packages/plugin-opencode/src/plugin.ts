import { homedir } from "node:os";
import { join } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";
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

export const VaultCorePlugin: Plugin = async ({ project }) => {
  const config = loadConfig();
  const auditPath = join(homedir(), ".vault-core", "audit.jsonl");
  const writer = new VaultWriter(config.vault_path);
  const reader = new VaultReader();
  const db = new IndexDB(config.index_path);
  const audit = new AuditLog(auditPath);
  const sweep = new ContextSweep();
  const embedder = new HarnessEmbedder(config.inference_command);
  const scorer = new Scorer(db, embedder, config.scoring_weights, config.capture_threshold);
  const queue = new CaptureQueue(sweep, embedder, scorer, writer, db, audit);
  const retriever = new HybridRetriever(db, embedder, reader);
  const injector = new Injector();
  const projectId = project.worktree;

  return {
    "tool.execute.after": async ({ sessionID, args, tool: toolName }) => {
      try {
        const content =
          typeof args === "object" && args !== null ? JSON.stringify(args) : String(args);
        queue.capture({
          content: `[${toolName}] ${content}`,
          sourceType: "hook",
          sourceHarness: "opencode",
          sourceSession: sessionID,
          projectId,
        });
      } catch {
        // never fail the harness
      }
    },

    "experimental.chat.system.transform": async (_input, output) => {
      try {
        const results = await retriever.retrieve({
          text: "recent context decisions constraints patterns",
          topK: 7,
          projectId,
        });
        const block = injector.format(results, 1500);
        if (block.memoriesIncluded > 0) {
          output.system.push(block.markdown);
        }
      } catch {
        // never fail the harness
      }
    },
  };
};
