---
name: simplify
description: Find low-info comments, one-off helpers, perf issues, low-signal logs/errors, and reuse opportunities when the user explicitly asks for it.
---

# Instruction

Review the scoped code with parallel read-only review agents, then present concise cleanup findings. Do not edit files unless the user explicitly asks you to fix something after reviewing them.

## Scope Selection

Use the first that exists:

1. The explicit scope the user gave after /simplify (paths, symbols, a diff, or a natural-language area).
2. All pending local changes — staged, unstaged, and untracked files alike; none silently missed.
3. Concrete files, symbols, or changes mentioned in the conversation.
4. The HEAD commit.

Do not broaden beyond the selected scope except to understand existing patterns.

## Subagents

Launch the following four reviewers in parallel, read-only, on the same model as the parent. Pass scope handles such as paths, symbols, or commit SHAs, plus only context they cannot cheaply derive themselves. Reviewers gather their own diffs and evidence; pass content only when they cannot access it, such as a user-pasted diff.

Code quality reviewer: look for simplification opportunities, including but not limited to:
low-information comments: comments that restate the code instead of explaining intent, edge cases, or invariants.
one-off helpers: small helpers that are only used once and can be inlined to make the flow clearer.
nullable value proliferation: unnecessary null or undefined states that force defensive checks and make invariants unclear.
catch-all try/catch blocks: broad error handling that swallows errors without explaining which exceptions are expected.
unnecessary abstraction: generic wrappers, config objects, or interfaces introduced before there is real reuse.
weak type escape hatches: avoidable any, casts, non-null assertions, or overly broad types that hide real invariants.
duplicated state or derived state: storing values that can be computed from source state, creating stale-state risk.
dead or compatibility code: unused branches, parameters, fallback paths, or old behavior preserved without evidence.

Performance reviewer: look for performance issues, including but not limited to:
Only flag performance issues that are plausible in real usage; avoid cosmetic micro-optimizations.
blocking operations in hot paths: sync Node.js functions or other blocking work that can stall the event loop.
uncached expensive operations: repeated computation, parsing, or lookups whose results could be reused safely.
busy waits: polling or loops that consume CPU while waiting instead of using events, timers, or backoff.
string concatenation in loops: repeated immutable string allocation that can become quadratic or allocation-heavy.
N+1 I/O: per-item database, filesystem, network, or RPC calls where batching would reduce latency or load.
chatty logging/telemetry: high-volume logs or metrics emitted inside tight loops or hot paths.

Logging and error reviewer: look for cleanup-focused low-signal logs and unclear errors. Use the codebase's existing conventions as context, but flag patterns that make logs or errors noisy, vague, unsafe, or hard to trace.
logging taste: logs should help reconstruct what happened at the right boundary for this codebase. Prefer useful context, correlation details, consistent levels/schema, and actionable failure details; avoid noisy lifecycle chatter, duplicate logs, missing correlation, vague messages.
error quality: internal errors should keep enough context and cause information to diagnose failures without swallowing useful details. User-facing errors and bad states should be unambiguous, not leave users stuck or guessing, explain what happened or what the user can do next when possible, and include support-ready details such as request, trace, or run IDs, plus retry/support guidance when useful.

Reuse reviewer: look for existing patterns or helpers in the scoped code and its surrounding context that allow less and simpler code. Do not introduce abstractions unless they clearly reduce complexity now.

Reporting
Aggregate all findings into one concise, categorized, numbered list: duplicates grouped, plain-language titles, the practical impact, and the cleanup direction. Line-level detail only where it disambiguates a finding. Keep concrete, in-scope findings in the main list; park broader issues in a separate "Needs decision / out of scope" section so they are clearly not part of the findings.
