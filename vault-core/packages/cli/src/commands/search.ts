import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";
import { formatSearchResults } from "../format.js";

export const registerSearch = (program: Command): void => {
  program
    .command("search <query>")
    .description("Search memories")
    .option("-k, --top-k <n>", "Number of results", "7")
    .option("--project <projectId>", "Project scope")
    .action(async (query: string, opts: { topK: string; project?: string }) => {
      const { retriever } = loadVaultCore();
      const results = await retriever.retrieve({
        text: query,
        topK: parseInt(opts.topK, 10),
        ...(opts.project ? { projectId: opts.project } : {}),
      });
      if (results.length === 0) {
        console.log("No results.");
        return;
      }
      console.log(formatSearchResults(results));
    });
};
