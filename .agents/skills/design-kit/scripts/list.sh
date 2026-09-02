#!/usr/bin/env bash
# list.sh — print design-kit reference catalog
# Output: categorized listing with one-line descriptions, so agents can pick
# which reference to read before doing any design work.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
REF_DIR="$SKILL_DIR/references"

# name|description — keep aligned with files under references/<category>/.
# Add new entries here when a new reference is dropped in.
STYLES=(
  "monochrome|Monochrome / terminal-inspired UI; grayscale, high contrast, squared corners, monospace data."
  "blueprint-editorial|Blueprint editorial UI; serif-led technical reading, gray tonal surfaces, line-art diagrams, soft product panels."
  "google-material-design|Material Design 3; elevation, HCT dynamic color, motion patterns, adaptive layouts."
  "paper-ui-style|Paper-like reading UI; warm off-white, centered narrow column, serif body + sans headings, generous whitespace."
)

WORKFLOWS=(
  "mastergo-parity|MasterGo design-to-implementation parity; read full design tree before coding to prevent layout drift."
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
    printf "  %-26s %s%s\n" "$name" "$desc" "$marker"
  done
  echo
}

echo "design-kit — available references"
echo "Read references/<category>/<name>.md for full content."
echo

print_group "styles"    "styles"    "${STYLES[@]}"
print_group "workflows" "workflows" "${WORKFLOWS[@]}"
