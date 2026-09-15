#!/bin/bash
# review_vcs_context.sh - Output VCS status for code review
# Only shows status (changed files), not full diff to avoid context bloat

set -e

# Detect VCS type
vcs_type="no-repo"
if jj root > /dev/null 2>&1; then
    vcs_type="jj"
elif git rev-parse --git-dir > /dev/null 2>&1; then
    vcs_type="git"
fi

echo "## VCS: $vcs_type"
echo ""

if [ "$vcs_type" = "no-repo" ]; then
    echo "No repository detected."
    exit 0
fi

if [ "$vcs_type" = "jj" ]; then
    echo "### Status"
    echo '```'
    jj status 2>/dev/null || echo "(jj status failed)"
    echo '```'
else
    echo "### Status"
    echo '```'
    git status --short 2>/dev/null || echo "(git status failed)"
    echo '```'
fi
