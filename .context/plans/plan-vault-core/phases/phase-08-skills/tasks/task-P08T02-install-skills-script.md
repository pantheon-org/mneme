# P08T02 — install-skills-script

## Phase

08 — skills

## Goal

Write `scripts/install-skills.ts` that copies all four SKILL.md files to both `~/.claude/skills/` and `~/.config/opencode/skills/`. Must be idempotent and report which files were installed.

## File to create/modify

```
scripts/install-skills.ts
```

## Implementation

`scripts/install-skills.ts`:
```javascript
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const SKILL_DIRS = [
  join(homedir(), '.claude', 'skills'),
  join(homedir(), '.config', 'opencode', 'skills'),
]

const SKILLS_ROOT = join(process.cwd(), 'skills')
const skillNames = readdirSync(SKILLS_ROOT)

for (const dest of SKILL_DIRS) {
  mkdirSync(dest, { recursive: true })
  for (const name of skillNames) {
    const src = join(SKILLS_ROOT, name, 'SKILL.md')
    const target = join(dest, name, 'SKILL.md')
    mkdirSync(join(dest, name), { recursive: true })
    copyFileSync(src, target)
    console.log(`Installed: ${target}`)
  }
}

console.log(`\nInstalled ${skillNames.length} skills to ${SKILL_DIRS.length} harnesses.`)
```

## Notes

- `copyFileSync` is idempotent — overwriting an existing file with the same content is safe
- The script reads skill names dynamically from `skills/` — adding a new skill directory automatically includes it in the install

## Verification

```sh
bun run scripts/install-skills.ts
ls ~/.claude/skills/vault-capture/SKILL.md
ls ~/.config/opencode/skills/vault-capture/SKILL.md
# both must exist
bun run scripts/install-skills.ts
# re-run must exit 0 (idempotent)
```
