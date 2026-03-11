#!/usr/bin/env bun
import { loadHookCore } from "./loader.js"

async function main(): Promise<void> {
  try {
    const { retriever, injector } = loadHookCore()
    const sessionId = process.env["CLAUDE_SESSION_ID"] ?? "unknown"
    const projectId = process.env["VAULT_PROJECT_ID"]

    const results = await retriever.retrieve({
      text: "recent context decisions constraints patterns",
      topK: 7,
      ...(projectId ? { projectId } : {}),
    })

    const block = injector.format(results, 1500)
    if (block.memoriesIncluded > 0) {
      process.stdout.write(block.markdown)
    }
  } catch {
    // never fail the harness
  }
}

void main()
