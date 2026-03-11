#!/usr/bin/env bun
import { readFileSync, existsSync } from "node:fs"
import { loadHookCore } from "./loader.js"

async function main(): Promise<void> {
  try {
    const transcriptPath = process.env["CLAUDE_TRANSCRIPT_PATH"]
    const sessionId = process.env["CLAUDE_SESSION_ID"] ?? "unknown"
    const projectId = process.env["VAULT_PROJECT_ID"]

    if (transcriptPath && existsSync(transcriptPath)) {
      const transcript = readFileSync(transcriptPath, "utf-8")
      const { queue } = loadHookCore()

      queue.capture({
        content: transcript,
        sourceType: "hook",
        sourceHarness: "claude-code",
        sourceSession: sessionId,
        hints: { tier: "episodic" },
        ...(projectId ? { projectId } : {}),
      })

      await new Promise((r) => setTimeout(r, 2000))
      queue.destroy()
    }
  } catch {
    // never fail the harness
  }
}

void main()
