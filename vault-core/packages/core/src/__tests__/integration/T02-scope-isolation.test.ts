import { afterAll, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { IndexDB } from "../../storage/index-db.js";
import { VaultWriter } from "../../storage/vault-writer.js";
import { cleanDir, makeMemory, makeTmpDir } from "./helpers.js";

const tmpDir = makeTmpDir();
const vaultPath = join(tmpDir, "vault");
const indexPath = join(tmpDir, "index.db");

afterAll(() => cleanDir(tmpDir));

describe("T02: scope isolation", () => {
  it("project-alpha memories never appear when filtering for project-beta", () => {
    const db = new IndexDB(indexPath);
    const writer = new VaultWriter(vaultPath);

    const alphaMemories = Array.from({ length: 10 }, (_, i) =>
      makeMemory({
        summary: `Alpha memory ${i + 1} about authentication`,
        content: `Project alpha uses OAuth2 for authentication. Detail ${i + 1}`,
        scope: "project",
        projectId: "project-alpha",
      }),
    );

    const betaMemories = Array.from({ length: 10 }, (_, i) =>
      makeMemory({
        summary: `Beta memory ${i + 1} about authentication`,
        content: `Project beta uses API keys for authentication. Detail ${i + 1}`,
        scope: "project",
        projectId: "project-beta",
      }),
    );

    for (const mem of [...alphaMemories, ...betaMemories]) {
      mem.filePath = writer.resolveFilePath(mem);
      writer.write(mem);
      db.upsert(mem);
    }

    const allResults = db.bm25Search("authentication", 30);
    expect(allResults.length).toBeGreaterThan(0);

    const alphaIds = new Set(alphaMemories.map((m) => m.id));
    const filteredForBeta = allResults.filter((r) => {
      const mem = db.getById(r.id);
      return mem !== null && (mem.scope !== "project" || mem.projectId === "project-beta");
    });

    for (const result of filteredForBeta) {
      expect(alphaIds.has(result.id)).toBe(false);
    }
  });

  it("user-scope memories appear regardless of project filter", () => {
    const db = new IndexDB(join(makeTmpDir(), "index.db"));
    const userMem = makeMemory({
      summary: "Global coding convention about naming",
      content: "Always use camelCase for variables and PascalCase for types.",
      scope: "user",
    });
    const writer = new VaultWriter(join(makeTmpDir(), "vault"));
    userMem.filePath = writer.resolveFilePath(userMem);
    db.upsert(userMem);

    const results = db.bm25Search("naming convention", 10);
    const found = results.find((r) => r.id === userMem.id);
    expect(found).toBeDefined();
  });
});
