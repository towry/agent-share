#!/usr/bin/env bash
# whoami.sh — print your own herdr pane identity.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: run-skill-script herdr whoami
Print your own herdr pane identity as a field block
(PANE_ID/WORKSPACE/TAB/AGENT/LABEL/FOCUSED). Reads $HERDR_PANE_ID from the
environment; takes no arguments.
EOF
  exit 0
fi

require_herdr_env

herdr pane get "$HERDR_PANE_ID" | jq -r '.result.pane |
  "PANE_ID=\(.pane_id)",
  "WORKSPACE=\(.workspace_id)",
  "TAB=\(.tab_id)",
  "AGENT=\(.agent // "shell")",
  "LABEL=\(.label // "-")",
  "FOCUSED=\(.focused)"'
