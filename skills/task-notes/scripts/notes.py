#!/usr/bin/env python3
"""task-notes  —  JSONL-backed scratchpad for long tasks.

Storage: <repo-root>/.agents/notes/<task-slug>.jsonl (one file per task,
auto-created). Override the directory via env TASK_NOTES_DIR.
IDs are globally unique across all task files in the directory.
"""

from __future__ import annotations

import argparse
import contextlib
import fcntl
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Iterable

TYPES = ("finding", "decision", "constraint", "outcome_summary", "process", "question")
WHY_REQUIRED = {"decision", "constraint", "outcome_summary"}
TASK_SLUG_RE = re.compile(r"^[A-Za-z0-9._-]+$")


def repo_root() -> Path:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(r.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Path.cwd()


def notes_dir() -> Path:
    env = os.environ.get("TASK_NOTES_DIR")
    if env:
        return Path(env).expanduser()
    return repo_root() / ".agents" / "notes"


def validate_task_slug(task: str) -> None:
    if not TASK_SLUG_RE.match(task):
        sys.exit(
            f"error: invalid --task {task!r}; allowed chars: [A-Za-z0-9._-]"
        )


def task_file(task: str) -> Path:
    validate_task_slug(task)
    return notes_dir() / f"{task}.jsonl"


def all_task_files() -> list[Path]:
    d = notes_dir()
    if not d.exists():
        return []
    return sorted(p for p in d.iterdir() if p.is_file() and p.suffix == ".jsonl")


def ensure_dir(p: Path) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)


@contextlib.contextmanager
def global_lock():
    """Serialize id allocation and full-file rewrites across processes.

    next_id() reads the global max, then cmd_add/cmd_resolve write. Without a
    cross-process lock, two parallel `add` invocations both read the same max and
    allocate the same id (TOCTOU); a concurrent append during cmd_resolve's
    read-modify-write would be lost when it rewrites from stale memory. ids are
    global across task files, so a single lock file in notes_dir() guards all
    writers. flock is advisory and process-local  —  every writer must take it.
    """
    d = notes_dir()
    d.mkdir(parents=True, exist_ok=True)
    with (d / ".lock").open("w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


def _load_file(p: Path) -> list[dict]:
    if not p.exists():
        return []
    items: list[dict] = []
    with p.open(encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(
                    f"warning: malformed line {ln} in {p}: {e}",
                    file=sys.stderr,
                )
    return items


def load_task(task: str) -> list[dict]:
    return _load_file(task_file(task))


def load_all(task: str | None = None) -> list[dict]:
    if task:
        return load_task(task)
    items: list[dict] = []
    for p in all_task_files():
        items.extend(_load_file(p))
    return items


def write_task(task: str, items: list[dict]) -> None:
    p = task_file(task)
    ensure_dir(p)
    tmp = p.with_suffix(p.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    tmp.replace(p)


def append_task(task: str, item: dict) -> None:
    p = task_file(task)
    ensure_dir(p)
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="milliseconds")


def next_id() -> int:
    """Global next id across all task files."""
    return max((int(it.get("id", 0)) for it in load_all()), default=0) + 1


def find_entry_file(entry_id: int) -> tuple[Path, list[dict], int] | None:
    """Return (path, all_items_in_file, index_of_match) or None."""
    for p in all_task_files():
        items = _load_file(p)
        for i, it in enumerate(items):
            if int(it.get("id", -1)) == entry_id:
                return p, items, i
    return None


def cmd_add(args: argparse.Namespace) -> int:
    if args.type not in TYPES:
        print(
            f"error: invalid --type {args.type!r}; must be one of {', '.join(TYPES)}",
            file=sys.stderr,
        )
        return 2
    if args.type in WHY_REQUIRED and not args.why:
        print(
            f"error: --why required for --type={args.type}",
            file=sys.stderr,
        )
        return 2
    item: dict = {
        "task": args.task,
        "type": args.type,
        "content": args.content,
        "created_at": now_iso(),
    }
    if args.why:
        item["why"] = args.why
    if args.scope:
        item["scope"] = args.scope
    with global_lock():
        item = {"id": next_id(), **item}
        append_task(args.task, item)
    print(f"added #{item['id']} {item['type']} task={item['task']}")
    return 0


def filter_items(items: list[dict], args: argparse.Namespace) -> list[dict]:
    out = items
    if getattr(args, "type", None):
        out = [it for it in out if it.get("type") == args.type]
    if getattr(args, "scope", None):
        out = [it for it in out if args.scope in (it.get("scope") or "")]
    return out


def _truncate(s: str, n: int) -> str:
    s = (s or "").replace("\n", " ").replace("\r", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def cmd_list(args: argparse.Namespace) -> int:
    items = load_all(args.task)
    items = filter_items(items, args)
    items.sort(
        key=lambda it: (it.get("created_at", ""), int(it.get("id", 0))), reverse=True
    )
    if args.limit and args.limit > 0:
        items = items[: args.limit]
    if args.json:
        for it in items:
            print(json.dumps(it, ensure_ascii=False))
        return 0
    if not items:
        print("(no entries)")
        return 0
    rows = []
    for it in items:
        rows.append(
            (
                str(it.get("id", "")),
                it.get("type", ""),
                _truncate(it.get("task", ""), 18),
                _truncate(it.get("scope", "") or "-", 22),
                _truncate(it.get("content", ""), 58),
            )
        )
    header = ("ID", "TYPE", "TASK", "SCOPE", "CONTENT")
    widths = [max(len(r[i]) for r in rows + [header]) for i in range(5)]
    fmt = "  ".join("{:<" + str(w) + "}" for w in widths)
    print(fmt.format(*header))
    print("-" * (sum(widths) + 2 * (len(widths) - 1)))
    for r in rows:
        print(fmt.format(*r))
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    hit = find_entry_file(args.id)
    if not hit:
        print(f"error: no entry with id={args.id}", file=sys.stderr)
        return 1
    _, items, idx = hit
    print(json.dumps(items[idx], ensure_ascii=False, indent=2))
    return 0


def cmd_resolve(args: argparse.Namespace) -> int:
    with global_lock():
        hit = find_entry_file(args.id)
        if not hit:
            print(f"error: no entry with id={args.id}", file=sys.stderr)
            return 1
        _, items, idx = hit
        items[idx]["resolved_to"] = args.to
        items[idx]["resolved_at"] = now_iso()
        if args.note:
            items[idx]["resolved_note"] = args.note
        task = items[idx].get("task")
        if not task:
            print(f"error: entry #{args.id} has no task field; cannot locate file", file=sys.stderr)
            return 1
        write_task(task, items)
    print(f"resolved #{args.id} → {args.to}")
    return 0


CONSOLIDATE_SUGGEST = {
    "finding": "agpod-memo (if reusable) or docs/<module>.md",
    "decision": "agpod-memo (write_decision with rejected_alternatives)",
    "constraint": "discard (if task-bound) or agpod-memo (if long-term preference)",
    "outcome_summary": "docs/<module>.md (success deliverable) or agpod-memo as finding (failure warning) or discard",
    "process": "docs/agents-md/<name>.md (generic) or docs/runbooks/<name>.md (project-specific)",
    "question": "convert to finding/decision (if answered) or file issue/handoff",
}


def cmd_consolidate(args: argparse.Namespace) -> int:
    items = load_all(args.task)
    items = [it for it in items if "resolved_to" not in it]
    if not items:
        print("(nothing to consolidate)")
        return 0
    items.sort(key=lambda it: (it.get("task", ""), it.get("type", ""), it.get("id", 0)))
    print(f"# Consolidation plan ({len(items)} unresolved)")
    if args.task:
        print(f"# task: {args.task}")
    print()
    current_task = None
    for it in items:
        t = it.get("task", "")
        if t != current_task:
            print(f"## task: {t}")
            print()
            current_task = t
        suggest = CONSOLIDATE_SUGGEST.get(it.get("type", ""), "review manually")
        print(f"- #{it['id']} [{it['type']}] {_truncate(it.get('content', ''), 80)}")
        if it.get("scope"):
            print(f"    scope: {it['scope']}")
        if it.get("why"):
            print(f"    why:   {_truncate(it['why'], 100)}")
        print(f"    → suggest: {suggest}")
        print(
            f"    resolve: notes resolve {it['id']} --to=<memo:<id>|docs/<path>|issue:<url>|expired|discarded>"
        )
        print()
    print("# Next: agent reports each entry to user, takes action per confirmation,")
    print("#       then calls `notes resolve` to record the outcome.")
    return 0


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>task-notes  —  {title}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         max-width: 1100px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }}
  h1 {{ margin-bottom: 0; }}
  .meta {{ color: #777; font-size: 0.9rem; margin-bottom: 1.5rem; }}
  .stats {{ display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }}
  .stat {{ padding: 0.4rem 0.8rem; background: rgba(127,127,127,0.12);
          border-radius: 6px; font-size: 0.9rem; }}
  details {{ margin: 0.5rem 0; }}
  summary {{ cursor: pointer; padding: 0.4rem 0; font-weight: 600; }}
  .entry {{ border-left: 3px solid #888; padding: 0.6rem 0.9rem; margin: 0.6rem 0;
           background: rgba(127,127,127,0.06); border-radius: 0 6px 6px 0; }}
  .entry.resolved {{ opacity: 0.55; border-left-color: #4a4; }}
  .entry-head {{ display: flex; gap: 0.6rem; align-items: baseline;
                font-size: 0.85rem; color: #777; margin-bottom: 0.3rem; }}
  .entry-id {{ font-weight: 700; color: #555; }}
  .entry-type {{ padding: 0.05rem 0.5rem; border-radius: 3px; background: rgba(80,140,255,0.2);
                color: #2563eb; font-weight: 600; }}
  .type-decision  {{ background: rgba(80,140,255,0.2); color: #2563eb; }}
  .type-finding   {{ background: rgba(80,200,140,0.2); color: #059669; }}
  .type-constraint{{ background: rgba(255,180,80,0.2); color: #b45309; }}
  .type-outcome_summary {{ background: rgba(20,184,166,0.2); color: #0d9488; }}
  .type-process   {{ background: rgba(180,120,255,0.2); color: #7c3aed; }}
  .type-question  {{ background: rgba(150,150,150,0.2); color: #555; }}
  .entry-content {{ white-space: pre-wrap; word-break: break-word; }}
  .entry-meta {{ font-size: 0.85rem; color: #777; margin-top: 0.4rem; }}
  .entry-meta b {{ color: #555; }}
  .resolved-badge {{ color: #059669; font-weight: 600; }}
  hr {{ border: none; border-top: 1px solid rgba(127,127,127,0.3); margin: 2rem 0; }}
  @media (prefers-color-scheme: dark) {{
    body {{ background: #1a1a1a; color: #eee; }}
    .entry-id, .entry-meta b {{ color: #ccc; }}
    .meta, .entry-head, .entry-meta {{ color: #aaa; }}
  }}
</style>
</head>
<body>
<h1>task-notes</h1>
<div class="meta">{title} · generated {generated_at} · {total} entries</div>
<div class="stats">{stats_html}</div>
{body_html}
</body>
</html>
"""


def _entry_html(it: dict) -> str:
    klass = "entry resolved" if "resolved_to" in it else "entry"
    type_klass = f"entry-type type-{escape(it.get('type', ''))}"
    parts = [f'<div class="{klass}">']
    parts.append('<div class="entry-head">')
    parts.append(f'<span class="entry-id">#{it.get("id", "?")}</span>')
    parts.append(f'<span class="{type_klass}">{escape(it.get("type", ""))}</span>')
    parts.append(f'<span>task: <b>{escape(it.get("task", ""))}</b></span>')
    parts.append(f'<span>{escape(it.get("created_at", ""))}</span>')
    parts.append("</div>")
    parts.append(f'<div class="entry-content">{escape(it.get("content", ""))}</div>')
    meta_bits = []
    if it.get("scope"):
        meta_bits.append(f'<b>scope</b>: {escape(it["scope"])}')
    if it.get("why"):
        meta_bits.append(f'<b>why</b>: {escape(it["why"])}')
    if it.get("resolved_to"):
        rt = escape(it["resolved_to"])
        meta_bits.append(f'<span class="resolved-badge">resolved → {rt}</span>')
        if it.get("resolved_note"):
            meta_bits.append(f'<b>note</b>: {escape(it["resolved_note"])}')
    if meta_bits:
        parts.append('<div class="entry-meta">' + " · ".join(meta_bits) + "</div>")
    parts.append("</div>")
    return "".join(parts)


def cmd_export_html(args: argparse.Namespace) -> int:
    items = load_all(args.task)
    if not items:
        print("(nothing to export)")
        return 0
    items.sort(
        key=lambda it: (it.get("task", ""), it.get("type", ""), -int(it.get("id", 0)))
    )
    by_task: dict[str, list[dict]] = {}
    for it in items:
        by_task.setdefault(it.get("task", "(no task)"), []).append(it)
    body_parts = []
    for task, ts in by_task.items():
        body_parts.append(f"<hr><h2>task: {escape(task)}</h2>")
        by_type: dict[str, list[dict]] = {}
        for it in ts:
            by_type.setdefault(it.get("type", ""), []).append(it)
        for t in TYPES:
            if t not in by_type:
                continue
            entries = by_type[t]
            body_parts.append(
                f"<details open><summary>{escape(t)} ({len(entries)})</summary>"
            )
            for it in entries:
                body_parts.append(_entry_html(it))
            body_parts.append("</details>")
    counts: dict[str, int] = {}
    for it in items:
        counts[it.get("type", "?")] = counts.get(it.get("type", "?"), 0) + 1
    resolved_count = sum(1 for it in items if "resolved_to" in it)
    stats_html = "".join(
        [f'<span class="stat">{escape(t)}: {n}</span>' for t, n in sorted(counts.items())]
        + [f'<span class="stat">resolved: {resolved_count}</span>']
    )
    html = HTML_TEMPLATE.format(
        title=escape(args.task or "all tasks"),
        generated_at=escape(now_iso()),
        total=len(items),
        stats_html=stats_html,
        body_html="".join(body_parts),
    )
    if args.out:
        out_path = Path(args.out).expanduser()
    else:
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        slug = args.task or "all"
        out_path = notes_dir() / "exports" / f"{slug}-{ts}.html"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    print(str(out_path))
    if args.open:
        try:
            subprocess.run(["open", str(out_path)], check=False)
        except FileNotFoundError:
            pass
    return 0


def cmd_path(args: argparse.Namespace) -> int:
    if args.task:
        print(str(task_file(args.task)))
        return 0
    if args.all:
        files = all_task_files()
        if not files:
            return 0
        for p in files:
            print(str(p))
        return 0
    print(str(notes_dir()))
    return 0


def cmd_tasks(args: argparse.Namespace) -> int:
    files = all_task_files()
    if not files:
        print("(no tasks)")
        return 0
    rows = []
    for p in files:
        rows.append((p.stem, len(_load_file(p))))
    rows.sort()
    name_w = max(len(r[0]) for r in rows + [("TASK", 0)])
    fmt = f"{{:<{name_w}}}  {{:>7}}"
    print(fmt.format("TASK", "TOTAL"))
    print("-" * (name_w + 2 + 7))
    for name, total in rows:
        print(fmt.format(name, total))
    return 0


def _group_by_type(items: list[dict]) -> dict[str, list[dict]]:
    by_type: dict[str, list[dict]] = {}
    for it in items:
        by_type.setdefault(it.get("type", ""), []).append(it)
    for t in by_type:
        by_type[t].sort(
            key=lambda it: (it.get("created_at", ""), int(it.get("id", 0))),
            reverse=True,
        )
    return by_type


def _print_task_status(task: str, items: list[dict], top: int) -> None:
    by_type = _group_by_type(items)
    print(f"TASK: {task}  ({len(items)} entries)")
    rows = []
    for t in TYPES:
        entries = by_type.get(t, [])
        if not entries:
            continue
        rows.append((t, len(entries), entries[0].get("created_at", "")))
    if rows:
        name_w = max(len(r[0]) for r in rows + [("TYPE", 0, "")])
        fmt = f"  {{:<{name_w}}}  {{:>5}}  {{}}"
        print(fmt.format("TYPE", "COUNT", "LATEST"))
        for t, n, latest in rows:
            print(fmt.format(t, n, latest))
    # Headline the latest outcome_summary so a reconnecting agent sees "what
    # was last done" without expanding every type via --top.
    latest_outcomes = by_type.get("outcome_summary", [])
    if latest_outcomes:
        o = latest_outcomes[0]
        line = f"  Latest outcome #{o.get('id', '?')}: {_truncate(o.get('content', ''), 64)}"
        if o.get("why"):
            line += f"   —  {_truncate(o['why'], 40)}"
        print(line)
    if top > 0:
        for t in TYPES:
            entries = by_type.get(t, [])
            if not entries:
                continue
            n = min(top, len(entries))
            print()
            print(f"== {t} (latest {n} of {len(entries)}) ==")
            for it in entries[:n]:
                print(f"  #{it['id']}  {it.get('created_at', '')}")
                if it.get("scope"):
                    print(f"      scope:   {it['scope']}")
                print(f"      content: {it.get('content', '')}")
                if it.get("why"):
                    print(f"      why:     {it['why']}")


def cmd_status(args: argparse.Namespace) -> int:
    if args.task:
        items = load_task(args.task)
        if not items:
            print(f"(no entries for task={args.task})")
            return 0
        _print_task_status(args.task, items, top=args.top)
        return 0
    files = all_task_files()
    if not files:
        print("(no tasks)")
        return 0
    for i, p in enumerate(files):
        items = _load_file(p)
        if not items:
            continue
        if i > 0:
            print()
        _print_task_status(p.stem, items, top=args.top)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="notes", description="task-notes JSONL scratchpad")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("add", help="append a note")
    sp.add_argument("--type", required=True, choices=TYPES)
    sp.add_argument("--task", required=True, help="task slug ([A-Za-z0-9._-])")
    sp.add_argument("--content", required=True)
    sp.add_argument("--why", default=None)
    sp.add_argument("--scope", default=None)
    sp.set_defaults(func=cmd_add)

    sp = sub.add_parser("list", help="list notes (omit --task to scan all tasks)")
    sp.add_argument("--task", default=None)
    sp.add_argument("--type", default=None, choices=TYPES)
    sp.add_argument("--scope", default=None, help="substring match on scope")
    sp.add_argument("--limit", type=int, default=0, help="0 = no limit")
    sp.add_argument("--json", action="store_true", help="emit raw jsonl")
    sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("show", help="show full record by id (searches all task files)")
    sp.add_argument("id", type=int)
    sp.set_defaults(func=cmd_show)

    sp = sub.add_parser("resolve", help="mark entry resolved")
    sp.add_argument("id", type=int)
    sp.add_argument(
        "--to",
        required=True,
        help="memo:<id> | docs/<path> | issue:<url> | expired | discarded",
    )
    sp.add_argument("--note", default=None)
    sp.set_defaults(func=cmd_resolve)

    sp = sub.add_parser(
        "consolidate", help="print suggested promotion plan (omit --task for all)"
    )
    sp.add_argument("--task", default=None)
    sp.set_defaults(func=cmd_consolidate)

    sp = sub.add_parser(
        "export-html", help="export to self-contained html (omit --task for all)"
    )
    sp.add_argument("--task", default=None)
    sp.add_argument("--out", default=None)
    sp.add_argument("--open", action="store_true")
    sp.set_defaults(func=cmd_export_html)

    sp = sub.add_parser("tasks", help="list known tasks with counts")
    sp.set_defaults(func=cmd_tasks)

    sp = sub.add_parser(
        "path",
        help="print notes dir (default), --task=<slug> for one file, --all for every jsonl (for rg/grep)",
    )
    sp.add_argument("--task", default=None)
    sp.add_argument("--all", action="store_true", help="print every task jsonl path")
    sp.set_defaults(func=cmd_path)

    sp = sub.add_parser(
        "status",
        help="task overview: per-type count + latest time + latest outcome_summary headline; --top=N expands content",
    )
    sp.add_argument("--task", default=None)
    sp.add_argument(
        "--top", type=int, default=0, help="expand top-N latest per type (default 0)"
    )
    sp.set_defaults(func=cmd_status)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
