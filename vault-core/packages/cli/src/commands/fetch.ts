import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";

export const registerFetch = (program: Command): void => {
  program
    .command("fetch <url>")
    .description("Fetch a URL and capture its content")
    .option("--project <projectId>", "Project scope")
    .action(async (url: string, opts: { project?: string }) => {
      const res = await fetch(url);
      const html = await res.text();
      const text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const { queue } = loadVaultCore();
      queue.capture({
        content: `URL: ${url}\n\n${text.slice(0, 4000)}`,
        sourceType: "cli",
        hints: { tier: "semantic", forceCapture: true },
        ...(opts.project ? { projectId: opts.project } : {}),
      });
      console.log("Fetched and queued.");
      await queue.flush();
      queue.destroy();
    });
};
