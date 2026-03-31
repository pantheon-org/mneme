# Branch Protection Setup

The following settings must be applied to the `main` branch at:
<https://github.com/pantheon-org/mneme/settings/branches>

Required settings:

- Require a pull request before merging
  - Required approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed
- Require status checks to pass before merging
  - Status check: `Typecheck, Build & BDD Tests`
  - Require branches to be up to date before merging
- Do not allow bypassing the above settings
