import { appendFileSync } from "node:fs";

const env = process.env;

const appendOutput = (key: string, value: string): void => {
  const delim = "OUTPUT_EOF";
  appendFileSync(env.GITHUB_OUTPUT!, `${key}<<${delim}\n${value}\n${delim}\n`);
};

const callCerebras = async (
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> => {
  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cerebras HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const body = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = body.choices[0]?.message?.content;
  if (!content) throw new Error("Unexpected Cerebras response shape");
  return content;
};

const callMistral = async (
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> => {
  const response = await fetch(
    "https://api.mistral.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0,
      }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const body = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = body.choices[0]?.message?.content;
  if (!content) throw new Error("Unexpected Mistral response shape");
  return content;
};

const callAnthropic = async (
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const body = (await response.json()) as {
    content: { type: string; text: string }[];
  };
  const block = body.content[0];
  if (!block || block.type !== "text")
    throw new Error("Unexpected Anthropic response shape");
  return block.text;
};

const callGemini = (model: string, prompt: string): string => {
  const result = Bun.spawnSync(["gemini", "--model", model, "-p", prompt], {
    env: { ...env },
  });
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().slice(0, 200);
    throw new Error(`Gemini CLI exit ${result.exitCode}: ${stderr}`);
  }
  return result.stdout.toString();
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
      const summary = callGemini(
        env.GEMINI_MODEL ?? "gemini-2.5-pro",
        prompt,
      );
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
      summary = await callCerebras(
        apiKey,
        env.CEREBRAS_MODEL ?? "gpt-oss-120b",
        prompt,
        maxTokens,
      );
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
