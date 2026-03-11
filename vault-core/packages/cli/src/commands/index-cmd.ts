import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";

export const registerIndex = (program: Command): void => {
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
      const seen = new Set<string>();
      for await (const f of glob.scan({ cwd: config.vault_path, absolute: true })) {
        try {
          const mem = reader.read(f);
          db.upsert(mem);
          seen.add(mem.id);
          count++;
        } catch {}
      }
      const stale = db.allIds().filter((id) => !seen.has(id));
      for (const id of stale) db.delete(id);
      console.log(`Indexed ${count} notes. Removed ${stale.length} stale entries.`);
    });
};
