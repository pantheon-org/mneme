import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";

export const registerStatus = (program: Command): void => {
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
};
