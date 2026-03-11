#!/usr/bin/env bun
import { loadHookCore } from "./loader.js"

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString("utf-8")
}

async function main(): Promise<void> {
  try {
    const raw = await readStdin()
    if (!raw.trim()) return

    const event: Record<string, unknown> = JSON.parse(raw)
    const sessionId = process.env["CLAUDE_SESSION_ID"] ?? "unknown"
    const projectId = process.env["VAULT_PROJECT_ID"]

    const content = JSON.stringify(event)
    const { queue } = loadHookCore()

    queue.capture({
      content,
      sourceType: "hook",
      sourceHarness: "claude-code",
      sourceSession: sessionId,
      ...(projectId ? { projectId } : {}),
    })
  } catch {
    // never fail the harness
  }
}

void main()
