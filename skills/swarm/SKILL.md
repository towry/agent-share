---
name: swarm
description: "Use to fan out N parallel workers, collect all results, and deliver one report. Triggers on: swarm, parallel coverage, race, gauntlet, exploration."
---

# Swarm

Fan out N parallel workers. They may cover separate slices, race the same brief, or mix both. Prefer isolated/remote workers when the harness has them; otherwise use local workers. The parent waits, aggregates, and returns one report.

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not the cloud concurrency limit.
4. Pick the worker model from the `swarm-workers` role in setup-pstack `references/model-roles.md`. Fallback: `fast-code`. For a model race, name each arm's model up front.
5. Give each worker its own writable output when it writes. Use a worktree, branch, or `/tmp/swarm-<slug>/worker-<n>/`.

## Phase B: Fan out

Spawn all N workers in one message. Each is a general-purpose subagent on the configured model. Use an isolated/remote worker if the harness has one; otherwise a local worker. Spawn them asynchronously so the parent is not blocked. Use a local worker only when it needs access to something on the user's computer.

When a worker must start from a non-default pushed branch, pass the worker's starting branch.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.
