export const callMistral = async (
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> => {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
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
    throw new Error(`Mistral HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const body = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = body.choices[0]?.message?.content;
  if (!content) throw new Error("Unexpected Mistral response shape");
  return content;
};
