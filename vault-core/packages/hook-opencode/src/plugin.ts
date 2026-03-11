import type { Plugin } from "@opencode-ai/plugin"
import {
  loadConfig,
  VaultWriter,
  VaultReader,
  IndexDB,
  AuditLog,
  ContextSweep,
  HarnessEmbedder,
  Scorer,
  CaptureQueue,
  HybridRetriever,
  Injector,
} from "@vault-core/core"
import { join } from "node:path"
import { homedir } from "node:os"

const plugin: Plugin = async (_input) => {
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

  return {
    event: async ({ event }) => {
      try {
        if (event.type === "session.idle") {
          // event.sessionID not typed on EventSessionIdle; cast through unknown
          const e = event as unknown as { sessionID?: string; content?: string }
          if (!e.content) return

          queue.capture({
            content: e.content,
            sourceType: "hook",
            sourceHarness: "opencode",
            ...(e.sessionID ? { sourceSession: e.sessionID } : {}),
          })
        }

        if ((event.type as string) === "session.start") {
          const e = event as unknown as { sessionID?: string; projectId?: string }
          const results = await retriever.retrieve({
            text: "recent context decisions constraints patterns",
            topK: 7,
            ...(e.projectId ? { projectId: e.projectId } : {}),
          })
          const block = injector.format(results, 1500)
          if (block.memoriesIncluded > 0) {
            process.stdout.write(block.markdown)
          }
        }
      } catch {
        // never fail the harness
      }
    },
  }
}

export default plugin
