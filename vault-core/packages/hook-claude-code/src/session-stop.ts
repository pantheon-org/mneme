#!/usr/bin/env bun
import { existsSync, readFileSync, statSync } from "node:fs";
import { loadHookCore } from "./loader.js";

const MAX_TRANSCRIPT_BYTES = 512 * 1024;

const main = async (): Promise<void> => {
  try {
    const transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
    const sessionId = process.env.CLAUDE_SESSION_ID ?? "unknown";
    const projectId = process.env.VAULT_PROJECT_ID;

    if (transcriptPath && existsSync(transcriptPath)) {
      const size = statSync(transcriptPath).size;
      if (size > MAX_TRANSCRIPT_BYTES) return;

      const transcript = readFileSync(transcriptPath, "utf-8");
      const { queue } = loadHookCore();

      queue.capture({
        content: transcript,
        sourceType: "hook",
        sourceHarness: "claude-code",
        sourceSession: sessionId,
        hints: { tier: "episodic" },
        ...(projectId ? { projectId } : {}),
      });

      await queue.flush();
      queue.destroy();
    }
  } catch {
    process.exitCode = 0;
  }
};

void main();
