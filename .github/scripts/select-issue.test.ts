import { describe, it, expect, beforeEach } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { selectIssue } from "./select-issue.ts";
import type { Octokit } from "@octokit/rest";

type MockIssue = {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
};

const makeOctokit = (wipIssues: MockIssue[], readyIssues: MockIssue[]): Octokit => {
  return {
    rest: {
      issues: {
        listForRepo: async ({ labels }: { labels: string }) => {
          if (labels === "status: wip") {
            return { data: wipIssues };
          }
          return { data: readyIssues };
        },
      },
    },
    paginate: async (_fn: unknown, { labels }: { labels: string }) => {
      if (labels === "status: ready") return readyIssues;
      return [];
    },
  } as unknown as Octokit;
};

let outputFile: string;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "select-issue-test-"));
  outputFile = join(dir, "github_output");
});

describe("selectIssue", () => {
  it("returns without writing output when a wip issue exists", async () => {
    const octokit = makeOctokit(
      [{ number: 10, title: "WIP issue", labels: [{ name: "status: wip" }] }],
      [],
    );
    await selectIssue(octokit, "owner", "repo", outputFile);
    expect(existsSync(outputFile)).toBe(false);
  });

  it("returns without writing output when no ready issues exist", async () => {
    const octokit = makeOctokit([], []);
    await selectIssue(octokit, "owner", "repo", outputFile);
    expect(existsSync(outputFile)).toBe(false);
  });

  it("selects the only ready issue when it has no priority label", async () => {
    const octokit = makeOctokit([], [{ number: 5, title: "Unlabelled issue", labels: [] }]);
    await selectIssue(octokit, "owner", "repo", outputFile);
    const output = readFileSync(outputFile, "utf8");
    expect(output).toContain("issue_number=5");
    expect(output).toContain("issue_title=Unlabelled issue");
  });

  it("selects the priority: critical issue when multiple issues exist", async () => {
    const octokit = makeOctokit(
      [],
      [
        { number: 2, title: "Low issue", labels: [{ name: "priority: low" }] },
        { number: 1, title: "Critical issue", labels: [{ name: "priority: critical" }] },
        { number: 3, title: "Medium issue", labels: [{ name: "priority: medium" }] },
      ],
    );
    await selectIssue(octokit, "owner", "repo", outputFile);
    const output = readFileSync(outputFile, "utf8");
    expect(output).toContain("issue_number=1");
    expect(output).toContain("issue_title=Critical issue");
  });

  it("selects the first issue deterministically when scores are equal", async () => {
    const octokit = makeOctokit(
      [],
      [
        { number: 7, title: "First high", labels: [{ name: "priority: high" }] },
        { number: 8, title: "Second high", labels: [{ name: "priority: high" }] },
      ],
    );
    await selectIssue(octokit, "owner", "repo", outputFile);
    const output = readFileSync(outputFile, "utf8");
    expect(output).toContain("issue_number=7");
  });
});
