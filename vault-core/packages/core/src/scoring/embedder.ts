import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EMBED_TIMEOUT_MS = 30_000;

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}

export class HarnessEmbedder implements Embedder {
  readonly dimensions = 768;

  constructor(private readonly inferenceCommand: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    const parts = this.inferenceCommand.split(/\s+/);
    const [cmd, ...args] = parts as [string, ...string[]];
    const payload = JSON.stringify({ task: "embed", texts });
    const { stdout } = await execFileAsync(cmd, [...args, payload], {
      timeout: EMBED_TIMEOUT_MS,
    });
    return JSON.parse(stdout.trim()) as number[][];
  }
}

export class LocalEmbedder implements Embedder {
  readonly dimensions = 768;
  private pipelineFn:
    | ((
        texts: string[],
        opts: Record<string, unknown>,
      ) => Promise<{ data: Float32Array; dims: number[] }>)
    | undefined;

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.pipelineFn) {
      const { pipeline } = await import("@xenova/transformers");
      this.pipelineFn = (await pipeline(
        "feature-extraction",
        "nomic-embed-text-v1",
      )) as unknown as (
        texts: string[],
        opts: Record<string, unknown>,
      ) => Promise<{ data: Float32Array; dims: number[] }>;
    }
    const fn = this.pipelineFn;
    const result = await fn(texts, {
      pooling: "mean",
      normalize: true,
    });
    const [batchSize, dim] = result.dims as [number, number];
    const embeddings: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      embeddings.push(Array.from(result.data.slice(i * dim, (i + 1) * dim)));
    }
    return embeddings;
  }
}

export interface EmbedderConfig {
  embeddingModel: string;
  inferenceCommand: string;
}

export async function createEmbedder(config: EmbedderConfig): Promise<Embedder> {
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
}
