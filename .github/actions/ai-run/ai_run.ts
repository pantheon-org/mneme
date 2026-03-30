import { appendFileSync } from "node:fs";
import { callAnthropic } from "./providers/anthropic";
import { callCerebras } from "./providers/cerebras";
import { callGemini } from "./providers/gemini";
import { callMistral } from "./providers/mistral";

const env = process.env;

const appendOutput = (key: string, value: string): void => {
  const delim = "OUTPUT_EOF";
  appendFileSync(env.GITHUB_OUTPUT!, `${key}<<${delim}\n${value}\n${delim}\n`);
};

const providers = (env.AI_PROVIDER_ORDER ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const prompt = env.PROMPT ?? "";
const maxTokens = parseInt(env.MAX_TOKENS ?? "4096", 10);

for (const provider of providers) {
  if (provider === "gemini") {
    const key = env.GEMINI_API_KEY ?? "";
    if (!key) {
      console.log("[ai-run] skipping gemini: no API key");
      continue;
    }
    try {
      const summary = await callGemini(key, env.GEMINI_MODEL ?? "gemini-2.5-pro", prompt, maxTokens);
      appendOutput("summary", summary);
      appendOutput("backend_used", "gemini");
      process.exit(0);
    } catch (err) {
      console.warn(`[ai-run] gemini failed: ${err}`);
    }
    continue;
  }

  const apiKey = env[`${provider.toUpperCase()}_API_KEY`] ?? "";
  if (!apiKey) {
    console.log(`[ai-run] skipping ${provider}: no API key`);
    continue;
  }

  try {
    let summary: string;
    if (provider === "cerebras") {
      summary = await callCerebras(apiKey, env.CEREBRAS_MODEL ?? "gpt-oss-120b", prompt, maxTokens);
    } else if (provider === "mistral") {
      summary = await callMistral(
        apiKey,
        env.MISTRAL_MODEL ?? "mistral-large-latest",
        prompt,
        maxTokens,
      );
    } else if (provider === "anthropic") {
      summary = await callAnthropic(
        apiKey,
        env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        prompt,
        maxTokens,
      );
    } else {
      console.log(`[ai-run] skipping unknown provider: ${provider}`);
      continue;
    }
    appendOutput("summary", summary);
    appendOutput("backend_used", provider);
    process.exit(0);
  } catch (err) {
    console.warn(`[ai-run] ${provider} failed: ${err}`);
  }
}

console.error("[ai-run] all providers exhausted");
process.exit(1);
