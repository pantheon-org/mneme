export const callGemini = (model: string, prompt: string): string => {
  const result = Bun.spawnSync(["gemini", "--model", model, "-p", prompt], {
    env: { ...process.env },
  });
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().slice(0, 200);
    throw new Error(`Gemini CLI exit ${result.exitCode}: ${stderr}`);
  }
  return result.stdout.toString();
};
