export const callAnthropic = async (
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
  if (!block || block.type !== "text") throw new Error("Unexpected Anthropic response shape");
  return block.text;
};
