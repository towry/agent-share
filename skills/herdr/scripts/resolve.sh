#!/usr/bin/env bash
# resolve.sh — discover pane id(s) from a soft / positional reference.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

usage() {
  cat <<'EOF'
Usage: run-skill-script herdr resolve <ref>
Discover pane id(s) for a soft reference, then print who each is plus a recent
readback. This is the only helper that should interpret geometry / names.

After you have a PANE_ID, pass that id to send-signed and raw herdr pane/agent
mutate commands — do not re-resolve "right" on every send (layout can change).

<ref> is one of:
  right | left | up | down   same-tab geometric neighbors (all overlapping
                             candidates listed; multi → exit 1 so you pick);
                             if none, adjacent tab agents (left/right only)
  tab:N                      agents in the Nth tab, 1-based by tab number
  focused                    the agent pane the user is currently viewing
  <name|label|pane id>       via `herdr agent get`, then `herdr pane get`

Stdout always includes PANE_ID=... lines you can copy into send-signed.
Exits non-zero when nothing matches, or when multiple candidates need a pick.
EOF
}

# Print each candidate with a separator; used for multi and single paths.
_print_candidates() {
  local first=1 p
  for p in "$@"; do
    if [ "$first" -eq 0 ]; then
      echo "---"
    fi
    first=0
    pane_summary "$p"
    echo "--- recent (50 lines) ---"
    herdr pane read "$p" --source recent --lines 50
  done
}

# Exit 1 with a clear multi-pick message when more than one id is listed.
_fail_multi() {
  local ref="$1"
  shift
  echo "error: multiple panes match ref '$ref' — pick one PANE_ID; do not guess." >&2
  echo "hint: run-skill-script herdr send-signed <chosen_pane_id> \"...\"" >&2
  _print_candidates "$@"
  exit 1
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

require_herdr_env

if [ $# -lt 1 ]; then
  usage >&2
  exit 2
fi

ref="$1"
candidates=()

case "$ref" in
  right | left | up | down)
    # Same-tab geometry first: list every overlapping pane in that direction.
    while IFS= read -r p; do
      [ -n "$p" ] && candidates+=("$p")
    done < <(list_direction_candidates "$ref")

    if [ "${#candidates[@]}" -eq 0 ]; then
      # Fall back to herdr's single neighbor (edge cases / non-overlap).
      p=$(herdr pane neighbor --direction "$ref" --pane "$HERDR_PANE_ID" \
        | jq -r '.result.neighbor.neighbor_pane_id // empty')
      [ -n "$p" ] && candidates+=("$p")
    fi

    if [ "${#candidates[@]}" -eq 0 ]; then
      # Adjacent tab (left/right only): list all agents there.
      tab=$(_adjacent_tab_id "$ref")
      if [ -n "$tab" ]; then
        while IFS= read -r p; do
          [ -n "$p" ] && candidates+=("$p")
        done < <(_agent_panes_in_tab "$tab")
      fi
    fi
    ;;
  tab:*)
    n="${ref#tab:}"
    case "$n" in
      '' | *[!0-9]*)
        echo "error: tab:N requires a numeric N." >&2
        exit 2
        ;;
    esac
    ws=$(_my_workspace)
    if [ -n "$ws" ]; then
      tab=$(herdr tab list --workspace "$ws" \
        | jq -r --argjson i "$n" '[.result.tabs[]] | sort_by(.number) | .[$i-1].tab_id // empty')
      if [ -n "$tab" ]; then
        while IFS= read -r p; do
          [ -n "$p" ] && candidates+=("$p")
        done < <(_agent_panes_in_tab "$tab")
      fi
    fi
    ;;
  focused)
    p=$(herdr agent list | jq -r 'first(.result.agents[] | select(.focused==true) | .pane_id) // empty')
    [ -n "$p" ] && candidates+=("$p")
    ;;
  *)
    p=$(resolve_ref "$ref")
    [ -n "$p" ] && candidates+=("$p")
    ;;
esac

if [ "${#candidates[@]}" -eq 0 ]; then
  echo "error: could not resolve ref '$ref' to any pane." >&2
  exit 1
fi

if [ "${#candidates[@]}" -gt 1 ]; then
  _fail_multi "$ref" "${candidates[@]}"
fi

_print_candidates "${candidates[0]}"
