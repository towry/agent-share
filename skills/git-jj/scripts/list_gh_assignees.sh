#!/usr/bin/env bash
# list_gh_assignees.sh - Help pick the right GitHub assignee for the current repo.
#
# Problem it solves: a person's real name / commit-author name rarely equals
# their GitHub login (e.g. author "chendi" -> login "chendi0x7C00"), so blindly
# assigning by guessed username 404s or pings the wrong person.
#
# It prints two correlated views of the CURRENT repo (resolved from the git
# remote via gh):
#   1. Assignable users  — who CAN be assigned (assignees endpoint).
#   2. Recent committers — git author name/email -> GitHub login, deduped with
#      counts. The login column is the bridge: find the real name here, read off
#      the login, then confirm it appears in view 1.
#
# Usage: run-skill-script git-jj list-gh-assignees [N]
#   N = recent commits to scan for the name->login mapping (default 100, max 100)

set -euo pipefail

if ! command -v gh > /dev/null 2>&1; then
  echo "error: gh CLI not found" >&2
  exit 1
fi

# Resolve owner/repo from the current dir's git remote; fails if absent.
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [ -z "$repo" ]; then
  echo "error: not in a GitHub repo (gh repo view failed). cd into the repo first." >&2
  exit 1
fi

# Clamp scan count to GitHub's per_page max (100); default 100.
n="${1:-100}"
if ! [[ "$n" =~ ^[0-9]+$ ]] || [ "$n" -lt 1 ]; then n=100; fi
if [ "$n" -gt 100 ]; then n=100; fi

echo "# GitHub assignees for $repo"
echo ""

echo "## Assignable users"
assignees="$(gh api "repos/{owner}/{repo}/assignees" --paginate -q '.[].login' 2>/dev/null | sort -u)"
if [ -z "$assignees" ]; then
  echo "(none — you may lack push access, or the repo has no assignable users)"
else
  echo "$assignees" | sed 's/^/  /'
fi
echo ""

echo "## Recent committers (last $n commits) — count  login  name <email>"
echo "## login '(unlinked)' = commit email not tied to a GitHub account; fuzzy-match name against the list above"
mapping="$(gh api "repos/{owner}/{repo}/commits?per_page=$n" \
  -q '.[] | "\(.author.login // "(unlinked)")\t\(.commit.author.name) <\(.commit.author.email)>"' \
  2>/dev/null | sort | uniq -c | sort -rn || true)"
if [ -z "$mapping" ]; then
  echo "(no commits found)"
else
  echo "$mapping"
fi
