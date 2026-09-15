#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["tiktoken>=0.7"]
# ///
"""Count tokens in the frontmatter `description` field of each skill's SKILL.md.

Usage:
    run-skill-script agent-doc count-skill-desc-tokens
    run-skill-script agent-doc count-skill-desc-tokens --dir ~/.agents/skills
    run-skill-script agent-doc count-skill-desc-tokens --top 10
    run-skill-script agent-doc count-skill-desc-tokens --json
    run-skill-script agent-doc count-skill-desc-tokens --encoding o200k_base

Note: tiktoken is OpenAI's BPE and is not identical to the Claude tokenizer, but for
mixed Chinese-English text the difference is usually <10%, which is sufficient for budget estimates.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import tiktoken


@dataclass
class Row:
    name: str
    chars: int
    bytes: int
    tokens: int


def extract_description(md: str) -> Optional[str]:
    """Extract description from Markdown frontmatter, supporting one-line and block scalars (|, >)."""
    if not md.startswith("---"):
        return None
    end = md.find("\n---", 3)
    if end < 0:
        return None
    fm = md[3:end].lstrip("\n")
    lines = fm.split("\n")
    for i, line in enumerate(lines):
        # Match only top-level keys (no leading spaces).
        if not line.startswith("description:"):
            continue
        rest = line[len("description:") :].lstrip()
        # Block scalar?
        if rest.startswith("|") or rest.startswith(">"):
            folded = rest[0] == ">"
            block: list[str] = []
            base_indent = -1
            for ln in lines[i + 1 :]:
                if ln.strip() == "":
                    block.append("")
                    continue
                indent = len(ln) - len(ln.lstrip(" "))
                if base_indent < 0:
                    base_indent = indent
                if indent < base_indent:
                    break
                block.append(ln[base_indent:])
            joined = "\n".join(block).rstrip("\n")
            if folded:
                # Fold single newlines into spaces and preserve double newlines.
                import re

                joined = re.sub(r"(?<!\n)\n(?!\n)", " ", joined)
            return joined
        # Single line.
        v = rest.strip()
        if (v.startswith('"') and v.endswith('"')) or (
            v.startswith("'") and v.endswith("'")
        ):
            v = v[1:-1]
        return v
    return None


def expand_home(p: str) -> Path:
    return Path(p).expanduser()


def parse_args():
    p = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    p.add_argument("--dir", default=".agents/skills", help="skills root directory")
    p.add_argument("--top", type=int, default=0, help="list only the top N")
    p.add_argument("--json", action="store_true", help="output JSON")
    p.add_argument(
        "--encoding",
        default="o200k_base",
        choices=["o200k_base", "cl100k_base", "p50k_base", "r50k_base"],
        help="tiktoken encoding name (default: o200k_base, GPT-4o)",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    root = expand_home(args.dir)
    if not root.is_dir():
        print(f"Cannot read directory: {root}", file=sys.stderr)
        return 1

    enc = tiktoken.get_encoding(args.encoding)

    rows: list[Row] = []
    for entry in sorted(root.iterdir()):
        skill_md = entry / "SKILL.md"
        if not skill_md.is_file():
            continue
        md = skill_md.read_text(encoding="utf-8", errors="replace")
        desc = extract_description(md)
        if not desc:
            continue
        tokens = len(enc.encode(desc))
        rows.append(
            Row(
                name=entry.name,
                chars=len(desc),
                bytes=len(desc.encode("utf-8")),
                tokens=tokens,
            )
        )

    rows.sort(key=lambda r: r.tokens, reverse=True)
    trimmed = rows[: args.top] if args.top > 0 else rows
    total_tokens = sum(r.tokens for r in rows)
    total_chars = sum(r.chars for r in rows)

    if args.json:
        print(
            json.dumps(
                {
                    "root": str(root),
                    "encoding": args.encoding,
                    "total_tokens": total_tokens,
                    "count": len(rows),
                    "rows": [asdict(r) for r in trimmed],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    name_w = max(5, max((len(r.name) for r in trimmed), default=5))
    print(f"Scanned directory: {root}")
    print(f"Encoding: tiktoken {args.encoding} (Claude tokenizer approximation for budgeting)\n")

    header = f"{'SKILL':<{name_w}}  {'TOKENS':>6}  {'CHARS':>5}  {'BYTES':>5}"
    print(header)
    print("-" * len(header))
    for r in trimmed:
        print(f"{r.name:<{name_w}}  {r.tokens:>6}  {r.chars:>5}  {r.bytes:>5}")
    print("-" * len(header))
    print(f"{f'TOTAL ({len(rows)})':<{name_w}}  {total_tokens:>6}  {total_chars:>5}")

    threshold = 150
    heavy = [r for r in rows if r.tokens > threshold]
    if heavy:
        print(
            f"\nWarning: {len(heavy)} skill descriptions exceed {threshold} tokens and must be shortened:"
        )
        for r in heavy:
            print(f"  - {r.name} ({r.tokens} tokens)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
