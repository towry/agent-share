#!/usr/bin/env bash
# list.sh — print ui-kit reference catalog
# Output: categorized listing with one-line descriptions, so agents can pick
# which reference to read before diagnosing or fixing UI.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
REF_DIR="$SKILL_DIR/references"

# name|description — keep aligned with files under references/<category>/.
# Add new entries here when a new reference is dropped in.
AUDITS=(
  "visual-critique|First-pass visual critique; weight, hierarchy, rhythm, density, scan path — symptoms only, no fixes."
  "interaction-audit|Interaction-code UX compliance audit; keyboard, scroll, gesture, focus, streaming — report state, no fixes."
)

FIXES=(
  "methodical-fix|Evidence-first fixing for shared components, cross-page regressions, 'fix A break B' cases."
  "phantom-frame|Structural fix for UI drift, flicker, screenshot/impl divergence, pixel-level layout bugs."
)

print_group() {
  local label="$1"
  local subdir="$2"
  shift 2
  local entries=("$@")

  echo "[$label]"
  for entry in "${entries[@]}"; do
    local name="${entry%%|*}"
    local desc="${entry#*|}"
    local file="$REF_DIR/$subdir/$name.md"
    local marker=""
    [ -f "$file" ] || marker=" (MISSING)"
    printf "  %-22s %s%s\n" "$name" "$desc" "$marker"
  done
  echo
}

echo "ui-kit — available references"
echo "Read references/<category>/<name>.md for full content."
echo

print_group "audits" "audits" "${AUDITS[@]}"
print_group "fixes"  "fixes"  "${FIXES[@]}"
