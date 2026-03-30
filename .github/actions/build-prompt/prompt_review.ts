import { appendFileSync } from "node:fs";

const env = process.env;
const prDiff = env.PR_DIFF ?? "";

const prompt = `You are reviewing a pull request for the mneme repository (vault-core), a Bun monorepo
implementing persistent memory for AI coding agents.

Key conventions to enforce:
- TypeScript strict mode (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess)
- Bun runtime only: use bun:sqlite, bun:test — never better-sqlite3, Jest, or Vitest
- NodeNext module resolution: .js extensions required in imports
- Arrow functions preferred over function declarations
- No comments in code unless logic is non-obvious
- No unused imports
- Max 110 non-blank lines per file
- One exported function/class per module
- import type for type-only imports

PR diff:
${prDiff}

Provide a review covering:
1. Summary of changes (2–3 sentences)
2. Any violations of the conventions above
3. Correctness concerns (memory model, atomic writes, non-blocking capture)
4. Test coverage gaps
5. Overall verdict: Approve / Request Changes / Comment`;

const delim = "PROMPT_EOF";
appendFileSync(env.GITHUB_OUTPUT!, `prompt<<${delim}\n${prompt}\n${delim}\n`);
