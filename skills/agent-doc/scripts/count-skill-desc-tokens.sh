#!/usr/bin/env bash
# Wrapper: run-skill-script forces plain python3; this keeps uv + PEP 723 deps.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec uv run --script "$DIR/count-skill-desc-tokens.py" "$@"
