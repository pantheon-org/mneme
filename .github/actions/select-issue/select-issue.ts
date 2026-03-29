import { Octokit } from "@octokit/rest";
import { appendFileSync } from "fs";

const priorityWeight: Record<string, number> = {
  "priority: critical": 0,
  "priority: high": 1,
  "priority: medium": 2,
  "priority: low": 3,
};

const score = (issue: { labels: Array<string | { name?: string }> }): number => {
  const names = issue.labels.map((l) => (typeof l === "string" ? l : (l.name ?? "")));
  for (const [label, weight] of Object.entries(priorityWeight)) {
    if (names.includes(label)) return weight;
  }
  return 4;
};

export const selectIssue = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  outputPath: string,
): Promise<void> => {
  const wip = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    labels: "status: wip",
    state: "open",
    per_page: 1,
  });
  if (wip.data.length > 0) {
    console.info(`Issue #${wip.data[0]!.number} is already status: wip — skipping.`);
    return;
  }

  const ready = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    labels: "status: ready",
    state: "open",
    per_page: 100,
  });

  if (ready.length === 0) {
    console.info("No status: ready issues found.");
    return;
  }

  ready.sort((a, b) => score(a) - score(b));
  const chosen = ready[0]!;

  console.info(`Selected issue #${chosen.number}: "${chosen.title}" (score ${score(chosen)})`);
  appendFileSync(outputPath, `issue_number=${String(chosen.number)}\nissue_title=${chosen.title}\n`);
};

if (import.meta.main) {
  const token =
    process.env["GITHUB_TOKEN"] ??
    (() => {
      throw new Error("GITHUB_TOKEN required");
    })();
  const repoEnv =
    process.env["GITHUB_REPOSITORY"] ??
    (() => {
      throw new Error("GITHUB_REPOSITORY required");
    })();
  const outputPath =
    process.env["GITHUB_OUTPUT"] ??
    (() => {
      throw new Error("GITHUB_OUTPUT required");
    })();
  const [owner, repoName] = repoEnv.split("/") as [string, string];
  await selectIssue(new Octokit({ auth: token }), owner, repoName, outputPath);
}
