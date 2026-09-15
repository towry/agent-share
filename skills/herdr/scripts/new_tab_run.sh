#!/usr/bin/env bash
# new_tab_run.sh — open a new tab in your workspace and run a command in it.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: run-skill-script herdr new-tab-run "<label>" "<command>"
Open a new tab in your own workspace (without stealing focus) and run <command>
in its root pane — the default placement for a server, watcher, log tail, or
another agent. Prints PANE_ID=<root pane> for follow-up reads / waits.
EOF
  exit 0
fi

require_herdr_env

if [ $# -lt 2 ]; then
  echo "error: need <label> and <command>." >&2
  echo "usage: run-skill-script herdr new-tab-run \"<label>\" \"<command>\"" >&2
  exit 2
fi

label="$1"
cmd="$2"

ws=$(herdr pane get "$HERDR_PANE_ID" | jq -r '.result.pane.workspace_id // empty')
if [ -z "$ws" ]; then
  echo "error: could not determine own workspace." >&2
  exit 1
fi

root=$(herdr tab create --workspace "$ws" --no-focus --label "$label" \
  | jq -r '.result.root_pane.pane_id // empty')
if [ -z "$root" ]; then
  echo "error: tab create did not return a root pane id." >&2
  exit 1
fi

herdr pane run "$root" "$cmd"
echo "PANE_ID=$root"
