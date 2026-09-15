#!/bin/bash

# repo_check.sh - Determine whether to use jj or git for this repository
# Outputs to stdout: "jj", "git", or "no-repo"
# Always exits with 0 on success
#
# Detection priority:
#   1. .jj folder exists → "jj" (even if git repo also present)
#   2. Git repository detected → "git"
#   3. Neither found → "no-repo"

set -e

# Check for jj repository - priority 1
# Note: jj often operates atop git, so check .jj first
# Use `jj root` to detect jj workspace from any subdirectory
if jj root > /dev/null 2>&1; then
    echo "jj"
    exit 0
fi

# Check for git repository - priority 2
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "git"
    exit 0
fi

# Neither found - user needs to initialize
echo "no-repo"
exit 0
