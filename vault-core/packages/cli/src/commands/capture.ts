import { readFileSync } from "node:fs";
import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";

export const registerCapture = (program: Command): void => {
  program
    .command("capture")
    .description("Capture a memory from text or stdin")
    .option("-t, --text <text>", "Text to capture")
    .option("--tier <tier>", "Memory tier (episodic|semantic|procedural)", "episodic")
    .option("--project <projectId>", "Project scope")
    .option("--tags <tags>", "Comma-separated tags", "")
    .action(async (opts: { text?: string; tier: string; project?: string; tags: string }) => {
      const text = opts.text ?? readFileSync("/dev/stdin", "utf-8").trim();
      if (!text) {
        console.error("No input");
        process.exit(1);
      }
      const { queue } = loadVaultCore();
      const VALID_TIERS = ["episodic", "semantic", "procedural"] as const;
      type ValidTier = (typeof VALID_TIERS)[number];
      const tier: ValidTier = (VALID_TIERS as readonly string[]).includes(opts.tier)
        ? (opts.tier as ValidTier)
        : "episodic";
      queue.capture({
        content: text,
        sourceType: "cli",
        hints: {
          tier,
          tags: opts.tags
            ? opts.tags
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
        ...(opts.project ? { projectId: opts.project } : {}),
      });
      console.log("Queued for capture.");
      await queue.flush();
      queue.destroy();
    });
};
