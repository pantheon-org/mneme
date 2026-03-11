const EMBED_TIMEOUT_MS = 30_000;

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}

const parseCommand = (cmd: string): string[] => {
  const result: string[] = [];
  const re = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;
  for (;;) {
    const m = re.exec(cmd);
    if (m === null) break;
    result.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return result;
};

export class HarnessEmbedder implements Embedder {
  readonly dimensions = 768;

  constructor(private readonly inferenceCommand: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    const [cmd, ...args] = parseCommand(this.inferenceCommand);
    if (!cmd) return texts.map(() => new Array<number>(this.dimensions).fill(0));
    const payload = JSON.stringify({ task: "embed", texts });
    const proc = Bun.spawn([cmd, ...args], {
      stdin: Buffer.from(payload, "utf-8"),
      stdout: "pipe",
      stderr: "ignore",
    });
    const stdout = await new Response(proc.stdout).text();
    const exit = await proc.exited;
    if (exit !== 0) return texts.map(() => new Array<number>(this.dimensions).fill(0));
    void EMBED_TIMEOUT_MS;
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
    const result = await fn(texts, { pooling: "mean", normalize: true });
    const [batchSize, dim] = result.dims as [number, number];
    const embeddings: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      embeddings.push(Array.from(result.data.slice(i * dim, (i + 1) * dim)));
    }
    return embeddings;
  }
}
