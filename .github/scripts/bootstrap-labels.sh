#!/usr/bin/env bash
# Bootstrap repository labels for the issue lifecycle.
#
# Usage:
#   .github/scripts/bootstrap-labels.sh [--repo owner/repo]
#
# Requires the GitHub CLI (gh) to be authenticated.
# Idempotent: existing labels are updated to the declared colour/description.

set -euo pipefail

REPO="${1:-}"
if [[ -n "$REPO" ]]; then
  REPO_FLAG="--repo $REPO"
else
  REPO_FLAG=""
fi

label() {
  local name="$1"
  local color="$2"
  local description="$3"
  # shellcheck disable=SC2086
  if gh label list $REPO_FLAG --json name --jq '.[].name' | grep -qx "$name"; then
    gh label edit "$name" $REPO_FLAG --color "$color" --description "$description"
    echo "  updated  $name"
  else
    gh label create "$name" $REPO_FLAG --color "$color" --description "$description"
    echo "  created  $name"
  fi
}

migrate() {
  local old="$1"
  local new="$2"
  # shellcheck disable=SC2086
  if gh label list $REPO_FLAG --json name --jq '.[].name' | grep -qx "$old"; then
    echo "  migrating issues from '$old' → '$new' ..."
    # shellcheck disable=SC2086
    gh issue list $REPO_FLAG --label "$old" --json number --jq '.[].number' | while read -r num; do
      gh issue edit "$num" $REPO_FLAG --add-label "$new" --remove-label "$old"
      echo "    issue #$num migrated"
    done
    gh label delete "$old" $REPO_FLAG --yes
    echo "  deleted  $old"
  fi
}

echo "==> Status labels"
label "status: new"        "e4e669" "Freshly opened, awaiting triage"
label "status: needs-info" "d93f0b" "Requires clarification before work can begin"
label "status: ready"      "0075ca" "Self-contained and ready to be worked on"
label "status: wip"        "6f42c1" "Work in progress — a PR has been opened"
label "status: completed"  "0e8a16" "Work done, issue closed"

echo ""
echo "==> Priority labels (new)"
label "priority: critical" "b60205" "Must be fixed immediately — production impact or data loss"

echo ""
echo "==> Type labels (new)"
label "chore" "ededed" "Maintenance, tooling, configuration — no functional change"

echo ""
echo "==> Domain labels (create namespaced versions)"
label "domain: data-integrity" "c5def5" "Atomic writes, vault consistency, human-edit immunity"
label "domain: reliability"    "c5def5" "Queue durability, crash recovery, graceful degradation"
label "domain: governance"     "c5def5" "Consolidation, conflict resolution, approval flows"
label "domain: performance"    "c5def5" "Latency, token budgets, embedding throughput"
label "domain: security"       "e11d48" "Auth, prompt injection, secret handling"
label "domain: dx"             "c5def5" "CLI usability, hook ergonomics, developer experience"

echo ""
echo "==> Migrate flat domain labels to namespaced versions"
migrate "data-integrity" "domain: data-integrity"
migrate "governance"     "domain: governance"
migrate "performance"    "domain: performance"
# durability merges into domain: reliability
migrate "durability"     "domain: reliability"
migrate "reliability"    "domain: reliability"

echo ""
echo "Done."
