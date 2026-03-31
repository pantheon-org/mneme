import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { IndexDB } from "./index-db.js";
import type { VaultReader } from "./vault-reader.js";

const TIER_DIRS = ["01-episodic", "02-semantic", "03-procedural"];

const collectVaultFiles = (vaultPath: string): string[] => {
  const files: string[] = [];
  for (const dir of TIER_DIRS) {
    const full = join(vaultPath, dir);
    try {
      for (const f of readdirSync(full)) {
        if (f.endsWith(".md")) files.push(join(full, f));
      }
    } catch {}
  }
  return files;
};

export const reconcile = (
  db: IndexDB,
  reader: VaultReader,
  vaultPath: string,
): { inserted: number; deleted: number } => {
  const vaultFiles = new Set(collectVaultFiles(vaultPath));

  let inserted = 0;
  for (const filePath of vaultFiles) {
    try {
      const mem = reader.read(filePath);
      if (db.getById(mem.id) === null) {
        db.upsert(mem);
        inserted++;
      }
    } catch {}
  }

  let deleted = 0;
  for (const id of db.allIds()) {
    const mem = db.getById(id);
    if (mem !== null && !existsSync(mem.filePath)) {
      db.delete(id);
      deleted++;
    }
  }

  return { inserted, deleted };
};
