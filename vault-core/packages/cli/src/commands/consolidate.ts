import type { Command } from "commander";
import { loadVaultCore } from "../core-loader.js";

export const registerConsolidate = (program: Command): void => {
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
};
