import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";

export const registerRecent = (program: Command): void => {
  program
    .command("recent")
    .description("Show recent episodic memories")
    .option("-n, --limit <n>", "Number to show", "10")
    .option("--project <projectId>", "Project scope")
    .action((opts: { limit: string; project?: string }) => {
      const { db } = loadVaultCore();
      const mems = db.getByTier("episodic", opts.project).slice(0, parseInt(opts.limit, 10));
      if (mems.length === 0) {
        console.log("No recent episodic memories.");
        return;
      }
      for (const m of mems) console.log(`[${m.capturedAt.slice(0, 10)}] ${m.summary}`);
    });
};
