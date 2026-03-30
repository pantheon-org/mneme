export const callGemini = async (
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0 },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const body = (await response.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const text = body.candidates[0]?.content?.parts[0]?.text;
  if (!text) throw new Error("Unexpected Gemini response shape");
  return text;
};
