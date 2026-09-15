#!/usr/bin/env bash
# _lib.sh — shared helpers for the herdr skill scripts.
#
# Sourced by each entry script: source "$(dirname "$0")/_lib.sh"
# Centralizes the HERDR_ENV guard, positional-reference resolution, and the pane
# summary block so the entry scripts carry no duplicated jq / branching. Not
# registered in meta.json (it is a library, not an entry point).
#
# All resolve_* helpers that print a pane id on stdout (or nothing when they
# resolve to no pane) always return 0, so callers can use $(...) under `set -e`
# and branch on an empty result instead of an exit code.
# require_concrete_pane_id is the exception: it exits on soft refs / not-found.

# Guard: every herdr script must run inside a herdr-managed pane. Centralizes the
# skill's HERDR_ENV rule so it cannot be skipped or mis-run outside herdr.
require_herdr_env() {
  if [ "${HERDR_ENV:-}" != "1" ]; then
    echo "error: HERDR_ENV is not \"1\" — not inside a herdr-managed pane; refusing to run." >&2
    exit 1
  fi
  if [ -z "${HERDR_PANE_ID:-}" ]; then
    echo "error: HERDR_PANE_ID is unset — cannot determine own pane." >&2
    exit 1
  fi
}

_my_workspace() {
  herdr pane get "$HERDR_PANE_ID" | jq -r '.result.pane.workspace_id // empty'
}

_my_tab() {
  herdr pane get "$HERDR_PANE_ID" | jq -r '.result.pane.tab_id // empty'
}

# Soft refs that may re-resolve to a different pane after layout changes.
# Send / mutate paths must refuse these and demand a concrete pane id instead.
is_soft_ref() {
  case "$1" in
    right | left | up | down | focused | tab:*) return 0 ;;
    *) return 1 ;;
  esac
}

# Require a concrete public pane id (e.g. w1:p2) that currently exists.
# Rejects soft refs (right/left/...), agent names, and labels so delivery cannot
# silently retarget after a split. Prints the verified pane id on stdout.
require_concrete_pane_id() {
  local raw="$1" pane
  if [ -z "$raw" ]; then
    echo "error: need a concrete pane id (e.g. w1:p2)." >&2
    echo "hint: run-skill-script herdr resolve <ref>  # discover, then pass PANE_ID=..." >&2
    exit 2
  fi
  if is_soft_ref "$raw"; then
    echo "error: '$raw' is a soft reference, not a pane id — refusing to send/act on it." >&2
    echo "hint: run-skill-script herdr resolve $raw   # list / pick a PANE_ID, then retry with that id" >&2
    exit 2
  fi
  case "$raw" in
    w*:p*) ;;
    *)
      echo "error: need a concrete pane id (e.g. w1:p2), got '$raw'." >&2
      echo "hint: run-skill-script herdr resolve <ref>  # or: herdr agent list / herdr pane list" >&2
      exit 2
      ;;
  esac
  pane=$(herdr pane get "$raw" 2>/dev/null | jq -r '.result.pane.pane_id // empty')
  if [ -z "$pane" ]; then
    echo "error: pane id '$raw' not found." >&2
    exit 1
  fi
  if [ "$pane" != "$raw" ]; then
    echo "error: pane get returned '$pane' for input '$raw' — refusing ambiguous id." >&2
    exit 1
  fi
  printf '%s\n' "$pane"
}

# All agent pane ids in a tab (one per line). Empty when none.
_agent_panes_in_tab() {
  local tab="$1"
  herdr agent list | jq -r --arg t "$tab" '.result.agents[] | select(.tab_id==$t) | .pane_id'
}

# Pick one agent pane inside a given tab (the first if several run there).
# Prefer list_agent_panes_in_tab + multi handling in resolve.sh for discovery.
_agent_pane_in_tab() {
  local tab="$1"
  _agent_panes_in_tab "$tab" | head -n1
}

# Geometric candidates in <dir> relative to $HERDR_PANE_ID inside the same tab.
# Uses layout rects + overlap — not herdr's single-neighbor pick — so multi-pane
# columns (right-upper + right-lower) surface as multiple ids, one per line.
list_direction_candidates() {
  local dir="$1"
  herdr pane layout --pane "$HERDR_PANE_ID" | jq -r --arg me "$HERDR_PANE_ID" --arg dir "$dir" '
    .result.layout as $L
    | ($L.panes[] | select(.pane_id == $me) | .rect) as $mr
    | if $mr == null then empty else
        $L.panes[]
        | select(.pane_id != $me)
        | . as $p | .rect as $r
        | (
            if $dir == "right" then
              ($r.x >= ($mr.x + $mr.width - 1))
              and ((([$mr.y + $mr.height, $r.y + $r.height] | min)
                    - ([$mr.y, $r.y] | max)) > 0)
            elif $dir == "left" then
              (($r.x + $r.width - 1) <= $mr.x)
              and ((([$mr.y + $mr.height, $r.y + $r.height] | min)
                    - ([$mr.y, $r.y] | max)) > 0)
            elif $dir == "down" then
              ($r.y >= ($mr.y + $mr.height - 1))
              and ((([$mr.x + $mr.width, $r.x + $r.width] | min)
                    - ([$mr.x, $r.x] | max)) > 0)
            elif $dir == "up" then
              (($r.y + $r.height - 1) <= $mr.y)
              and ((([$mr.x + $mr.width, $r.x + $r.width] | min)
                    - ([$mr.x, $r.x] | max)) > 0)
            else false end
          )
        | select(.)
        | $p.pane_id
      end
  '
}

# Adjacent-tab id for left/right when there is no same-tab split neighbor.
# Prints one tab_id or nothing.
_adjacent_tab_id() {
  local dir="$1" ws mytab mynum
  case "$dir" in
    left | right) ;;
    *) return 0 ;;
  esac
  ws=$(_my_workspace)
  mytab=$(_my_tab)
  [ -n "$ws" ] && [ -n "$mytab" ] || return 0
  mynum=$(herdr tab list --workspace "$ws" \
    | jq -r --arg t "$mytab" 'first(.result.tabs[] | select(.tab_id==$t) | .number) // empty')
  [ -n "$mynum" ] || return 0
  if [ "$dir" = right ]; then
    herdr tab list --workspace "$ws" \
      | jq -r --argjson n "$mynum" '[.result.tabs[] | select(.number > $n)] | sort_by(.number) | .[0].tab_id // empty'
  else
    herdr tab list --workspace "$ws" \
      | jq -r --argjson n "$mynum" '[.result.tabs[] | select(.number < $n)] | sort_by(.number) | last | .tab_id // empty'
  fi
}

# "right/left/up/down": same-tab geometric neighbor if any, else adjacent-tab
# agent (left/right only). Returns at most one id — for multi-candidate discovery
# use list_direction_candidates / resolve.sh instead.
_resolve_direction() {
  local dir="$1" pane tab
  # Prefer geometry list when unique; fall back to herdr neighbor for the
  # single-neighbor case that list might miss at edges.
  pane=$(list_direction_candidates "$dir" | head -n1)
  if [ -z "$pane" ]; then
    pane=$(herdr pane neighbor --direction "$dir" --pane "$HERDR_PANE_ID" \
      | jq -r '.result.neighbor.neighbor_pane_id // empty')
  fi
  if [ -n "$pane" ]; then
    printf '%s\n' "$pane"
    return 0
  fi
  tab=$(_adjacent_tab_id "$dir")
  [ -n "$tab" ] || return 0
  _agent_pane_in_tab "$tab"
}

# "tab:N": tabs sorted ascending by number; N is 1-based.
_resolve_tab() {
  local n="$1" ws tab
  case "$n" in
    '' | *[!0-9]*) return 0 ;; # non-numeric → no target
  esac
  ws=$(_my_workspace)
  [ -n "$ws" ] || return 0
  tab=$(herdr tab list --workspace "$ws" \
    | jq -r --argjson i "$n" '[.result.tabs[]] | sort_by(.number) | .[$i-1].tab_id // empty')
  [ -n "$tab" ] || return 0
  _agent_pane_in_tab "$tab"
}

# A bare value: try `agent get` (accepts name / label / terminal / pane id),
# then fall back to `pane get`. A not-found is an expected branch here — herdr
# prints the error to stderr and still exits 0, so silence stderr and branch on
# the extracted pane id, not the exit code.
_resolve_name() {
  local val="$1" pane
  pane=$(herdr agent get "$val" 2>/dev/null | jq -r '.result.agent.pane_id // empty')
  if [ -n "$pane" ]; then
    printf '%s\n' "$pane"
    return 0
  fi
  herdr pane get "$val" 2>/dev/null | jq -r '.result.pane.pane_id // empty'
}

# Resolve a reference into a pane id (empty when it resolves to nothing).
# Discovery only — do not use this on send/mutate paths (see require_concrete_pane_id).
resolve_ref() {
  local ref="$1"
  case "$ref" in
    right | left | up | down) _resolve_direction "$ref" ;;
    tab:*) _resolve_tab "${ref#tab:}" ;;
    focused) herdr agent list | jq -r 'first(.result.agents[] | select(.focused==true) | .pane_id) // empty' ;;
    *) _resolve_name "$ref" ;;
  esac
}

# Print a field block identifying a pane.
pane_summary() {
  local pane="$1"
  herdr pane get "$pane" | jq -r '.result.pane |
    "PANE_ID=\(.pane_id)",
    "AGENT=\(.agent // "shell")",
    "TAB=\(.tab_id)",
    "WORKSPACE=\(.workspace_id)",
    "STATUS=\(.agent_status // "unknown")"'
}
