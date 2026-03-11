#!/usr/bin/env bun
import { Command } from "commander";
import { registerCapture } from "./commands/capture.js";
import { registerConsolidate } from "./commands/consolidate.js";
import { registerFetch } from "./commands/fetch.js";
import { registerIndex } from "./commands/index-cmd.js";
import { registerRecent } from "./commands/recent.js";
import { registerSearch } from "./commands/search.js";
import { registerStatus } from "./commands/status.js";

const program = new Command();
program
  .name("vault-cli")
  .description("vault-core CLI — psychology-grounded AI memory")
  .version("0.0.1");

registerCapture(program);
registerSearch(program);
registerFetch(program);
registerRecent(program);
registerConsolidate(program);
registerIndex(program);
registerStatus(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
