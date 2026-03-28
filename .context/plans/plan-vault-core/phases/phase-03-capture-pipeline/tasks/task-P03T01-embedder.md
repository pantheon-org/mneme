# P03T01 — embedder

## Phase

03 — capture-pipeline

## Goal

Implement the `Embedder` abstraction with two concrete implementations: `HarnessEmbedder` (delegates to the installed AI harness via subprocess) and `LocalEmbedder` (uses a local transformer model). Config selects which to use with graceful fallback.

## File to create/modify

```
packages/core/src/scoring/embedder.ts
```

## Implementation

```typescript
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>
  readonly dimensions: number
}

// Delegates to the harness CLI via inference_command
export class HarnessEmbedder implements Embedder {
  readonly dimensions = 768

  constructor(private readonly inferenceCommand: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    const prompt = JSON.stringify({
      task: 'embed',
      texts,
    })
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const exec = promisify(execFile)

    const cmd = this.inferenceCommand.split(' ')
    const bin = cmd[0]!
    const args = [...cmd.slice(1), prompt]
    const { stdout } = await exec(bin, args)
    return JSON.parse(stdout) as number[][]
  }
}

// Uses @xenova/transformers locally — preferred when available
export class LocalEmbedder implements Embedder {
  readonly dimensions = 768
  private pipeline?: (texts: string[]) => Promise<{ data: Float32Array }[]>

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.pipeline) {
      const { pipeline } = await import('@xenova/transformers')
      this.pipeline = await pipeline('feature-extraction', 'nomic-embed-text-v1')
    }
    const results = await this.pipeline(texts)
    return results.map(r => Array.from(r.data))
  }
}

export function createEmbedder(config: { embeddingModel: string; inferenceCommand: string }): Embedder {
  if (config.embeddingModel === 'harness') {
    return new HarnessEmbedder(config.inferenceCommand)
  }
  try {
    return new LocalEmbedder()
  } catch {
    return new HarnessEmbedder(config.inferenceCommand)
  }
}
```

## Notes

- `@xenova/transformers` is an optional peer dependency — wrap the import in try/catch
- `HarnessEmbedder` uses the `inference_command` from config (e.g. `claude -p`) with a structured JSON prompt that the harness returns as a JSON array of float arrays
- Both embedders must return arrays of exactly `this.dimensions` floats

## Verification

```sh
bun --filter @vault-core/core run build
bun -e "
  const { HarnessEmbedder } = require('./packages/core/dist/scoring/embedder.js')
  // Mock test: verify the interface contract
  const e = new HarnessEmbedder('echo')
  console.log('HarnessEmbedder dimensions:', e.dimensions)
  console.assert(e.dimensions === 768)
  console.log('Embedder interface OK')
"
```
