#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { loadVaultCore } from "./core-loader.js";
import { formatSearchResults } from "./format.js";

const program = new Command();

program
  .name("vault-cli")
  .description("vault-core CLI — psychology-grounded AI memory")
  .version("0.0.1");

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
    queue.capture({
      content: text,
      sourceType: "cli",
      hints: {
        tier: opts.tier as "episodic" | "semantic" | "procedural",
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
    await new Promise((r) => setTimeout(r, 1500));
    queue.destroy();
  });

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
      process.exit(1);
    }
    console.log(formatSearchResults(results));
  });

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
    await new Promise((r) => setTimeout(r, 1500));
    queue.destroy();
  });

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
    for (const m of mems) {
      console.log(`[${m.capturedAt.slice(0, 10)}] ${m.summary}`);
    }
  });

program
  .command("consolidate")
  .description("Propose or apply memory consolidation")
  .option("--propose", "Generate consolidation proposals")
  .option("--apply", "Apply approved proposals from vault inbox")
  .option("--project <projectId>", "Project scope")
  .action(async (opts: { propose?: boolean; apply?: boolean; project?: string }) => {
    const { proposer, approval } = loadVaultCore();
    if (opts.apply) {
      const { approved, rejected } = approval.applyApproved();
      console.log(`Applied: ${approved} approved, ${rejected} rejected.`);
    } else {
      const proposals = await proposer.propose(opts.project);
      if (proposals.length === 0) {
        console.log("No consolidation candidates found.");
        return;
      }
      approval.renderProposals(proposals);
      console.log(`${proposals.length} proposal(s) written to vault inbox.`);
    }
  });

program
  .command("index")
  .description("Rebuild SQLite index from vault files")
  .action(async () => {
    const { loadConfig } = await import("@vault-core/core");
    const { db, reader } = loadVaultCore();
    const config = loadConfig();
    const { Glob } = await import("bun");
    const glob = new Glob("**/*.md");
    let count = 0;
    for await (const f of glob.scan({ cwd: config.vault_path, absolute: true })) {
      try {
        const mem = reader.read(f);
        db.upsert(mem);
        count++;
      } catch {
        /* skip malformed */
      }
    }
    console.log(`Indexed ${count} notes.`);
  });

program
  .command("status")
  .description("Show vault status")
  .action(() => {
    const { db } = loadVaultCore();
    const episodic = db.getByTier("episodic").length;
    const semantic = db.getByTier("semantic").length;
    const procedural = db.getByTier("procedural").length;
    console.log(`vault-core status`);
    console.log(`  episodic:   ${episodic}`);
    console.log(`  semantic:   ${semantic}`);
    console.log(`  procedural: ${procedural}`);
    console.log(`  total:      ${episodic + semantic + procedural}`);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
