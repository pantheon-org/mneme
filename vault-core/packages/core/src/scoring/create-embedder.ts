import type { Embedder } from "./embedder.js";
import { HarnessEmbedder, LocalEmbedder } from "./embedder.js";

export interface EmbedderConfig {
  embeddingModel: string;
  inferenceCommand: string;
}

export const createEmbedder = async (config: EmbedderConfig): Promise<Embedder> => {
  if (config.embeddingModel === "harness") {
    return new HarnessEmbedder(config.inferenceCommand);
  }
  try {
    const embedder = new LocalEmbedder();
    await embedder.embed(["warmup"]);
    return embedder;
  } catch {
    return new HarnessEmbedder(config.inferenceCommand);
  }
};
