declare module "@xenova/transformers" {
  export function pipeline(
    task: string,
    model: string,
  ): Promise<(inputs: string[], options: Record<string, unknown>) => Promise<{ data: number[][] }>>
}
