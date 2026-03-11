#!/usr/bin/env bun
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const SKILLS_ROOT = resolve(import.meta.dir, "..", "skills");

const SKILL_DEST_DIRS = [
  join(homedir(), ".claude", "skills"),
  join(homedir(), ".config", "opencode", "skills"),
];

const skillDirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let installed = 0;

for (const destBase of SKILL_DEST_DIRS) {
  for (const skillName of skillDirs) {
    const src = join(SKILLS_ROOT, skillName, "SKILL.md");
    if (!existsSync(src)) continue;

    const destDir = join(destBase, skillName);
    mkdirSync(destDir, { recursive: true });

    const dest = join(destDir, "SKILL.md");
    copyFileSync(src, dest);
    console.log(`  installed ${skillName} → ${dest}`);
    installed++;
  }
}

console.log(`\nDone. ${installed} skill file(s) installed.`);
