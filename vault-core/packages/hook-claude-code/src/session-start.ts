#!/usr/bin/env bun
import { loadHookCore } from "./loader.js";

const main = async (): Promise<void> => {
  try {
    const projectId = process.env.VAULT_PROJECT_ID;
    const initialPrompt = process.env.CLAUDE_INITIAL_PROMPT ?? "";

    if (!initialPrompt.trim()) return;

    const { retriever, injector } = loadHookCore();

    const query: Parameters<typeof retriever.retrieve>[0] = { text: initialPrompt };
    if (projectId) query.projectId = projectId;
    const memories = await retriever.retrieve(query);

    if (memories.length === 0) return;

    const block = injector.format(memories);
    if (!block.markdown.trim()) return;

    process.stdout.write(`${JSON.stringify({ type: "inject", content: block.markdown })}\n`);
  } catch {
    process.exitCode = 0;
  }
};

void main();
