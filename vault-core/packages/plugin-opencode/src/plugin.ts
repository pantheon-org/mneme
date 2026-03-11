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
  VaultWriter,
} from "@vault-core/core";

export const VaultCorePlugin: Plugin = async ({ project }) => {
  const config = loadConfig();
  const auditPath = join(homedir(), ".vault-core", "audit.jsonl");
  const writer = new VaultWriter(config.vault_path);
  const db = new IndexDB(config.index_path);
  const audit = new AuditLog(auditPath);
  const sweep = new ContextSweep();
  const embedder = new HarnessEmbedder(config.inference_command);
  const scorer = new Scorer(db, embedder, config.scoring_weights, config.capture_threshold);
  const queue = new CaptureQueue(sweep, embedder, scorer, writer, db, audit);
  const retriever = new HybridRetriever(db, embedder);
  const injector = new Injector();
  const projectId = project.worktree;

  const cleanup = (): void => {
    queue.destroy();
    db.close();
  };
  process.once("exit", cleanup);
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

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
        process.exitCode = 0;
      }
    },

    tools: [
      {
        name: "vault_recall",
        description:
          "Search persistent memory for relevant context: past decisions, constraints, patterns, and preferences. Call this at the start of any task to surface what you already know.",
        parameters: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "Natural language search query",
            },
            top_k: {
              type: "number",
              description: "Maximum number of memories to return (default 7)",
            },
          },
          required: ["query"],
        },
        execute: async ({ query, top_k }: { query: string; top_k?: number }) => {
          try {
            const results = await retriever.retrieve({
              text: query,
              topK: top_k ?? 7,
              projectId,
            });
            const block = injector.format(results, 1500);
            if (block.memoriesIncluded === 0) return "No relevant memories found.";
            return block.markdown;
          } catch {
            return "vault_recall unavailable.";
          }
        },
      },
    ],
  };
};
